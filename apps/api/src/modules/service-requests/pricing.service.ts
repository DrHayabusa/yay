import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { GeoProvider } from '../../infra/providers/geo.provider';

export interface RecoveryEstimate {
  recoveryFee: Prisma.Decimal;
  diagnosticFee: Prisma.Decimal;
  vatRate: Prisma.Decimal;
  vatAmount: Prisma.Decimal;
  total: Prisma.Decimal;
  etaMinutes: number;
  distanceKm: number;
  currency: string;
}

/** Fallbacks used until an admin configures PricingConfig rows. */
const DEFAULTS = {
  baseRecoveryFee: new Prisma.Decimal('200.00'),
  perKmFee: new Prisma.Decimal('5.00'),
  diagnosticFee: new Prisma.Decimal('100.00'),
  vatRate: new Prisma.Decimal('0.05'),
};

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoProvider,
  ) {}

  /**
   * Recovery estimate = base fee + per-km fee × distance to the nearest
   * approved garage (or a 15 km default radius when no garage is configured),
   * plus the diagnostic fee, plus VAT. Decimal arithmetic throughout.
   */
  async estimateRecovery(emirate: string, lat: number, lng: number): Promise<RecoveryEstimate> {
    const config = await this.prisma.pricingConfig.findFirst({
      where: { emirate, isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
    const base = config?.baseRecoveryFee ?? DEFAULTS.baseRecoveryFee;
    const perKm = config?.perKmFee ?? DEFAULTS.perKmFee;
    const diagnostic = config?.diagnosticFee ?? DEFAULTS.diagnosticFee;
    const vatRate = config?.vatRate ?? DEFAULTS.vatRate;

    const garage = await this.prisma.garage.findFirst({
      where: { verification: 'APPROVED', deletedAt: null, emirate },
    });
    const distanceKm = garage
      ? await this.geo.distanceKm(lat, lng, Number(garage.lat), Number(garage.lng))
      : 15;

    const recoveryFee = base
      .add(perKm.mul(new Prisma.Decimal(distanceKm.toFixed(2))))
      .toDecimalPlaces(2);
    const subtotal = recoveryFee.add(diagnostic);
    const vatAmount = subtotal.mul(vatRate).toDecimalPlaces(2);
    const total = subtotal.add(vatAmount);

    // Simple ETA model for MVP: 20 min dispatch + 2 min/km.
    const etaMinutes = Math.round(20 + distanceKm * 2);

    return {
      recoveryFee,
      diagnosticFee: diagnostic,
      vatRate,
      vatAmount,
      total,
      etaMinutes,
      distanceKm,
      currency: config?.currency ?? 'AED',
    };
  }
}
