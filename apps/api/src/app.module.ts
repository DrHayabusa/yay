import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './infra/prisma/prisma.module';
import { ProvidersModule } from './infra/providers/providers.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { UsersModule } from './modules/users/users.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { MediaModule } from './modules/media/media.module';
import { ServiceRequestsModule } from './modules/service-requests/service-requests.module';
import { RecoveryModule } from './modules/recovery/recovery.module';
import { GarageModule } from './modules/garage/garage.module';
import { QuotationsModule } from './modules/quotations/quotations.module';
import { PartsModule } from './modules/parts/parts.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Global rate limit: 100 requests / minute / IP. Sensitive endpoints
    // (OTP, payments) apply stricter local limits.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    ProvidersModule,
    AuditModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    VehiclesModule,
    MediaModule,
    ServiceRequestsModule,
    RecoveryModule,
    GarageModule,
    QuotationsModule,
    PartsModule,
    PaymentsModule,
    AdminModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(requestIdMiddleware).forRoutes('*path');
  }
}
