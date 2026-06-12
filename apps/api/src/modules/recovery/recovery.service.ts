import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssignmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RecoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async driverFor(userId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { userId } });
    if (!driver) throw new ForbiddenException({ error: 'FORBIDDEN', message: 'No driver profile' });
    return driver;
  }

  async setAvailability(userId: string, isAvailable: boolean) {
    const driver = await this.driverFor(userId);
    return this.prisma.driver.update({
      where: { id: driver.id },
      data: { isAvailable },
      select: { id: true, isAvailable: true },
    });
  }

  /** Jobs offered to this driver (admin-assigned in MVP). */
  async myJobs(userId: string) {
    const driver = await this.driverFor(userId);
    return this.prisma.recoveryAssignment.findMany({
      where: { driverId: driver.id, status: { in: ['OFFERED', 'ACCEPTED'] } },
      orderBy: { offeredAt: 'desc' },
      include: {
        serviceRequest: {
          select: {
            id: true,
            status: true,
            pickupLat: true,
            pickupLng: true,
            pickupAddress: true,
            canMove: true,
            vehicle: { select: { make: true, model: true, year: true, color: true } },
          },
        },
      },
    });
  }

  async respond(userId: string, assignmentId: string, accept: boolean) {
    const driver = await this.driverFor(userId);
    const assignment = await this.prisma.recoveryAssignment.findFirst({
      where: { id: assignmentId, driverId: driver.id }, // scoped to own assignments
      include: { serviceRequest: { select: { id: true, status: true } } },
    });
    if (!assignment) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Assignment not found' });
    if (assignment.status !== AssignmentStatus.OFFERED) {
      throw new ConflictException({ error: 'CONFLICT', message: 'Assignment already responded to' });
    }

    if (!accept) {
      await this.prisma.recoveryAssignment.update({
        where: { id: assignment.id },
        data: { status: AssignmentStatus.REJECTED, respondedAt: new Date() },
      });
      return { ok: true, status: 'REJECTED' };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.recoveryAssignment.update({
        where: { id: assignment.id },
        data: { status: AssignmentStatus.ACCEPTED, respondedAt: new Date() },
      });
      // The case moves to RECOVERY_ASSIGNED when the admin assigns; the driver
      // accepting just confirms. If the admin offered without transitioning
      // (auto-dispatch later), the case may still be awaiting assignment.
    });
    return { ok: true, status: 'ACCEPTED' };
  }

  /** Driver location ping — feeds customer live tracking. Rate-limited at the gateway. */
  async ping(userId: string, serviceRequestId: string, lat: number, lng: number) {
    const driver = await this.driverFor(userId);
    const assignment = await this.prisma.recoveryAssignment.findFirst({
      where: {
        serviceRequestId,
        driverId: driver.id,
        status: AssignmentStatus.ACCEPTED,
      },
    });
    if (!assignment) {
      throw new ForbiddenException({ error: 'FORBIDDEN', message: 'Not assigned to this case' });
    }
    const point = {
      lat: new Prisma.Decimal(lat.toFixed(6)),
      lng: new Prisma.Decimal(lng.toFixed(6)),
    };
    await this.prisma.$transaction([
      this.prisma.location.create({
        data: {
          serviceRequestId,
          ...point,
          source: 'DRIVER_APP',
          actorUserId: userId,
        },
      }),
      this.prisma.driver.update({
        where: { id: driver.id },
        data: { lastLat: point.lat, lastLng: point.lng, lastLocationAt: new Date() },
      }),
    ]);
    return { ok: true };
  }

  /** Latest driver positions for a case the actor may see (checked upstream). */
  async tracking(serviceRequestId: string, limit = 50) {
    return this.prisma.location.findMany({
      where: { serviceRequestId, source: 'DRIVER_APP' },
      orderBy: { recordedAt: 'desc' },
      take: Math.min(limit, 200),
      select: { lat: true, lng: true, recordedAt: true },
    });
  }
}
