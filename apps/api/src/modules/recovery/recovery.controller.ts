import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsBoolean, IsLatitude, IsLongitude, IsNumber } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { RecoveryService } from './recovery.service';
import { ServiceRequestsService } from '../service-requests/service-requests.service';

class AvailabilityDto {
  @IsBoolean()
  isAvailable!: boolean;
}

class PingDto {
  @IsNumber()
  @IsLatitude()
  lat!: number;

  @IsNumber()
  @IsLongitude()
  lng!: number;
}

@ApiTags('recovery')
@ApiBearerAuth()
@Controller('recovery')
export class RecoveryController {
  constructor(
    private readonly recovery: RecoveryService,
    private readonly cases: ServiceRequestsService,
  ) {}

  @Post('availability')
  @Roles(Role.RECOVERY_DRIVER)
  @HttpCode(200)
  availability(@CurrentUser() user: AuthUser, @Body() dto: AvailabilityDto) {
    return this.recovery.setAvailability(user.userId, dto.isAvailable);
  }

  @Get('jobs')
  @Roles(Role.RECOVERY_DRIVER)
  jobs(@CurrentUser() user: AuthUser) {
    return this.recovery.myJobs(user.userId);
  }

  @Post('jobs/:id/accept')
  @Roles(Role.RECOVERY_DRIVER)
  @HttpCode(200)
  accept(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.recovery.respond(user.userId, id, true);
  }

  @Post('jobs/:id/reject')
  @Roles(Role.RECOVERY_DRIVER)
  @HttpCode(200)
  reject(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.recovery.respond(user.userId, id, false);
  }

  @Post('cases/:id/location')
  @Roles(Role.RECOVERY_DRIVER)
  @HttpCode(200)
  ping(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: PingDto) {
    return this.recovery.ping(user.userId, id, dto.lat, dto.lng);
  }

  @Get('cases/:id/tracking')
  async tracking(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    await this.cases.getForActor(user, id); // object-level access check
    return this.recovery.tracking(id, limit ? Number(limit) : undefined);
  }
}
