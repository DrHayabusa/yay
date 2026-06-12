import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';

export interface PaymentIntent {
  providerIntentId: string;
  clientSecret: string;
  status: 'requires_action' | 'pending';
}

export interface WebhookEvent {
  providerIntentId: string;
  type: 'payment.captured' | 'payment.failed' | 'refund.processed';
  failureCode?: string;
  providerRefundId?: string;
}

export abstract class PaymentProvider {
  abstract createIntent(params: {
    amountFils: number;
    currency: string;
    idempotencyKey: string;
    metadata: Record<string, string>;
  }): Promise<PaymentIntent>;
  abstract createRefund(providerIntentId: string, amountFils: number): Promise<string>;
  /** Must verify the signature against the RAW request body. Throws on mismatch. */
  abstract verifyWebhook(rawBody: Buffer, signatureHeader: string | undefined): WebhookEvent;
}

/**
 * Mock gateway for local development and tests.
 * REQUIRES-EXTERNAL: production requires a UAE-supported PSP (e.g. Stripe UAE,
 * Telr, Network International, Checkout.com), a merchant account, and legal
 * review of the funds-holding model. Implement as another PaymentProvider.
 *
 * The mock still enforces real webhook signature verification (HMAC-SHA256
 * over the raw body with PAYMENT_WEBHOOK_SECRET) so the security path is
 * exercised end-to-end in development.
 */
@Injectable()
export class MockPaymentProvider extends PaymentProvider {
  private readonly logger = new Logger('MockPayments');

  constructor(private readonly config: ConfigService) {
    super();
  }

  async createIntent(params: {
    amountFils: number;
    currency: string;
    idempotencyKey: string;
    metadata: Record<string, string>;
  }): Promise<PaymentIntent> {
    const id = `mockpi_${randomUUID()}`;
    this.logger.log(
      `[DEV ONLY] intent ${id} amount=${params.amountFils} fils ${params.currency}`,
    );
    return { providerIntentId: id, clientSecret: `${id}_secret`, status: 'pending' };
  }

  async createRefund(providerIntentId: string, amountFils: number): Promise<string> {
    this.logger.log(`[DEV ONLY] refund on ${providerIntentId} amount=${amountFils} fils`);
    return `mockre_${randomUUID()}`;
  }

  verifyWebhook(rawBody: Buffer, signatureHeader: string | undefined): WebhookEvent {
    if (!signatureHeader) throw new Error('Missing webhook signature');
    const secret = this.config.getOrThrow<string>('PAYMENT_WEBHOOK_SECRET');
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const given = Buffer.from(signatureHeader, 'utf8');
    const want = Buffer.from(expected, 'utf8');
    if (given.length !== want.length || !timingSafeEqual(given, want)) {
      throw new Error('Invalid webhook signature');
    }
    const parsed = JSON.parse(rawBody.toString('utf8'));
    if (!parsed.providerIntentId || !parsed.type) throw new Error('Malformed webhook payload');
    return parsed as WebhookEvent;
  }
}
