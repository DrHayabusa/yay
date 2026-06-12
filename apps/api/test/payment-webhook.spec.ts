import { createHmac } from 'crypto';
import { MockPaymentProvider } from '../src/infra/providers/payment.provider';

const SECRET = 'test-webhook-secret';
const configMock = {
  getOrThrow: (key: string) => {
    if (key === 'PAYMENT_WEBHOOK_SECRET') return SECRET;
    throw new Error(`unexpected key ${key}`);
  },
} as any;

function sign(body: string): string {
  return createHmac('sha256', SECRET).update(body).digest('hex');
}

describe('Payment webhook signature verification', () => {
  const provider = new MockPaymentProvider(configMock);
  const payload = JSON.stringify({ providerIntentId: 'mockpi_1', type: 'payment.captured' });

  it('accepts a correctly signed payload', () => {
    const event = provider.verifyWebhook(Buffer.from(payload), sign(payload));
    expect(event.providerIntentId).toBe('mockpi_1');
    expect(event.type).toBe('payment.captured');
  });

  it('rejects a missing signature', () => {
    expect(() => provider.verifyWebhook(Buffer.from(payload), undefined)).toThrow();
  });

  it('rejects a tampered body', () => {
    const tampered = payload.replace('mockpi_1', 'mockpi_2');
    expect(() => provider.verifyWebhook(Buffer.from(tampered), sign(payload))).toThrow();
  });

  it('rejects a signature from the wrong secret', () => {
    const bad = createHmac('sha256', 'wrong-secret').update(payload).digest('hex');
    expect(() => provider.verifyWebhook(Buffer.from(payload), bad)).toThrow();
  });

  it('rejects malformed payloads even when correctly signed', () => {
    const junk = JSON.stringify({ hello: 'world' });
    expect(() => provider.verifyWebhook(Buffer.from(junk), sign(junk))).toThrow();
  });
});
