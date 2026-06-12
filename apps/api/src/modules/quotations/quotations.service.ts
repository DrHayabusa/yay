import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalDecision, Prisma, QuotationItemType, Role } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ServiceRequestsService } from '../service-requests/service-requests.service';

const VAT_RATE = new Prisma.Decimal('0.05');
const PLATFORM_FEE_RATE = new Prisma.Decimal('0.05');

export interface QuotationItemInput {
  type: QuotationItemType;
  title: string;
  plainLanguageSummary?: string;
  repairItemId?: string;
  requiresPart?: boolean;
  quantity: number;
  unitPrice: string; // decimal string
}

@Injectable()
export class QuotationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cases: ServiceRequestsService,
    private readonly audit: AuditService,
  ) {}

  private async garageManagerCase(userId: string, serviceRequestId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null, roles: { some: { role: Role.GARAGE_MANAGER } } },
      select: { garageId: true },
    });
    if (!user?.garageId) {
      throw new ForbiddenException({ error: 'FORBIDDEN', message: 'Garage manager role required' });
    }
    const sr = await this.prisma.serviceRequest.findFirst({
      where: { id: serviceRequestId, garageId: user.garageId },
    });
    if (!sr) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Service request not found' });
    return sr;
  }

  /** Garage manager drafts (or re-drafts) the itemised quotation. */
  async createDraft(
    userId: string,
    serviceRequestId: string,
    items: QuotationItemInput[],
    estimatedCompletionHours?: number,
  ) {
    const sr = await this.garageManagerCase(userId, serviceRequestId);
    if (!['INSPECTION_IN_PROGRESS', 'DIAGNOSIS_SUBMITTED'].includes(sr.status)) {
      throw new ConflictException({
        error: 'CONFLICT',
        message: 'A quotation can only be drafted during or after inspection',
      });
    }
    if (items.length === 0) {
      throw new BadRequestException({ error: 'VALIDATION_FAILED', message: 'Quotation needs at least one item' });
    }

    // Repair items referenced must belong to this case.
    const repairIds = items.map((i) => i.repairItemId).filter((x): x is string => !!x);
    if (repairIds.length > 0) {
      const count = await this.prisma.repairItem.count({
        where: { id: { in: repairIds }, finding: { inspection: { serviceRequestId } } },
      });
      if (count !== repairIds.length) {
        throw new BadRequestException({
          error: 'VALIDATION_FAILED',
          message: 'All repair items must belong to this case',
        });
      }
    }

    let subtotal = new Prisma.Decimal(0);
    const itemRows = items.map((i) => {
      const unit = new Prisma.Decimal(i.unitPrice);
      if (unit.isNegative()) {
        throw new BadRequestException({ error: 'VALIDATION_FAILED', message: 'Prices cannot be negative' });
      }
      const line = unit.mul(i.quantity).toDecimalPlaces(2);
      subtotal = subtotal.add(line);
      return {
        type: i.type,
        title: i.title,
        plainLanguageSummary: i.plainLanguageSummary,
        repairItemId: i.repairItemId,
        requiresPart: i.requiresPart ?? false,
        quantity: i.quantity,
        unitPrice: unit,
        lineTotal: line,
      };
    });

    const platformFee = subtotal.mul(PLATFORM_FEE_RATE).toDecimalPlaces(2);
    const vatAmount = subtotal.add(platformFee).mul(VAT_RATE).toDecimalPlaces(2);
    const total = subtotal.add(platformFee).add(vatAmount);

    return this.prisma.$transaction(async (tx) => {
      // Supersede any previous unapproved version.
      const previous = await tx.quotation.findFirst({
        where: { serviceRequestId, status: { in: ['DRAFT', 'PUBLISHED'] } },
        orderBy: { version: 'desc' },
      });
      if (previous) {
        await tx.quotation.update({ where: { id: previous.id }, data: { status: 'SUPERSEDED' } });
      }
      const latest = await tx.quotation.findFirst({
        where: { serviceRequestId },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      return tx.quotation.create({
        data: {
          serviceRequestId,
          version: (latest?.version ?? 0) + 1,
          status: 'DRAFT',
          subtotal,
          vatAmount,
          platformFee,
          total,
          estimatedCompletionHours,
          items: { create: itemRows },
        },
        include: { items: true },
      });
    });
  }

  /** Publishing shows the quote to the customer and freezes the prices. */
  async publish(userId: string, quotationId: string) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { serviceRequest: { select: { id: true, status: true } } },
    });
    if (!quotation) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Quotation not found' });
    await this.garageManagerCase(userId, quotation.serviceRequestId); // scope check
    if (quotation.status !== 'DRAFT') {
      throw new ConflictException({ error: 'CONFLICT', message: 'Only a draft quotation can be published' });
    }
    if (quotation.serviceRequest.status !== 'DIAGNOSIS_SUBMITTED') {
      throw new ConflictException({
        error: 'CONFLICT',
        message: 'The diagnosis must be submitted before publishing the quotation',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.quotation.update({
        where: { id: quotationId },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      });
      await this.cases.systemTransition(tx, quotation.serviceRequestId, 'AWAITING_CUSTOMER_APPROVAL');
    });
    await this.audit.record({
      actorUserId: userId,
      actorRole: Role.GARAGE_MANAGER,
      action: 'QUOTATION_PUBLISHED',
      entityType: 'Quotation',
      entityId: quotationId,
    });
    return { ok: true };
  }

  /** Customer-facing view, scoped to ownership. */
  async getForCustomer(userId: string, serviceRequestId: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: {
        serviceRequestId,
        status: { in: ['PUBLISHED', 'PARTIALLY_APPROVED', 'APPROVED'] },
        serviceRequest: { vehicle: { owner: { userId } } },
      },
      orderBy: { version: 'desc' },
      include: { items: { include: { approval: true } } },
    });
    if (!quotation) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Quotation not found' });
    return quotation;
  }

  /**
   * Per-item approval — the heart of "no repair work before customer
   * approval". Approvals are immutable once recorded.
   */
  async decideItem(
    userId: string,
    quotationItemId: string,
    decision: ApprovalDecision,
    meta: { ip?: string; device?: string },
  ) {
    const item = await this.prisma.quotationItem.findFirst({
      where: {
        id: quotationItemId,
        quotation: {
          status: { in: ['PUBLISHED', 'PARTIALLY_APPROVED'] },
          serviceRequest: { vehicle: { owner: { userId } } }, // ownership scope
        },
      },
      include: { approval: true, quotation: { select: { serviceRequestId: true } } },
    });
    if (!item) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Quotation item not found' });
    if (item.approval) {
      throw new ConflictException({ error: 'CONFLICT', message: 'This item has already been decided' });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.customerApproval.create({
        data: {
          quotationItemId,
          customerUserId: userId,
          decision,
          ipAddress: meta.ip,
          deviceInfo: meta.device,
        },
      });
      if (item.repairItemId) {
        await tx.repairItem.update({
          where: { id: item.repairItemId },
          data: { status: decision === 'APPROVED' ? 'APPROVED' : 'REJECTED' },
        });
      }
      await tx.quotation.update({
        where: { id: item.quotationId },
        data: { status: 'PARTIALLY_APPROVED' },
      });
    });
    return { ok: true, decision };
  }

  /**
   * Customer finalizes once every item is decided:
   *  - any approved item needs a part  → PARTS_SELECTION_REQUIRED
   *  - approved labour-only           → quotation APPROVED, awaiting payment
   *    (payment capture triggers REPAIR_IN_PROGRESS via webhook)
   *  - everything rejected            → case CANCELLED
   */
  async finalize(userId: string, quotationId: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: {
        id: quotationId,
        serviceRequest: { vehicle: { owner: { userId } } },
        status: { in: ['PUBLISHED', 'PARTIALLY_APPROVED'] },
      },
      include: { items: { include: { approval: true } } },
    });
    if (!quotation) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Quotation not found' });

    const undecided = quotation.items.filter((i) => !i.approval);
    if (undecided.length > 0) {
      throw new ConflictException({
        error: 'APPROVAL_REQUIRED',
        message: `Please approve or reject all items first (${undecided.length} remaining)`,
      });
    }

    const approved = quotation.items.filter((i) => i.approval?.decision === 'APPROVED');
    const needsParts = approved.some((i) => i.requiresPart);

    return this.prisma.$transaction(async (tx) => {
      if (approved.length === 0) {
        await tx.quotation.update({ where: { id: quotationId }, data: { status: 'REJECTED', finalizedAt: new Date() } });
        await this.cases.systemTransitionAs(tx, quotation.serviceRequestId, 'CANCELLED', {
          actorUserId: userId,
          actorRole: Role.CUSTOMER,
        }, 'Customer rejected the full quotation');
        return { ok: true, outcome: 'CANCELLED' };
      }

      await tx.quotation.update({
        where: { id: quotationId },
        data: { status: 'APPROVED', finalizedAt: new Date() },
      });

      if (needsParts) {
        await this.cases.systemTransitionAs(tx, quotation.serviceRequestId, 'PARTS_SELECTION_REQUIRED', {
          actorUserId: userId,
          actorRole: Role.CUSTOMER,
        });
        return { ok: true, outcome: 'PARTS_SELECTION_REQUIRED' };
      }

      // Labour-only: stays in AWAITING_CUSTOMER_APPROVAL until the repair
      // payment is captured; the payment webhook performs the transition.
      return { ok: true, outcome: 'AWAITING_PAYMENT' };
    });
  }
}
