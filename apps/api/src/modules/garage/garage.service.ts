import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FindingSeverity, Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { ServiceRequestsService } from '../service-requests/service-requests.service';

export interface FindingInput {
  title: string;
  technicalDetail: string;
  plainLanguageSummary: string;
  severity: FindingSeverity;
  evidenceMediaIds: string[];
  repairItems: { description: string; labourHours: string; requiresPart: boolean }[];
}

@Injectable()
export class GarageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cases: ServiceRequestsService,
  ) {}

  /** Resolves the caller's garage; all queue/inspection queries are scoped to it. */
  private async garageFor(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { garageId: true },
    });
    if (!user?.garageId) {
      throw new ForbiddenException({ error: 'FORBIDDEN', message: 'No garage membership' });
    }
    return user.garageId;
  }

  async queue(userId: string) {
    const garageId = await this.garageFor(userId);
    return this.prisma.serviceRequest.findMany({
      where: {
        garageId,
        status: { in: ['VEHICLE_IN_TRANSIT', 'VEHICLE_AT_GARAGE', 'INSPECTION_IN_PROGRESS', 'DIAGNOSIS_SUBMITTED', 'REPAIR_IN_PROGRESS', 'QUALITY_CHECK_IN_PROGRESS'] },
      },
      orderBy: { updatedAt: 'asc' },
      select: {
        id: true,
        status: true,
        description: true,
        canMove: true,
        createdAt: true,
        vehicle: { select: { make: true, model: true, year: true, vin: true, plateEmirate: true, plateCode: true, plateNumber: true } },
      },
    });
  }

  /** Starts an inspection — requires the case to be at this garage. */
  async startInspection(userId: string, serviceRequestId: string) {
    const garageId = await this.garageFor(userId);
    const technician = await this.prisma.technician.findFirst({
      where: { userId, garageId },
    });
    if (!technician) {
      throw new ForbiddenException({ error: 'FORBIDDEN', message: 'No technician profile at this garage' });
    }
    const sr = await this.prisma.serviceRequest.findFirst({
      where: { id: serviceRequestId, garageId, status: 'VEHICLE_AT_GARAGE' },
    });
    if (!sr) {
      throw new ConflictException({
        error: 'CONFLICT',
        message: 'Case is not at this garage awaiting inspection',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const inspection = await tx.inspection.create({
        data: { serviceRequestId, technicianId: technician.id },
      });
      await this.cases.systemTransitionAs(tx, serviceRequestId, 'INSPECTION_IN_PROGRESS', {
        actorUserId: userId,
        actorRole: 'GARAGE_TECHNICIAN',
      });
      return inspection;
    });
  }

  async addFinding(userId: string, inspectionId: string, input: FindingInput) {
    const garageId = await this.garageFor(userId);
    const inspection = await this.prisma.inspection.findFirst({
      where: { id: inspectionId, serviceRequest: { garageId }, submittedAt: null },
    });
    if (!inspection) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Open inspection not found' });
    }
    if (input.evidenceMediaIds.length === 0) {
      throw new BadRequestException({
        error: 'VALIDATION_FAILED',
        message: 'Every finding requires photographic or video evidence',
      });
    }
    // Evidence must belong to the same case — prevents cross-case references.
    const owned = await this.prisma.serviceRequestMedia.count({
      where: { id: { in: input.evidenceMediaIds }, serviceRequestId: inspection.serviceRequestId },
    });
    if (owned !== input.evidenceMediaIds.length) {
      throw new BadRequestException({
        error: 'VALIDATION_FAILED',
        message: 'Evidence media must be uploaded to this case first',
      });
    }

    return this.prisma.diagnosticFinding.create({
      data: {
        inspectionId,
        title: input.title,
        technicalDetail: input.technicalDetail,
        plainLanguageSummary: input.plainLanguageSummary,
        severity: input.severity,
        evidenceMediaIds: input.evidenceMediaIds,
        repairItems: {
          create: input.repairItems.map((ri) => ({
            description: ri.description,
            labourHours: new Prisma.Decimal(ri.labourHours),
            requiresPart: ri.requiresPart,
          })),
        },
      },
      include: { repairItems: true },
    });
  }

  /**
   * Submits the diagnosis: requires ≥1 finding. Moves the case to
   * DIAGNOSIS_SUBMITTED. The quotation is built separately and publishing it
   * moves the case to AWAITING_CUSTOMER_APPROVAL.
   */
  async submitInspection(userId: string, inspectionId: string, odometerKm?: number, checklist?: unknown) {
    const garageId = await this.garageFor(userId);
    const isManager = await this.prisma.user.findFirst({
      where: { id: userId, garageId, roles: { some: { role: 'GARAGE_MANAGER' } } },
    });
    if (!isManager) {
      throw new ForbiddenException({
        error: 'FORBIDDEN',
        message: 'Only the garage manager can submit a diagnosis',
      });
    }
    const inspection = await this.prisma.inspection.findFirst({
      where: { id: inspectionId, serviceRequest: { garageId }, submittedAt: null },
      include: { findings: true, serviceRequest: { select: { id: true, status: true } } },
    });
    if (!inspection) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Open inspection not found' });
    }
    if (inspection.findings.length === 0) {
      throw new BadRequestException({
        error: 'VALIDATION_FAILED',
        message: 'A diagnosis must contain at least one finding',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.inspection.update({
        where: { id: inspectionId },
        data: {
          submittedAt: new Date(),
          odometerKm,
          checklist: checklist as Prisma.InputJsonValue,
        },
      });
      await this.cases.systemTransitionAs(tx, inspection.serviceRequest.id, 'DIAGNOSIS_SUBMITTED', {
        actorUserId: userId,
        actorRole: 'GARAGE_MANAGER',
      });
      return { ok: true };
    });
  }
}
