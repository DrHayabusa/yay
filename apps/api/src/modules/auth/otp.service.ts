import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpPurpose } from '@prisma/client';
import { createHash, randomInt } from 'crypto';
import { PrismaService } from '../../infra/prisma/prisma.service';

export function hashOtp(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

/**
 * OTP lifecycle: 6-digit codes, hashed at rest, configurable TTL, hard
 * attempt limit, single use, and per-phone issue throttling.
 */
@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private ttlSeconds(): number {
    return Number(this.config.get('OTP_TTL_SECONDS', 300));
  }

  private maxAttempts(): number {
    return Number(this.config.get('OTP_MAX_ATTEMPTS', 5));
  }

  /** Issues a code and returns the PLAINTEXT code for delivery via SMS only. */
  async issue(phone: string, purpose: OtpPurpose, userId?: string): Promise<string> {
    const oneMinuteAgo = new Date(Date.now() - 60_000);
    const recent = await this.prisma.otpCode.count({
      where: { phone, purpose, createdAt: { gt: oneMinuteAgo } },
    });
    if (recent >= 3) {
      throw new BadRequestException({
        error: 'RATE_LIMITED',
        message: 'Too many codes requested. Please wait a minute and try again.',
      });
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.prisma.otpCode.create({
      data: {
        phone,
        userId,
        purpose,
        codeHash: hashOtp(code),
        expiresAt: new Date(Date.now() + this.ttlSeconds() * 1000),
      },
    });
    return code;
  }

  /** Verifies and consumes the latest active code. Throws on failure. */
  async verify(phone: string, purpose: OtpPurpose, code: string): Promise<void> {
    const otp = await this.prisma.otpCode.findFirst({
      where: { phone, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp || otp.expiresAt < new Date()) {
      throw new UnauthorizedException({
        error: 'OTP_EXPIRED',
        message: 'The code has expired. Please request a new one.',
      });
    }
    if (otp.attempts >= this.maxAttempts()) {
      throw new UnauthorizedException({
        error: 'OTP_INVALID',
        message: 'Too many incorrect attempts. Please request a new code.',
      });
    }

    if (otp.codeHash !== hashOtp(code)) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException({
        error: 'OTP_INVALID',
        message: 'Incorrect code. Please try again.',
      });
    }

    // Single use: consume atomically; a concurrent verify of the same row loses.
    const consumed = await this.prisma.otpCode.updateMany({
      where: { id: otp.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count === 0) {
      throw new UnauthorizedException({
        error: 'OTP_INVALID',
        message: 'This code has already been used.',
      });
    }
  }
}
