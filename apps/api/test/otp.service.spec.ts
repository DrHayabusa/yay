import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { OtpService, hashOtp } from '../src/modules/auth/otp.service';

type OtpRow = {
  id: string;
  phone: string;
  purpose: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  consumedAt: Date | null;
  createdAt: Date;
};

/** In-memory stand-in for the Prisma otpCode delegate. */
function makePrismaMock() {
  const rows: OtpRow[] = [];
  let seq = 0;
  return {
    rows,
    otpCode: {
      count: async ({ where }: any) =>
        rows.filter(
          (r) =>
            r.phone === where.phone &&
            r.purpose === where.purpose &&
            r.createdAt > where.createdAt.gt,
        ).length,
      create: async ({ data }: any) => {
        const row: OtpRow = {
          id: `otp_${++seq}`,
          attempts: 0,
          consumedAt: null,
          createdAt: new Date(),
          ...data,
        };
        rows.push(row);
        return row;
      },
      findFirst: async ({ where }: any) => {
        const matches = rows
          .filter((r) => r.phone === where.phone && r.purpose === where.purpose && r.consumedAt === null)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return matches[0] ?? null;
      },
      update: async ({ where, data }: any) => {
        const row = rows.find((r) => r.id === where.id)!;
        if (data.attempts?.increment) row.attempts += data.attempts.increment;
        return row;
      },
      updateMany: async ({ where, data }: any) => {
        const targets = rows.filter((r) => r.id === where.id && r.consumedAt === null);
        targets.forEach((r) => Object.assign(r, data));
        return { count: targets.length };
      },
    },
  };
}

const configMock = {
  get: (key: string, fallback?: unknown) =>
    ({ OTP_TTL_SECONDS: 300, OTP_MAX_ATTEMPTS: 5 })[key] ?? fallback,
} as any;

describe('OtpService', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let service: OtpService;
  const phone = '+971501234567';

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new OtpService(prisma as any, configMock);
  });

  it('issues a 6-digit code and stores only the hash', async () => {
    const code = await service.issue(phone, 'LOGIN' as any);
    expect(code).toMatch(/^\d{6}$/);
    expect(prisma.rows[0].codeHash).toBe(hashOtp(code));
    expect(prisma.rows[0].codeHash).not.toContain(code);
  });

  it('verifies and consumes a valid code (single use)', async () => {
    const code = await service.issue(phone, 'LOGIN' as any);
    await expect(service.verify(phone, 'LOGIN' as any, code)).resolves.toBeUndefined();
    await expect(service.verify(phone, 'LOGIN' as any, code)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a wrong code and counts the attempt', async () => {
    await service.issue(phone, 'LOGIN' as any);
    await expect(service.verify(phone, 'LOGIN' as any, '000000')).rejects.toThrow(UnauthorizedException);
    expect(prisma.rows[0].attempts).toBe(1);
  });

  it('locks out after max attempts', async () => {
    const code = await service.issue(phone, 'LOGIN' as any);
    for (let i = 0; i < 5; i++) {
      await expect(service.verify(phone, 'LOGIN' as any, '000000')).rejects.toThrow();
    }
    // Correct code no longer accepted once the attempt budget is spent.
    await expect(service.verify(phone, 'LOGIN' as any, code)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an expired code', async () => {
    const code = await service.issue(phone, 'LOGIN' as any);
    prisma.rows[0].expiresAt = new Date(Date.now() - 1000);
    await expect(service.verify(phone, 'LOGIN' as any, code)).rejects.toThrow(UnauthorizedException);
  });

  it('throttles repeated issuance for the same phone', async () => {
    await service.issue(phone, 'LOGIN' as any);
    await service.issue(phone, 'LOGIN' as any);
    await service.issue(phone, 'LOGIN' as any);
    await expect(service.issue(phone, 'LOGIN' as any)).rejects.toThrow(BadRequestException);
  });
});
