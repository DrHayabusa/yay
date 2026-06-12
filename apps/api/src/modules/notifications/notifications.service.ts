import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PushProvider } from '../../infra/providers/push.provider';

/**
 * Persists in-app notifications and fans out to push (FCM in production).
 * messageCode is localised on the client (en/ar) — the API never sends
 * hardcoded display strings.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('Notifications');

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushProvider,
  ) {}

  async notify(
    userId: string,
    messageCode: string,
    params?: Record<string, unknown>,
    channels: NotificationChannel[] = [NotificationChannel.IN_APP, NotificationChannel.PUSH],
  ): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          userId,
          messageCode,
          params: params as Prisma.InputJsonValue,
          channels,
          sentAt: new Date(),
        },
      });
      if (channels.includes(NotificationChannel.PUSH)) {
        await this.push.send(userId, messageCode, params);
      }
    } catch {
      // Notifications must never break the main flow.
      this.logger.error(`Failed to notify user ${userId} (${messageCode})`);
    }
  }

  async listForUser(userId: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });
  }

  async markRead(userId: string, id: string): Promise<void> {
    // updateMany scoped by userId: a user can only touch their own rows (IDOR-safe).
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  }
}
