import { Module } from '@nestjs/common';
import { ServiceRequestsModule } from '../service-requests/service-requests.module';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';

@Module({
  imports: [ServiceRequestsModule],
  controllers: [QuotationsController],
  providers: [QuotationsService],
  exports: [QuotationsService],
})
export class QuotationsModule {}
