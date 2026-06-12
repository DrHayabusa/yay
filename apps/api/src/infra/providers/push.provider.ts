import { Injectable, Logger } from '@nestjs/common';

export abstract class PushProvider {
  abstract send(userId: string, messageCode: string, params?: Record<string, unknown>): Promise<void>;
}

/**
 * REQUIRES-EXTERNAL: production push uses Firebase Cloud Messaging — needs an
 * FCM project + device token registration. Implement as FcmPushProvider.
 */
@Injectable()
export class MockPushProvider extends PushProvider {
  private readonly logger = new Logger('MockPush');

  async send(userId: string, messageCode: string, params?: Record<string, unknown>): Promise<void> {
    this.logger.log(`[DEV ONLY] push to ${userId}: ${messageCode} ${JSON.stringify(params ?? {})}`);
  }
}
