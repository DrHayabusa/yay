import { Global, Module } from '@nestjs/common';
import { SmsProvider, MockSmsProvider } from './sms.provider';
import { PaymentProvider, MockPaymentProvider } from './payment.provider';
import { StorageProvider } from './storage.provider';
import { GeoProvider, HaversineGeoProvider } from './geo.provider';
import { PushProvider, MockPushProvider } from './push.provider';

/**
 * Every external service sits behind an abstract provider so production
 * adapters (Twilio/Unifonic, Stripe/Telr, Google Maps, FCM) can be swapped in
 * via env without touching business logic.
 */
@Global()
@Module({
  providers: [
    { provide: SmsProvider, useClass: MockSmsProvider },
    { provide: PaymentProvider, useClass: MockPaymentProvider },
    { provide: GeoProvider, useClass: HaversineGeoProvider },
    { provide: PushProvider, useClass: MockPushProvider },
    StorageProvider,
  ],
  exports: [SmsProvider, PaymentProvider, GeoProvider, PushProvider, StorageProvider],
})
export class ProvidersModule {}
