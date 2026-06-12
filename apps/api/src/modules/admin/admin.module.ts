import { Module } from '@nestjs/common';
import { ServiceRequestsModule } from '../service-requests/service-requests.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [ServiceRequestsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
