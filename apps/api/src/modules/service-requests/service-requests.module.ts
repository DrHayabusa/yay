import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { ServiceRequestsController } from './service-requests.controller';
import { ServiceRequestsService } from './service-requests.service';
import { PricingService } from './pricing.service';

@Module({
  imports: [MediaModule],
  controllers: [ServiceRequestsController],
  providers: [ServiceRequestsService, PricingService],
  exports: [ServiceRequestsService, PricingService],
})
export class ServiceRequestsModule {}
