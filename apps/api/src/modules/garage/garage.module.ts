import { Module } from '@nestjs/common';
import { ServiceRequestsModule } from '../service-requests/service-requests.module';
import { GarageController } from './garage.controller';
import { GarageService } from './garage.service';

@Module({
  imports: [ServiceRequestsModule],
  controllers: [GarageController],
  providers: [GarageService],
  exports: [GarageService],
})
export class GarageModule {}
