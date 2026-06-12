import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CaseStatus, HandoverType, MediaKind, Prisma, Role } from '@prisma/client';
import { randomInt } from 'crypto';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { SmsProvider } from '../../infra/providers/sms.provider';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { MediaService } from '../media/media.service';
import { NotificationsService } from '../notifications/notifications.service';
import { hashOtp } from '../auth/otp.service';
import { checkTransition, allowedTargetsFor, SYSTEM, Actor } from './state-machine';
import { PricingService } from './pricing.service';
import { CreateServiceRequestDto, TransitionDto } from './dto/service-request.dto';

/** Transitions that require a verified handover OTP. */
const OTP_GUARDED: Partial<Record<CaseStatus, HandoverType>> = {
  VEHICLE_COLLECTED: HandoverType.PICKUP,
  VEHICLE_DELIVERED: HandoverType.CUSTOMER_DELIVERY,
};

@Injectable()
export class ServiceRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly media: MediaService,
    private readonly notifications: NotificationsService,
    private readonly sms: SmsProvider,
  ) {}

  // ---------- creation ----------

  async create(user: AuthUser, dto: CreateServiceRequestDto) {
    const profile = await this.prisma.customerProfile.findUnique({ where: { userId: user.userId } });
    if (!profile) throw new ForbiddenException({ error: 'FORBIDDEN', message: 'No customer profile' });

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, ownerId: profile.id, deletedAt: null },
    });
    if (!vehicle) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Vehicle not found' });

    // A photo is documentation, not diagnosis — but plate + vehicle photos are mandatory
    // for verification before recovery is dispatched.
    const kinds = dto.media.map((m) => m.kind);
    if (!kinds.includes(MediaKind.PLATE_PHOTO)) {
      throw new BadRequestException({
        error: 'VALIDATION_FAILED',
        message: 'A number-plate photograph is required',
      });
    }
    if (!kinds.some((k) => k === MediaKind.VEHICLE_PHOTO || k === MediaKind.VEHICLE_VIDEO)) {
      throw new BadRequestException({
        error: 'VALIDATION_FAILED',
        message: 'At least one vehicle photograph or video is required',
      });
    }

    // Duplicate-request detection: one open case per vehicle.
    const open = await this.prisma.serviceRequest.count({
      where: { vehicleId: vehicle.id, status: { notIn: ['CASE_CLOSED', 'CANCELLED'] } },
    });
    if (open > 0) {
      throw new ConflictException({
        error: 'CONFLICT',
        message: 'This vehicle already has an active service request',
      });
    }

    // Verify each upload actually exists and respects limits before attaching.
    const verified = [] as { storageKey: string; kind: MediaKind; mimeType: string; sizeBytes: number }[];
    for (const m of dto.media) {
      const head = await this.media.verifyUploaded(m.storageKey);
      verified.push({ ...m, sizeBytes: head.sizeBytes });
    }

    const emirate = profile.defaultEmirate ?? 'Dubai';
    const estimate = await this.pricing.estimateRecovery(emirate, dto.location.lat, dto.location.lng);

    const created = await this.prisma.$transaction(async (tx) => {
      const sr = await tx.serviceRequest.create({
        data: {
          customerId: profile.id,
          vehicleId: vehicle.id,
          type: dto.type ?? 'BREAKDOWN',
          status: 'REQUEST_CREATED',
          description: dto.description,
          canMove: dto.canMove,
          isSafeLocation: dto.isSafeLocation,
          emergencyFlags: dto.emergencyFlags ?? [],
          pickupLat: new Prisma.Decimal(dto.location.lat.toFixed(6)),
          pickupLng: new Prisma.Decimal(dto.location.lng.toFixed(6)),
          pickupAddress: dto.location.address,
          estimatedRecoveryFee: estimate.recoveryFee,
          estimatedEtaMinutes: estimate.etaMinutes,
          diagnosticFee: estimate.diagnosticFee,
          media: {
            create: verified.map((m) => ({
              uploaderUserId: user.userId,
              kind: m.kind,
              storageKey: m.storageKey,
              mimeType: m.mimeType,
              sizeBytes: m.sizeBytes,
            })),
          },
          locations: {
            create: {
              lat: new Prisma.Decimal(dto.location.lat.toFixed(6)),
              lng: new Prisma.Decimal(dto.location.lng.toFixed(6)),
              source: 'CUSTOMER_APP',
              actorUserId: user.userId,
            },
          },
        },
      });

      await tx.statusHistory.create({
        data: {
          serviceRequestId: sr.id,
          fromStatus: null,
          toStatus: 'REQUEST_CREATED',
          actorUserId: user.userId,
          actorRole: Role.CUSTOMER,
          lat: new Prisma.Decimal(dto.location.lat.toFixed(6)),
          lng: new Prisma.Decimal(dto.location.lng.toFixed(6)),
        },
      });

      // System transition: estimate generated → queue for assignment.
      await this.applyTransitionTx(tx, sr.id, 'REQUEST_CREATED', 'AWAITING_RECOVERY_ASSIGNMENT', {
        system: true,
      });

      return sr;
    });

    await this.notifications.notify(user.userId, 'CASE_STATUS:AWAITING_RECOVERY_ASSIGNMENT', {
      caseId: created.id,
    });

    return {
      id: created.id,
      status: 'AWAITING_RECOVERY_ASSIGNMENT',
      estimate: {
        recoveryFee: { amount: estimate.recoveryFee.toFixed(2), currency: estimate.currency },
        diagnosticFee: { amount: estimate.diagnosticFee.toFixed(2), currency: estimate.currency },
        vatAmount: { amount: estimate.vatAmount.toFixed(2), currency: estimate.currency },
        total: { amount: estimate.total.toFixed(2), currency: estimate.currency },
        vatRate: estimate.vatRate.toString(),
        etaMinutes: estimate.etaMinutes,
        distanceKm: estimate.distanceKm,
      },
    };
  }

  // ---------- role-scoped access (IDOR protection) ----------

  /**
   * Builds the WHERE clause binding the case to the actor. No role may fetch
   * a case by id alone.
   */
  private scopeFor(user: AuthUser): Prisma.ServiceRequestWhereInput {
    const or: Prisma.ServiceRequestWhereInput[] = [];
    if (user.roles.includes(Role.ADMIN) || user.roles.includes(Role.SUPPORT_AGENT)) {
      return {}; // full visibility, audit-logged elsewhere
    }
    if (user.roles.includes(Role.CUSTOMER)) {
      or.push({ vehicle: { owner: { userId: user.userId } } });
    }
    if (user.roles.includes(Role.RECOVERY_DRIVER) || user.roles.includes(Role.DELIVERY_DRIVER)) {
      or.push({ recoveryAssignments: { some: { driver: { userId: user.userId } } } });
      or.push({ deliveryAssignments: { some: { driver: { userId: user.userId } } } });
    }
    if (
      user.roles.includes(Role.GARAGE_TECHNICIAN) ||
      user.roles.includes(Role.GARAGE_MANAGER) ||
      user.roles.includes(Role.QC_INSPECTOR)
    ) {
      or.push({ garage: { users: { some: { id: user.userId } } } });
    }
    if (user.roles.includes(Role.SUPPLIER)) {
      or.push({ partOrders: { some: { supplier: { users: { some: { id: user.userId } } } } } });
    }
    return or.length > 0 ? { OR: or } : { id: 'never-matches' };
  }

  async getForActor(user: AuthUser, id: string) {
    const sr = await this.prisma.serviceRequest.findFirst({
      where: { id, ...this.scopeFor(user) },
      include: {
        vehicle: { select: { make: true, model: true, year: true, plateEmirate: true, plateCode: true, plateNumber: true } },
        media: true,
        garage: { select: { id: true, name: true, address: true, phone: true } },
        quotations: { where: { status: { not: 'DRAFT' } }, include: { items: { include: { approval: true } } } },
      },
    });
    if (!sr) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Service request not found' });
    return sr;
  }

  async listForActor(user: AuthUser, limit = 20, cursor?: string) {
    const data = await this.prisma.serviceRequest.findMany({
      where: this.scopeFor(user),
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 50) + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        status: true,
        type: true,
        createdAt: true,
        vehicle: { select: { make: true, model: true, year: true } },
      },
    });
    const hasMore = data.length > Math.min(limit, 50);
    const page = hasMore ? data.slice(0, -1) : data;
    return { data: page, nextCursor: hasMore ? page[page.length - 1]?.id : null };
  }

  async timeline(user: AuthUser, id: string) {
    await this.getForActor(user, id); // access check
    const history = await this.prisma.statusHistory.findMany({
      where: { serviceRequestId: id },
      orderBy: { createdAt: 'asc' },
      select: {
        toStatus: true,
        actorRole: true,
        isSystem: true,
        isOverride: true,
        notes: true,
        createdAt: true,
      },
    });
    // Clients localise via @sanad/shared STATUS_MESSAGES using messageCode.
    return history.map((h) => ({ ...h, messageCode: `CASE_STATUS:${h.toStatus}` }));
  }

  // ---------- transitions ----------

  /**
   * Public transition endpoint used by drivers/garages/etc. Runs inside a
   * transaction with a row lock; validates the actor, the rule, dispute
   * freeze, and OTP-guarded handovers; appends StatusHistory.
   */
  async transition(user: AuthUser, id: string, dto: TransitionDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      // Row lock prevents concurrent double-transitions.
      const rows = await tx.$queryRaw<{ id: string; status: CaseStatus; disputeFrozen: boolean }[]>`
        SELECT "id", "status", "disputeFrozen" FROM "ServiceRequest" WHERE "id" = ${id} FOR UPDATE`;
      const current = rows[0];
      if (!current) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Service request not found' });

      // Object-level access check inside the same tx.
      const accessible = await tx.serviceRequest.findFirst({
        where: { id, ...this.scopeFor(user) },
        select: { id: true },
      });
      if (!accessible) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Service request not found' });

      if (current.disputeFrozen && !user.roles.includes(Role.ADMIN)) {
        throw new ConflictException({
          error: 'CONFLICT',
          message: 'Case is frozen while a dispute is open',
        });
      }

      const actors: Actor[] = user.roles;
      const isAdminOverride = user.roles.includes(Role.ADMIN) && dto.notes?.startsWith('OVERRIDE:') === true;
      const check = checkTransition(current.status, dto.toStatus, actors, { isAdminOverride });
      if (!check.ok) {
        throw new ConflictException({
          error: 'INVALID_TRANSITION',
          message: `Cannot move case from ${current.status} to ${dto.toStatus}`,
          details: [{ allowed: allowedTargetsFor(current.status, actors) }],
        });
      }

      const handoverType = OTP_GUARDED[dto.toStatus];
      if (handoverType) {
        await this.verifyHandoverOtpTx(tx, id, handoverType, dto.otp, user.userId);
      }

      if (dto.toStatus === 'VEHICLE_COLLECTED') {
        const beforePhotos = await tx.serviceRequestMedia.count({
          where: { serviceRequestId: id, kind: 'BEFORE_PICKUP' },
        });
        const evidenceIsBeforePickup =
          (dto.evidenceMediaIds?.length ?? 0) > 0
            ? await tx.serviceRequestMedia.count({
                where: { id: { in: dto.evidenceMediaIds }, serviceRequestId: id, kind: 'BEFORE_PICKUP' },
              })
            : 0;
        if (beforePhotos + evidenceIsBeforePickup === 0) {
          throw new BadRequestException({
            error: 'VALIDATION_FAILED',
            message: 'Before-pickup photographs are required to collect the vehicle',
          });
        }
      }

      await this.applyTransitionTx(tx, id, current.status, dto.toStatus, {
        actorUserId: user.userId,
        actorRole: user.roles[0],
        isOverride: isAdminOverride,
        notes: dto.notes,
        lat: dto.lat,
        lng: dto.lng,
        evidenceMediaIds: dto.evidenceMediaIds,
      });

      if (dto.toStatus === 'DISPUTED') {
        await tx.serviceRequest.update({ where: { id }, data: { disputeFrozen: true } });
      }

      // Entering RECOVERY_ARRIVED issues the pickup OTP; scheduling delivery
      // issues the delivery OTP.
      if (dto.toStatus === 'RECOVERY_ARRIVED') {
        await this.issueHandoverOtpTx(tx, id, HandoverType.PICKUP);
      }
      if (dto.toStatus === 'VEHICLE_OUT_FOR_DELIVERY' || dto.toStatus === 'DELIVERY_SCHEDULED') {
        await this.issueHandoverOtpTx(tx, id, HandoverType.CUSTOMER_DELIVERY);
      }

      return { from: current.status, to: dto.toStatus };
    });

    await this.notifyCustomer(id, `CASE_STATUS:${result.to}`);
    return { ok: true, status: result.to, messageCode: `CASE_STATUS:${result.to}` };
  }

  /**
   * Internal SYSTEM transition used by payments/quotations/parts modules once
   * their guards hold. Must be called inside the caller's transaction when
   * consistency matters.
   */
  async systemTransition(
    tx: Prisma.TransactionClient,
    id: string,
    to: CaseStatus,
    notes?: string,
  ): Promise<void> {
    const rows = await tx.$queryRaw<{ status: CaseStatus }[]>`
      SELECT "status" FROM "ServiceRequest" WHERE "id" = ${id} FOR UPDATE`;
    const current = rows[0];
    if (!current) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Service request not found' });
    const check = checkTransition(current.status, to, [SYSTEM]);
    if (!check.ok) {
      throw new ConflictException({
        error: 'INVALID_TRANSITION',
        message: `System cannot move case from ${current.status} to ${to}`,
      });
    }
    await this.applyTransitionTx(tx, id, current.status, to, { system: true, notes });
  }

  /**
   * Module-internal transition performed by a specific role inside the
   * caller's transaction (e.g. garage submitting a diagnosis). The actor's
   * access to the case must already be verified by the calling service.
   */
  async systemTransitionAs(
    tx: Prisma.TransactionClient,
    id: string,
    to: CaseStatus,
    actor: { actorUserId: string; actorRole: Role },
    notes?: string,
  ): Promise<void> {
    const rows = await tx.$queryRaw<{ status: CaseStatus }[]>`
      SELECT "status" FROM "ServiceRequest" WHERE "id" = ${id} FOR UPDATE`;
    const current = rows[0];
    if (!current) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Service request not found' });
    const check = checkTransition(current.status, to, [actor.actorRole]);
    if (!check.ok) {
      throw new ConflictException({
        error: 'INVALID_TRANSITION',
        message: `Cannot move case from ${current.status} to ${to}`,
        details: [{ allowed: allowedTargetsFor(current.status, [actor.actorRole]) }],
      });
    }
    await this.applyTransitionTx(tx, id, current.status, to, {
      actorUserId: actor.actorUserId,
      actorRole: actor.actorRole,
      notes,
    });
  }

  private async applyTransitionTx(
    tx: Prisma.TransactionClient,
    id: string,
    from: CaseStatus,
    to: CaseStatus,
    meta: {
      system?: boolean;
      actorUserId?: string;
      actorRole?: Role;
      isOverride?: boolean;
      notes?: string;
      lat?: number;
      lng?: number;
      evidenceMediaIds?: string[];
    },
  ): Promise<void> {
    await tx.serviceRequest.update({
      where: { id },
      data: { status: to, ...(to === 'CASE_CLOSED' ? { closedAt: new Date() } : {}) },
    });
    await tx.statusHistory.create({
      data: {
        serviceRequestId: id,
        fromStatus: from,
        toStatus: to,
        actorUserId: meta.actorUserId,
        actorRole: meta.actorRole,
        isSystem: meta.system ?? false,
        isOverride: meta.isOverride ?? false,
        notes: meta.notes,
        lat: meta.lat !== undefined ? new Prisma.Decimal(meta.lat.toFixed(6)) : undefined,
        lng: meta.lng !== undefined ? new Prisma.Decimal(meta.lng.toFixed(6)) : undefined,
        ...(meta.evidenceMediaIds?.length
          ? { evidence: { connect: meta.evidenceMediaIds.map((mid) => ({ id: mid })) } }
          : {}),
      },
    });
  }

  // ---------- handover OTP ----------

  private async issueHandoverOtpTx(
    tx: Prisma.TransactionClient,
    serviceRequestId: string,
    type: HandoverType,
  ): Promise<void> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await tx.vehicleHandover.create({
      data: {
        serviceRequestId,
        type,
        otpHash: hashOtp(code),
        otpExpiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      },
    });
    // Send to the customer's phone after commit — fetch owner now.
    const sr = await tx.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      select: { vehicle: { select: { owner: { select: { user: { select: { phone: true } } } } } } },
    });
    const phone = sr?.vehicle.owner.user.phone;
    if (phone) {
      // Mock provider in dev; production sends via approved SMS gateway.
      void this.sms.send(phone, `Sanad handover code: ${code}. Share it only with the driver at ${type === 'PICKUP' ? 'pickup' : 'delivery'}.`);
    }
  }

  private async verifyHandoverOtpTx(
    tx: Prisma.TransactionClient,
    serviceRequestId: string,
    type: HandoverType,
    otp: string | undefined,
    verifierUserId: string,
  ): Promise<void> {
    const handover = await tx.vehicleHandover.findFirst({
      where: { serviceRequestId, type, verifiedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!handover || !handover.otpHash) {
      throw new BadRequestException({
        error: 'VALIDATION_FAILED',
        message: 'No handover is awaiting verification for this case',
      });
    }
    if (!otp) {
      throw new UnauthorizedException({ error: 'OTP_INVALID', message: 'Handover OTP is required' });
    }
    if (handover.otpExpiresAt && handover.otpExpiresAt < new Date()) {
      throw new UnauthorizedException({ error: 'OTP_EXPIRED', message: 'Handover code expired' });
    }
    if (handover.otpAttempts >= 5) {
      throw new UnauthorizedException({ error: 'OTP_INVALID', message: 'Too many incorrect attempts' });
    }
    if (handover.otpHash !== hashOtp(otp)) {
      await tx.vehicleHandover.update({
        where: { id: handover.id },
        data: { otpAttempts: { increment: 1 } },
      });
      throw new UnauthorizedException({ error: 'OTP_INVALID', message: 'Incorrect handover code' });
    }
    await tx.vehicleHandover.update({
      where: { id: handover.id },
      data: { verifiedAt: new Date(), verifiedByUserId: verifierUserId },
    });
  }

  private async notifyCustomer(serviceRequestId: string, messageCode: string): Promise<void> {
    const sr = await this.prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      select: { vehicle: { select: { owner: { select: { userId: true } } } } },
    });
    if (sr) {
      await this.notifications.notify(sr.vehicle.owner.userId, messageCode, { caseId: serviceRequestId });
    }
  }
}
