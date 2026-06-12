import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolves the caller's customer profile — every vehicle query is scoped to it. */
  async profileIdFor(userId: string): Promise<string> {
    const profile = await this.prisma.customerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new ForbiddenException({ error: 'FORBIDDEN', message: 'No customer profile' });
    }
    return profile.id;
  }

  async list(userId: string) {
    const ownerId = await this.profileIdFor(userId);
    return this.prisma.vehicle.findMany({
      where: { ownerId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOwned(userId: string, vehicleId: string) {
    const ownerId = await this.profileIdFor(userId);
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, ownerId, deletedAt: null },
      include: { documents: true },
    });
    if (!vehicle) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Vehicle not found' });
    return vehicle;
  }

  async create(userId: string, dto: CreateVehicleDto) {
    const ownerId = await this.profileIdFor(userId);
    if (dto.vin) {
      const existing = await this.prisma.vehicle.findFirst({
        where: { vin: dto.vin.toUpperCase(), deletedAt: null },
      });
      if (existing) {
        throw new ConflictException({
          error: 'CONFLICT',
          message: 'A vehicle with this VIN is already registered',
        });
      }
    }
    return this.prisma.vehicle.create({
      data: { ...dto, vin: dto.vin?.toUpperCase(), ownerId },
    });
  }

  async update(userId: string, vehicleId: string, dto: UpdateVehicleDto) {
    await this.getOwned(userId, vehicleId);
    return this.prisma.vehicle.update({ where: { id: vehicleId }, data: dto });
  }

  async softDelete(userId: string, vehicleId: string): Promise<void> {
    await this.getOwned(userId, vehicleId);
    const active = await this.prisma.serviceRequest.count({
      where: {
        vehicleId,
        status: { notIn: ['CASE_CLOSED', 'CANCELLED'] },
      },
    });
    if (active > 0) {
      throw new ConflictException({
        error: 'CONFLICT',
        message: 'Vehicle has an active service request and cannot be removed',
      });
    }
    await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { deletedAt: new Date() },
    });
  }
}
