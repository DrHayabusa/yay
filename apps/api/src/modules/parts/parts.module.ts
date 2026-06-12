import { Module } from '@nestjs/common';
import { ServiceRequestsModule } from '../service-requests/service-requests.module';
import { PartsController } from './parts.controller';
import { PartsService } from './parts.service';

@Module({
  imports: [ServiceRequestsModule],
  controllers: [PartsController],
  providers: [PartsService],
  exports: [PartsService],
})
export class PartsModule {}
