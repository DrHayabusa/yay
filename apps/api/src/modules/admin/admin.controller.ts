import { Body, Controller, Get, HttpCode, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CaseStatus, Role, VerificationStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';

class AssignRecoveryDto {
  @IsString()
  @IsNotEmpty()
  driverId!: string;

  @IsOptional()
  @IsString()
  recoveryVehicleId?: string;
}

class AssignGarageDto {
  @IsString()
  @IsNotEmpty()
  garageId!: string;
}

class VerifyDto {
  @IsEnum(VerificationStatus)
  status!: VerificationStatus;
}

const MONEY = /^\d{1,10}(\.\d{1,2})?$/;
const RATE = /^0(\.\d{1,4})?$/;

class PricingDto {
  @IsString()
  @IsNotEmpty()
  emirate!: string;

  @Matches(MONEY)
  baseRecoveryFee!: string;

  @Matches(MONEY)
  perKmFee!: string;

  @Matches(MONEY)
  diagnosticFee!: string;

  @IsOptional()
  @Matches(RATE)
  platformFeeRate?: string;
}

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('cases')
  cases(@Query('status') status?: CaseStatus, @Query('limit') limit?: string) {
    return this.admin.listCases(status, limit ? Number(limit) : undefined);
  }

  @Get('cases/:id')
  case(@Param('id') id: string) {
    return this.admin.getCase(id);
  }

  @Get('drivers')
  drivers(@Query('available') available?: string) {
    return this.admin.listDrivers(available === 'true');
  }

  @Get('garages')
  garages(@Query('verification') verification?: VerificationStatus) {
    return this.admin.listGarages(verification);
  }

  @Get('providers')
  providers(@Query('verification') verification?: VerificationStatus) {
    return this.admin.listProviders(verification);
  }

  @Get('suppliers')
  suppliers(@Query('verification') verification?: VerificationStatus) {
    return this.admin.listSuppliers(verification);
  }

  @Get('pricing')
  pricing() {
    return this.admin.listPricing();
  }

  @Post('cases/:id/assign-recovery')
  @HttpCode(200)
  assignRecovery(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AssignRecoveryDto,
  ) {
    return this.admin.assignRecovery(user.userId, id, dto.driverId, dto.recoveryVehicleId);
  }

  @Post('cases/:id/assign-garage')
  @HttpCode(200)
  assignGarage(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AssignGarageDto) {
    return this.admin.assignGarage(user.userId, id, dto.garageId);
  }

  @Post(':entity/:id/verify')
  @HttpCode(200)
  verify(
    @CurrentUser() user: AuthUser,
    @Param('entity') entity: string,
    @Param('id') id: string,
    @Body() dto: VerifyDto,
  ) {
    if (!['provider', 'garage', 'supplier'].includes(entity)) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Unknown entity type' });
    }
    return this.admin.setVerification(user.userId, entity as 'provider' | 'garage' | 'supplier', id, dto.status);
  }

  @Post('pricing')
  upsertPricing(@CurrentUser() user: AuthUser, @Body() dto: PricingDto) {
    return this.admin.upsertPricing(user.userId, dto);
  }

  @Get('audit-logs')
  auditLogs(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.admin.auditLogs(entityType, entityId, limit ? Number(limit) : undefined);
  }
}
