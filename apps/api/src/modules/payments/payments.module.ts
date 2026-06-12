import { Module } from '@nestjs/common';
import { ServiceRequestsModule } from '../service-requests/service-requests.module';
import { PartsModule } from '../parts/parts.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [ServiceRequestsModule, PartsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
