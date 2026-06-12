import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CaseStatus, Prisma, Role, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ServiceRequestsService } from '../service-requests/service-requests.service';

type VerifiableEntity = 'provider' | 'garage' | 'supplier';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly cases: ServiceRequestsService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------- live case board ----------

  async listCases(status?: CaseStatus, limit = 50) {
    return this.prisma.serviceRequest.findMany({
      where: status ? { status } : { status: { notIn: ['CASE_CLOSED', 'CANCELLED'] } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
      include: {
        vehicle: { select: { make: true, model: true, year: true, plateEmirate: true, plateCode: true, plateNumber: true } },
        garage: { select: { id: true, name: true } },
        recoveryAssignments: {
          where: { status: { in: ['OFFERED', 'ACCEPTED'] } },
          include: { driver: { include: { user: { select: { fullName: true, phone: true } } } } },
        },
      },
    });
  }

  async getCase(id: string) {
    const sr = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        vehicle: true,
        garage: { select: { id: true, name: true, address: true, phone: true } },
        media: { select: { id: true, kind: true, mimeType: true, createdAt: true } },
        recoveryAssignments: {
          include: {
            driver: { include: { user: { select: { fullName: true, phone: true } } } },
            recoveryVehicle: { select: { plateNumber: true, truckType: true } },
          },
        },
        quotations: { include: { items: { include: { approval: true } } }, orderBy: { version: 'desc' } },
        payments: { select: { id: true, kind: true, status: true, total: true, currency: true, createdAt: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!sr) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Service request not found' });
    return sr;
  }

  // ---------- directory lists for assignment & verification UIs ----------

  async listDrivers(onlyAvailable = false) {
    return this.prisma.driver.findMany({
      where: {
        ...(onlyAvailable ? { isAvailable: true } : {}),
        provider: { deletedAt: null },
      },
      include: {
        user: { select: { fullName: true, phone: true } },
        provider: { select: { id: true, companyName: true, verification: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listGarages(verification?: VerificationStatus) {
    return this.prisma.garage.findMany({
      where: { deletedAt: null, ...(verification ? { verification } : {}) },
      select: {
        id: true, name: true, emirate: true, address: true, phone: true,
        verification: true, tradeLicenceNo: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listProviders(verification?: VerificationStatus) {
    return this.prisma.providerProfile.findMany({
      where: { deletedAt: null, ...(verification ? { verification } : {}) },
      select: {
        id: true, companyName: true, phone: true, verification: true,
        tradeLicenceNo: true, createdAt: true,
        _count: { select: { drivers: true, recoveryVehicles: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listSuppliers(verification?: VerificationStatus) {
    return this.prisma.supplier.findMany({
      where: { deletedAt: null, ...(verification ? { verification } : {}) },
      select: {
        id: true, name: true, emirate: true, phone: true, verification: true,
        tradeLicenceNo: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listPricing() {
    return this.prisma.pricingConfig.findMany({
      where: { isActive: true },
      orderBy: { emirate: 'asc' },
    });
  }

  // ---------- manual recovery assignment (MVP dispatch) ----------

  async assignRecovery(adminUserId: string, serviceRequestId: string, driverId: string, recoveryVehicleId?: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { id: driverId, provider: { verification: 'APPROVED', deletedAt: null } },
      include: { user: { select: { id: true } } },
    });
    if (!driver) {
      throw new BadRequestException({
        error: 'VALIDATION_FAILED',
        message: 'Driver not found or provider not approved',
      });
    }
    if (recoveryVehicleId) {
      const truck = await this.prisma.recoveryVehicle.findFirst({
        where: { id: recoveryVehicleId, providerId: driver.providerId, verification: 'APPROVED' },
      });
      if (!truck) {
        throw new BadRequestException({
          error: 'VALIDATION_FAILED',
          message: 'Recovery vehicle not found or not approved for this provider',
        });
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const sr = await tx.serviceRequest.findUnique({
        where: { id: serviceRequestId },
        select: { status: true },
      });
      if (!sr) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Service request not found' });
      if (sr.status !== 'AWAITING_RECOVERY_ASSIGNMENT') {
        throw new ConflictException({
          error: 'INVALID_TRANSITION',
          message: `Case is in ${sr.status}, not awaiting assignment`,
        });
      }

      const assignment = await tx.recoveryAssignment.create({
        data: {
          serviceRequestId,
          driverId,
          recoveryVehicleId,
          status: 'OFFERED',
        },
      });
      await this.cases.systemTransitionAs(tx, serviceRequestId, 'RECOVERY_ASSIGNED', {
        actorUserId: adminUserId,
        actorRole: Role.ADMIN,
      });
      return assignment;
    });

    await this.notifications.notify(driver.user.id, 'JOB_OFFERED', { caseId: serviceRequestId });
    await this.audit.record({
      actorUserId: adminUserId,
      actorRole: Role.ADMIN,
      action: 'RECOVERY_ASSIGNED',
      entityType: 'ServiceRequest',
      entityId: serviceRequestId,
      after: { driverId, recoveryVehicleId },
    });
    return result;
  }

  async assignGarage(adminUserId: string, serviceRequestId: string, garageId: string) {
    const garage = await this.prisma.garage.findFirst({
      where: { id: garageId, verification: 'APPROVED', deletedAt: null },
    });
    if (!garage) {
      throw new BadRequestException({ error: 'VALIDATION_FAILED', message: 'Garage not found or not approved' });
    }
    const sr = await this.prisma.serviceRequest.findUnique({ where: { id: serviceRequestId } });
    if (!sr) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Service request not found' });

    const updated = await this.prisma.serviceRequest.update({
      where: { id: serviceRequestId },
      data: { garageId },
    });
    await this.audit.record({
      actorUserId: adminUserId,
      actorRole: Role.ADMIN,
      action: 'GARAGE_ASSIGNED',
      entityType: 'ServiceRequest',
      entityId: serviceRequestId,
      before: { garageId: sr.garageId },
      after: { garageId },
    });
    return updated;
  }

  // ---------- verification workflows ----------

  async setVerification(
    adminUserId: string,
    entity: VerifiableEntity,
    id: string,
    status: VerificationStatus,
  ) {
    const data = {
      verification: status,
      ...(status === 'APPROVED' ? { verifiedAt: new Date() } : {}),
    };
    let before: VerificationStatus;
    if (entity === 'provider') {
      const row = await this.prisma.providerProfile.findUnique({ where: { id } });
      if (!row) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Provider not found' });
      before = row.verification;
      await this.prisma.providerProfile.update({ where: { id }, data });
    } else if (entity === 'garage') {
      const row = await this.prisma.garage.findUnique({ where: { id } });
      if (!row) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Garage not found' });
      before = row.verification;
      await this.prisma.garage.update({ where: { id }, data });
    } else {
      const row = await this.prisma.supplier.findUnique({ where: { id } });
      if (!row) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Supplier not found' });
      before = row.verification;
      await this.prisma.supplier.update({ where: { id }, data });
    }
    await this.audit.record({
      actorUserId: adminUserId,
      actorRole: Role.ADMIN,
      action: 'VERIFICATION_CHANGED',
      entityType: entity,
      entityId: id,
      before: { verification: before },
      after: { verification: status },
    });
    return { ok: true, verification: status };
  }

  // ---------- pricing ----------

  async upsertPricing(adminUserId: string, input: {
    emirate: string;
    baseRecoveryFee: string;
    perKmFee: string;
    diagnosticFee: string;
    platformFeeRate?: string;
  }) {
    const created = await this.prisma.$transaction(async (tx) => {
      await tx.pricingConfig.updateMany({
        where: { emirate: input.emirate, isActive: true },
        data: { isActive: false },
      });
      return tx.pricingConfig.create({
        data: {
          emirate: input.emirate,
          baseRecoveryFee: new Prisma.Decimal(input.baseRecoveryFee),
          perKmFee: new Prisma.Decimal(input.perKmFee),
          diagnosticFee: new Prisma.Decimal(input.diagnosticFee),
          ...(input.platformFeeRate ? { platformFeeRate: new Prisma.Decimal(input.platformFeeRate) } : {}),
        },
      });
    });
    await this.audit.record({
      actorUserId: adminUserId,
      actorRole: Role.ADMIN,
      action: 'PRICING_UPDATED',
      entityType: 'PricingConfig',
      entityId: created.id,
      after: input,
    });
    return created;
  }

  // ---------- audit ----------

  async auditLogs(entityType?: string, entityId?: string, limit = 100) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500),
    });
  }
}
