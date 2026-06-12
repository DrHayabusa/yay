import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ServiceRequestsService } from '../service-requests/service-requests.service';

@Injectable()
export class PartsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly cases: ServiceRequestsService,
  ) {}

  // ---------- search & options ----------

  async search(query: {
    vin?: string;
    make?: string;
    model?: string;
    year?: number;
    engine?: string;
    partNumber?: string;
    category?: string;
  }) {
    // VIN search resolves the registered vehicle's make/model/year first.
    let { make, model, year, engine } = query;
    if (query.vin) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { vin: query.vin.toUpperCase(), deletedAt: null },
        select: { make: true, model: true, year: true, engine: true },
      });
      if (vehicle) {
        make = vehicle.make;
        model = vehicle.model;
        year = vehicle.year;
        engine = vehicle.engine ?? undefined;
      }
    }

    return this.prisma.sparePart.findMany({
      where: {
        deletedAt: null,
        ...(query.partNumber ? { oemNumber: { equals: query.partNumber, mode: 'insensitive' } } : {}),
        ...(query.category ? { category: { equals: query.category, mode: 'insensitive' } } : {}),
        ...(make && model
          ? {
              compatibility: {
                some: {
                  make: { equals: make, mode: 'insensitive' },
                  model: { equals: model, mode: 'insensitive' },
                  ...(year ? { yearFrom: { lte: year }, yearTo: { gte: year } } : {}),
                  ...(engine ? { OR: [{ engine: null }, { engine: { equals: engine, mode: 'insensitive' } }] } : {}),
                },
              },
            }
          : {}),
      },
      take: 50,
      include: {
        inventory: {
          where: { deletedAt: null, stockQty: { gt: 0 }, supplier: { verification: 'APPROVED', deletedAt: null } },
          include: { supplier: { select: { id: true, name: true } } },
        },
      },
    });
  }

  /**
   * Compatible options for a quotation item that requires a part — grouped by
   * condition (OEM / premium / standard / used-refurbished where permitted).
   * Only parts with a verified compatibility row for the case vehicle appear.
   */
  async optionsForItem(userId: string, quotationItemId: string) {
    const item = await this.prisma.quotationItem.findFirst({
      where: {
        id: quotationItemId,
        requiresPart: true,
        quotation: { serviceRequest: { vehicle: { owner: { userId } } } },
      },
      include: {
        quotation: {
          select: {
            serviceRequest: { select: { vehicle: { select: { make: true, model: true, year: true, engine: true } } } },
          },
        },
      },
    });
    if (!item) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Quotation item not found' });

    const vehicle = item.quotation.serviceRequest.vehicle;
    const inventory = await this.prisma.supplierInventory.findMany({
      where: {
        deletedAt: null,
        stockQty: { gt: 0 },
        supplier: { verification: 'APPROVED', deletedAt: null },
        sparePart: {
          deletedAt: null,
          compatibility: {
            some: {
              make: { equals: vehicle.make, mode: 'insensitive' },
              model: { equals: vehicle.model, mode: 'insensitive' },
              yearFrom: { lte: vehicle.year },
              yearTo: { gte: vehicle.year },
              ...(vehicle.engine
                ? { OR: [{ engine: null }, { engine: { equals: vehicle.engine, mode: 'insensitive' } }] }
                : {}),
            },
          },
        },
      },
      include: {
        sparePart: { select: { id: true, name: true, oemNumber: true, category: true, usedAllowed: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { price: 'asc' },
    });

    return inventory
      .filter((inv) => inv.condition !== 'USED_REFURBISHED' || inv.sparePart.usedAllowed)
      .map((inv) => ({
        inventoryId: inv.id,
        part: inv.sparePart,
        condition: inv.condition,
        brand: inv.brand,
        price: { amount: inv.price.toFixed(2), currency: inv.currency },
        warrantyMonths: inv.warrantyMonths,
        supplier: inv.supplier,
        deliveryEtaHours: inv.deliveryEtaHours,
        compatibilityConfirmed: true, // matched a verified fitment row above
      }));
  }

  /**
   * Customer selects a part option. Server re-verifies compatibility — an
   * incompatible inventoryId is rejected regardless of what the client sent.
   */
  async selectPart(userId: string, quotationItemId: string, inventoryId: string) {
    const options = await this.optionsForItem(userId, quotationItemId);
    const chosen = options.find((o) => o.inventoryId === inventoryId);
    if (!chosen) {
      throw new ConflictException({
        error: 'COMPATIBILITY_NOT_CONFIRMED',
        message: 'This part is not confirmed compatible with your vehicle',
      });
    }
    await this.prisma.quotationItem.update({
      where: { id: quotationItemId },
      data: { selectedInventoryId: inventoryId },
    });
    return { ok: true, selected: chosen };
  }

  // ---------- orders ----------

  /**
   * Creates part orders (one per supplier) from the customer's selections.
   * Orders start as PENDING_COMPATIBILITY: a garage technician/manager or
   * platform admin must confirm fitment before the order can be paid for or
   * confirmed — the hard "no incompatible purchase" gate.
   */
  async createOrders(userId: string, serviceRequestId: string) {
    const sr = await this.prisma.serviceRequest.findFirst({
      where: {
        id: serviceRequestId,
        status: 'PARTS_SELECTION_REQUIRED',
        vehicle: { owner: { userId } },
      },
    });
    if (!sr) {
      throw new ConflictException({
        error: 'CONFLICT',
        message: 'Case is not awaiting parts selection',
      });
    }

    const items = await this.prisma.quotationItem.findMany({
      where: {
        quotation: { serviceRequestId, status: 'APPROVED' },
        requiresPart: true,
        approval: { decision: 'APPROVED' },
      },
      include: { selectedInventory: true },
    });
    if (items.length === 0) {
      throw new ConflictException({ error: 'CONFLICT', message: 'No approved part items found' });
    }
    const unselected = items.filter((i) => !i.selectedInventory);
    if (unselected.length > 0) {
      throw new BadRequestException({
        error: 'VALIDATION_FAILED',
        message: `Select a part option for every approved item (${unselected.length} remaining)`,
      });
    }

    const existing = await this.prisma.partOrder.count({
      where: { serviceRequestId, status: { notIn: ['CANCELLED', 'REJECTED'] } },
    });
    if (existing > 0) {
      throw new ConflictException({ error: 'CONFLICT', message: 'Part orders already exist for this case' });
    }

    // Group items by supplier.
    const bySupplier = new Map<string, typeof items>();
    for (const item of items) {
      const supplierId = item.selectedInventory!.supplierId;
      bySupplier.set(supplierId, [...(bySupplier.get(supplierId) ?? []), item]);
    }

    return this.prisma.$transaction(async (tx) => {
      const orders = [];
      for (const [supplierId, group] of bySupplier) {
        let subtotal = new Prisma.Decimal(0);
        const orderItems = group.map((item) => {
          const inv = item.selectedInventory!;
          const line = inv.price.mul(item.quantity).toDecimalPlaces(2);
          subtotal = subtotal.add(line);
          return {
            inventoryId: inv.id,
            quotationItemId: item.id,
            quantity: item.quantity,
            unitPrice: inv.price,
            lineTotal: line,
          };
        });
        orders.push(
          await tx.partOrder.create({
            data: {
              serviceRequestId,
              supplierId,
              status: 'PENDING_COMPATIBILITY',
              subtotal,
              total: subtotal,
              items: { create: orderItems },
            },
            include: { items: true },
          }),
        );
      }
      return orders;
    });
  }

  /** Garage or platform confirms fitment — unlocks payment & confirmation. */
  async confirmCompatibility(user: { userId: string; roles: Role[] }, orderId: string) {
    const isPlatform = user.roles.includes(Role.ADMIN);
    const order = await this.prisma.partOrder.findFirst({
      where: {
        id: orderId,
        status: 'PENDING_COMPATIBILITY',
        ...(isPlatform
          ? {}
          : { serviceRequest: { garage: { users: { some: { id: user.userId } } } } }),
      },
    });
    if (!order) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Pending order not found' });

    const updated = await this.prisma.partOrder.update({
      where: { id: orderId },
      data: {
        status: 'CONFIRMED',
        compatibilityConfirmedByUserId: user.userId,
        compatibilityConfirmedAt: new Date(),
      },
    });
    await this.audit.record({
      actorUserId: user.userId,
      action: 'PART_ORDER_COMPATIBILITY_CONFIRMED',
      entityType: 'PartOrder',
      entityId: orderId,
    });
    return updated;
  }

  /** All orders for a case confirmed? Used by payments before accepting a PARTS/REPAIR charge. */
  async allOrdersConfirmed(tx: Prisma.TransactionClient, serviceRequestId: string): Promise<boolean> {
    const open = await tx.partOrder.count({
      where: { serviceRequestId, status: { in: ['PENDING_COMPATIBILITY'] } },
    });
    const confirmed = await tx.partOrder.count({
      where: { serviceRequestId, status: 'CONFIRMED' },
    });
    return open === 0 && confirmed > 0;
  }

  // ---------- supplier fulfilment ----------

  private async supplierFor(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { supplierId: true },
    });
    if (!user?.supplierId) {
      throw new ForbiddenException({ error: 'FORBIDDEN', message: 'No supplier membership' });
    }
    return user.supplierId;
  }

  async supplierOrders(userId: string) {
    const supplierId = await this.supplierFor(userId);
    return this.prisma.partOrder.findMany({
      where: { supplierId, status: { in: ['CONFIRMED', 'DISPATCHED'] } },
      orderBy: { createdAt: 'asc' },
      include: { items: { include: { inventory: { include: { sparePart: true } } } } },
    });
  }

  async dispatch(userId: string, orderId: string) {
    const supplierId = await this.supplierFor(userId);
    const order = await this.prisma.partOrder.findFirst({
      where: { id: orderId, supplierId, status: 'CONFIRMED' },
      include: { serviceRequest: { select: { id: true, status: true } } },
    });
    if (!order) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Confirmed order not found' });
    if (order.serviceRequest.status !== 'PARTS_ORDERED') {
      throw new ConflictException({
        error: 'CONFLICT',
        message: 'Order cannot be dispatched before payment is captured',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.partOrder.update({
        where: { id: orderId },
        data: { status: 'DISPATCHED', dispatchedAt: new Date() },
      });
      await this.cases.systemTransitionAs(tx, order.serviceRequestId, 'PARTS_DISPATCHED', {
        actorUserId: userId,
        actorRole: Role.SUPPLIER,
      });
      return { ok: true };
    });
  }

  /** Garage confirms physical receipt; when every order is delivered the case advances. */
  async confirmDelivery(userId: string, orderId: string) {
    const order = await this.prisma.partOrder.findFirst({
      where: {
        id: orderId,
        status: 'DISPATCHED',
        serviceRequest: { garage: { users: { some: { id: userId } } } },
      },
    });
    if (!order) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Dispatched order not found' });

    return this.prisma.$transaction(async (tx) => {
      await tx.partOrder.update({
        where: { id: orderId },
        data: { status: 'DELIVERED', deliveredAt: new Date(), garageReceiptByUserId: userId },
      });
      const remaining = await tx.partOrder.count({
        where: { serviceRequestId: order.serviceRequestId, status: { in: ['CONFIRMED', 'DISPATCHED'] } },
      });
      if (remaining === 0) {
        await this.cases.systemTransitionAs(tx, order.serviceRequestId, 'PARTS_DELIVERED', {
          actorUserId: userId,
          actorRole: Role.GARAGE_MANAGER,
        });
      }
      return { ok: true, allDelivered: remaining === 0 };
    });
  }
}
