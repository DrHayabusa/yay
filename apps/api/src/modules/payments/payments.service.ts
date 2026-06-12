import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PaymentKind, PaymentStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PaymentProvider, WebhookEvent } from '../../infra/providers/payment.provider';
import { AuditService } from '../audit/audit.service';
import { ServiceRequestsService } from '../service-requests/service-requests.service';
import { PartsService } from '../parts/parts.service';

const VAT_RATE = new Prisma.Decimal('0.05');

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('Payments');

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: PaymentProvider,
    private readonly audit: AuditService,
    private readonly cases: ServiceRequestsService,
    private readonly parts: PartsService,
  ) {}

  /**
   * Creates a payment intent. The amount is ALWAYS computed server-side from
   * the case/quotation — never accepted from the client. Idempotent per
   * (key, user, endpoint): replays return the original response.
   */
  async createIntent(userId: string, serviceRequestId: string, kind: PaymentKind, idempotencyKey: string) {
    if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 100) {
      throw new BadRequestException({
        error: 'VALIDATION_FAILED',
        message: 'A valid Idempotency-Key header is required',
      });
    }

    const endpoint = 'POST /payments/intents';
    const requestHash = `${serviceRequestId}:${kind}`;
    const existing = await this.prisma.idempotencyRecord.findUnique({
      where: { key_userId_endpoint: { key: idempotencyKey, userId, endpoint } },
    });
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new ConflictException({
          error: 'IDEMPOTENCY_CONFLICT',
          message: 'This Idempotency-Key was already used with a different request',
        });
      }
      return existing.responseBody;
    }

    // Ownership scope: only the case's customer can pay.
    const sr = await this.prisma.serviceRequest.findFirst({
      where: { id: serviceRequestId, vehicle: { owner: { userId } } },
      include: {
        quotations: { where: { status: 'APPROVED' }, orderBy: { version: 'desc' }, take: 1 },
      },
    });
    if (!sr) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Service request not found' });

    const amounts = await this.computeAmounts(sr, kind);

    const intent = await this.provider.createIntent({
      amountFils: amounts.total.mul(100).toNumber(),
      currency: sr.currency,
      idempotencyKey,
      metadata: { serviceRequestId, kind },
    });

    const payment = await this.prisma.payment.create({
      data: {
        serviceRequestId,
        payerUserId: userId,
        kind,
        status: PaymentStatus.PENDING,
        provider: 'mock',
        providerIntentId: intent.providerIntentId,
        idempotencyKey,
        subtotal: amounts.subtotal,
        vatAmount: amounts.vat,
        platformFee: amounts.platformFee,
        total: amounts.total,
      },
    });

    const response = {
      paymentId: payment.id,
      providerIntentId: intent.providerIntentId,
      clientSecret: intent.clientSecret,
      amount: { amount: amounts.total.toFixed(2), currency: sr.currency },
    };

    await this.prisma.idempotencyRecord.create({
      data: {
        key: idempotencyKey,
        userId,
        endpoint,
        requestHash,
        responseCode: 201,
        responseBody: response as unknown as Prisma.InputJsonValue,
      },
    });

    return response;
  }

  private async computeAmounts(
    sr: {
      id: string;
      status: string;
      estimatedRecoveryFee: Prisma.Decimal | null;
      diagnosticFee: Prisma.Decimal | null;
      quotations: { subtotal: Prisma.Decimal; vatAmount: Prisma.Decimal; platformFee: Prisma.Decimal; total: Prisma.Decimal }[];
    },
    kind: PaymentKind,
  ): Promise<{ subtotal: Prisma.Decimal; vat: Prisma.Decimal; platformFee: Prisma.Decimal; total: Prisma.Decimal }> {
    if (kind === PaymentKind.RECOVERY) {
      if (!sr.estimatedRecoveryFee || !sr.diagnosticFee) {
        throw new ConflictException({ error: 'CONFLICT', message: 'No recovery estimate on this case' });
      }
      const subtotal = sr.estimatedRecoveryFee.add(sr.diagnosticFee);
      const vat = subtotal.mul(VAT_RATE).toDecimalPlaces(2);
      return { subtotal, vat, platformFee: new Prisma.Decimal(0), total: subtotal.add(vat) };
    }

    if (kind === PaymentKind.REPAIR) {
      const quotation = sr.quotations[0];
      if (!quotation) {
        throw new ConflictException({
          error: 'APPROVAL_REQUIRED',
          message: 'An approved quotation is required before paying for the repair',
        });
      }
      // No spare-part purchase before compatibility confirmation: a repair
      // payment that funds part orders requires every order to be CONFIRMED.
      const pendingOrders = await this.prisma.partOrder.count({
        where: { serviceRequestId: sr.id, status: 'PENDING_COMPATIBILITY' },
      });
      if (pendingOrders > 0) {
        throw new ConflictException({
          error: 'COMPATIBILITY_NOT_CONFIRMED',
          message: 'All part orders must be compatibility-confirmed before payment',
        });
      }
      return {
        subtotal: quotation.subtotal,
        vat: quotation.vatAmount,
        platformFee: quotation.platformFee,
        total: quotation.total,
      };
    }

    throw new BadRequestException({
      error: 'VALIDATION_FAILED',
      message: `Payment kind ${kind} is not directly payable in the MVP`,
    });
  }

  async getOwn(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, payerUserId: userId },
    });
    if (!payment) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Payment not found' });
    return payment;
  }

  // ---------- webhook ----------

  /**
   * Gateway webhook. Signature is verified against the raw body before
   * parsing; processing is idempotent (re-delivered events are no-ops).
   * Captures drive the state machine forward.
   */
  async handleWebhook(rawBody: Buffer, signature: string | undefined) {
    let event: WebhookEvent;
    try {
      event = this.provider.verifyWebhook(rawBody, signature);
    } catch {
      // 401 — do not reveal why verification failed.
      throw new BadRequestException({ error: 'UNAUTHENTICATED', message: 'Webhook verification failed' });
    }

    const payment = await this.prisma.payment.findUnique({
      where: { providerIntentId: event.providerIntentId },
    });
    if (!payment) {
      this.logger.warn(`Webhook for unknown intent ${event.providerIntentId}`);
      return { ok: true }; // ack to stop retries; alert raised via logs
    }

    if (event.type === 'payment.captured') {
      if (payment.status === PaymentStatus.CAPTURED) return { ok: true }; // idempotent replay

      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.CAPTURED, capturedAt: new Date() },
        });
        await this.applyCaptureSideEffects(tx, payment.serviceRequestId, payment.kind);
        await this.audit.record(
          {
            action: 'PAYMENT_CAPTURED',
            entityType: 'Payment',
            entityId: payment.id,
            after: { kind: payment.kind, total: payment.total.toFixed(2) },
          },
          tx,
        );
      });
    } else if (event.type === 'payment.failed') {
      if (payment.status === PaymentStatus.PENDING) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED, failureCode: event.failureCode ?? 'unknown' },
        });
      }
    } else if (event.type === 'refund.processed') {
      await this.prisma.refund.updateMany({
        where: { paymentId: payment.id, status: 'APPROVED' },
        data: { status: 'PROCESSED', processedAt: new Date(), providerRefundId: event.providerRefundId },
      });
    }

    return { ok: true };
  }

  private async applyCaptureSideEffects(
    tx: Prisma.TransactionClient,
    serviceRequestId: string,
    kind: PaymentKind,
  ): Promise<void> {
    const sr = await tx.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      select: { status: true },
    });
    if (!sr) return;

    if (kind === PaymentKind.REPAIR) {
      if (sr.status === 'PARTS_SELECTION_REQUIRED') {
        // Guard: every order compatibility-confirmed.
        const allConfirmed = await this.parts.allOrdersConfirmed(tx, serviceRequestId);
        if (!allConfirmed) {
          this.logger.error(`Capture for ${serviceRequestId} but orders not all confirmed — manual review`);
          return;
        }
        await this.cases.systemTransition(tx, serviceRequestId, 'PARTS_ORDERED', 'Repair payment captured');
      } else if (sr.status === 'AWAITING_CUSTOMER_APPROVAL') {
        // Labour-only repair starts immediately after payment.
        await this.cases.systemTransition(tx, serviceRequestId, 'REPAIR_IN_PROGRESS', 'Labour-only payment captured');
      }
    }
    // RECOVERY captures don't change status: assignment is the admin's move.
  }

  // ---------- refunds ----------

  async requestRefund(userId: string, paymentId: string, amount: string, reason: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, payerUserId: userId, status: PaymentStatus.CAPTURED },
    });
    if (!payment) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Captured payment not found' });
    }
    const amt = new Prisma.Decimal(amount);
    if (amt.lte(0) || amt.gt(payment.total)) {
      throw new BadRequestException({
        error: 'VALIDATION_FAILED',
        message: 'Refund amount must be positive and not exceed the payment total',
      });
    }
    return this.prisma.refund.create({
      data: { paymentId, amount: amt, reason, requestedByUserId: userId },
    });
  }

  /** Admin approval triggers the provider refund; the webhook marks it processed. */
  async approveRefund(adminUserId: string, refundId: string) {
    const refund = await this.prisma.refund.findFirst({
      where: { id: refundId, status: 'REQUESTED' },
      include: { payment: true },
    });
    if (!refund) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Pending refund not found' });

    await this.provider.createRefund(
      refund.payment.providerIntentId ?? '',
      refund.amount.mul(100).toNumber(),
    );
    const updated = await this.prisma.refund.update({
      where: { id: refundId },
      data: { status: 'APPROVED', approvedByUserId: adminUserId },
    });
    await this.audit.record({
      actorUserId: adminUserId,
      actorRole: Role.ADMIN,
      action: 'REFUND_APPROVED',
      entityType: 'Refund',
      entityId: refundId,
      after: { amount: refund.amount.toFixed(2) },
    });
    return updated;
  }
}
