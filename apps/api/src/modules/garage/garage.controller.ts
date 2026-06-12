import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { FindingSeverity, Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { GarageService } from './garage.service';

class RepairItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;

  @Matches(/^\d{1,4}(\.\d{1,2})?$/, { message: 'labourHours must be a decimal like "1.50"' })
  labourHours!: string;

  @IsBoolean()
  requiresPart!: boolean;
}

class AddFindingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  technicalDetail!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  plainLanguageSummary!: string;

  @IsEnum(FindingSeverity)
  severity!: FindingSeverity;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  evidenceMediaIds!: string[];

  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => RepairItemDto)
  repairItems!: RepairItemDto[];
}

class SubmitInspectionDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  odometerKm?: number;

  @IsOptional()
  @IsObject()
  checklist?: Record<string, unknown>;
}

@ApiTags('garage')
@ApiBearerAuth()
@Controller('garage')
export class GarageController {
  constructor(private readonly garage: GarageService) {}

  @Get('queue')
  @Roles(Role.GARAGE_TECHNICIAN, Role.GARAGE_MANAGER)
  queue(@CurrentUser() user: AuthUser) {
    return this.garage.queue(user.userId);
  }

  @Post('cases/:id/inspection')
  @Roles(Role.GARAGE_TECHNICIAN, Role.GARAGE_MANAGER)
  start(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.garage.startInspection(user.userId, id);
  }

  @Post('inspections/:id/findings')
  @Roles(Role.GARAGE_TECHNICIAN, Role.GARAGE_MANAGER)
  addFinding(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AddFindingDto) {
    return this.garage.addFinding(user.userId, id, dto);
  }

  @Post('inspections/:id/submit')
  @Roles(Role.GARAGE_MANAGER)
  @HttpCode(200)
  submit(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SubmitInspectionDto) {
    return this.garage.submitInspection(user.userId, id, dto.odometerKm, dto.checklist);
  }
}
