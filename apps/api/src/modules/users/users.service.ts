import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        phone: true,
        email: true,
        fullName: true,
        language: true,
        createdAt: true,
        roles: { select: { role: true } },
      },
    });
    if (!user) throw new NotFoundException({ error: 'NOT_FOUND', message: 'User not found' });
    return { ...user, roles: user.roles.map((r) => r.role) };
  }

  async updateMe(userId: string, data: { fullName?: string; email?: string; language?: string }) {
    await this.prisma.user.update({ where: { id: userId }, data });
    return this.getMe(userId);
  }

  /**
   * Privacy/account-deletion workflow (UAE PDPL): soft-deletes and anonymises
   * the account immediately; financial/audit records are retained as required
   * by law and detached from direct identifiers by the retention job.
   */
  async requestDeletion(userId: string): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          deletedAt: now,
          isActive: false,
          phone: `deleted:${userId}`,
          email: null,
          fullName: 'Deleted user',
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
    await this.audit.record({
      actorUserId: userId,
      action: 'ACCOUNT_DELETION_REQUESTED',
      entityType: 'User',
      entityId: userId,
    });
  }
}
