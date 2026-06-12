import { Injectable, Logger } from '@nestjs/common';

export abstract class SmsProvider {
  abstract send(phone: string, message: string): Promise<void>;
}

/**
 * Dev/mock SMS provider — logs the message (codes are still hashed at rest).
 * REQUIRES-EXTERNAL: production needs a UAE-approved SMS gateway with a
 * registered sender ID (e.g. Unifonic/Twilio). Implement as another
 * SmsProvider and switch via SMS_PROVIDER env.
 */
@Injectable()
export class MockSmsProvider extends SmsProvider {
  private readonly logger = new Logger('MockSms');

  async send(phone: string, message: string): Promise<void> {
    this.logger.log(`[DEV ONLY] SMS to ${phone}: ${message}`);
  }
}
