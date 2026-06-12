import { Module } from '@nestjs/common';
import { ServiceRequestsModule } from '../service-requests/service-requests.module';
import { RecoveryController } from './recovery.controller';
import { RecoveryService } from './recovery.service';

@Module({
  imports: [ServiceRequestsModule],
  controllers: [RecoveryController],
  providers: [RecoveryService],
  exports: [RecoveryService],
})
export class RecoveryModule {}
