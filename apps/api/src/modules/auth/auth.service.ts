import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OtpPurpose, Role, User } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { SmsProvider } from '../../infra/providers/sms.provider';
import { AuditService } from '../audit/audit.service';
import { OtpService } from './otp.service';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly otp: OtpService,
    private readonly sms: SmsProvider,
    private readonly audit: AuditService,
  ) {}

  async requestOtp(phone: string): Promise<void> {
    const code = await this.otp.issue(phone, OtpPurpose.LOGIN);
    await this.sms.send(phone, `Your Sanad verification code is ${code}. Valid for 5 minutes.`);
  }

  /**
   * Verifies the OTP. Creates the account on first login (fullName required),
   * then issues an access/refresh token pair.
   */
  async verifyOtp(
    phone: string,
    code: string,
    fullName?: string,
    language?: string,
  ): Promise<TokenPair & { isNewUser: boolean }> {
    await this.otp.verify(phone, OtpPurpose.LOGIN, code);

    let user = await this.prisma.user.findUnique({ where: { phone }, include: { roles: true } });
    let isNewUser = false;

    if (user?.deletedAt || user?.isActive === false) {
      throw new UnauthorizedException({
        error: 'FORBIDDEN',
        message: 'This account is not active. Please contact support.',
      });
    }

    if (!user) {
      if (!fullName) {
        throw new UnauthorizedException({
          error: 'VALIDATION_FAILED',
          message: 'fullName is required to create a new account',
        });
      }
      user = await this.prisma.user.create({
        data: {
          phone,
          fullName,
          language: language ?? 'en',
          roles: { create: [{ role: Role.CUSTOMER }] },
          customerProfile: { create: {} },
        },
        include: { roles: true },
      });
      isNewUser = true;
      await this.audit.record({
        actorUserId: user.id,
        action: 'USER_REGISTERED',
        entityType: 'User',
        entityId: user.id,
      });
    }

    const tokens = await this.issueTokens(user, user.roles.map((r) => r.role));
    return { ...tokens, isNewUser };
  }

  /**
   * Refresh-token rotation with reuse detection: each refresh invalidates the
   * presented token and issues a new one in the same family. Presenting an
   * already-revoked token revokes the entire family (stolen-token defence).
   */
  async refresh(refreshToken: string): Promise<TokenPair> {
    const tokenHash = sha256(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { roles: true } } },
    });

    if (!stored) {
      throw new UnauthorizedException({ error: 'UNAUTHENTICATED', message: 'Invalid refresh token' });
    }
    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit.record({
        actorUserId: stored.userId,
        action: 'REFRESH_TOKEN_REUSE_DETECTED',
        entityType: 'RefreshToken',
        entityId: stored.id,
      });
      throw new UnauthorizedException({ error: 'UNAUTHENTICATED', message: 'Token reuse detected' });
    }
    if (stored.expiresAt < new Date() || !stored.user.isActive || stored.user.deletedAt) {
      throw new UnauthorizedException({ error: 'UNAUTHENTICATED', message: 'Refresh token expired' });
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(
      stored.user,
      stored.user.roles.map((r) => r.role),
      stored.familyId,
    );
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    const tokenHash = sha256(refreshToken);
    // Scoped by userId: a user can only revoke their own session (IDOR-safe).
    const stored = await this.prisma.refreshToken.findFirst({ where: { tokenHash, userId } });
    if (stored) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }

  private async issueTokens(user: User, roles: Role[], familyId?: string): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, phone: user.phone, roles },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: Number(this.config.get('JWT_ACCESS_TTL', 900)),
      },
    );

    const refreshToken = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        familyId: familyId ?? randomUUID(),
        expiresAt: new Date(Date.now() + Number(this.config.get('JWT_REFRESH_TTL', 2_592_000)) * 1000),
      },
    });

    return { accessToken, refreshToken };
  }
}
