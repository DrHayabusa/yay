import { Body, Controller, Get, HttpCode, Ip, Param, Post, Headers } from '@nestjs/common';
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
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { QuotationItemType, Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { QuotationsService } from './quotations.service';

class QuotationItemDto {
  @IsEnum(QuotationItemType)
  type!: QuotationItemType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  plainLanguageSummary?: string;

  @IsOptional()
  @IsString()
  repairItemId?: string;

  @IsOptional()
  @IsBoolean()
  requiresPart?: boolean;

  @IsInt()
  @Min(1)
  @Max(100)
  quantity!: number;

  @Matches(/^\d{1,10}(\.\d{1,2})?$/, { message: 'unitPrice must be a decimal string like "350.00"' })
  unitPrice!: string;
}

class CreateQuotationDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  items!: QuotationItemDto[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  estimatedCompletionHours?: number;
}

@ApiTags('quotations')
@ApiBearerAuth()
@Controller()
export class QuotationsController {
  constructor(private readonly quotations: QuotationsService) {}

  @Post('service-requests/:id/quotation')
  @Roles(Role.GARAGE_MANAGER)
  createDraft(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateQuotationDto,
  ) {
    return this.quotations.createDraft(user.userId, id, dto.items, dto.estimatedCompletionHours);
  }

  @Post('quotations/:id/publish')
  @Roles(Role.GARAGE_MANAGER)
  @HttpCode(200)
  publish(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.quotations.publish(user.userId, id);
  }

  @Get('service-requests/:id/quotation')
  @Roles(Role.CUSTOMER)
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.quotations.getForCustomer(user.userId, id);
  }

  @Post('quotation-items/:itemId/approve')
  @Roles(Role.CUSTOMER)
  @HttpCode(200)
  approve(
    @CurrentUser() user: AuthUser,
    @Param('itemId') itemId: string,
    @Ip() ip: string,
    @Headers('user-agent') ua?: string,
  ) {
    return this.quotations.decideItem(user.userId, itemId, 'APPROVED', { ip, device: ua });
  }

  @Post('quotation-items/:itemId/reject')
  @Roles(Role.CUSTOMER)
  @HttpCode(200)
  reject(
    @CurrentUser() user: AuthUser,
    @Param('itemId') itemId: string,
    @Ip() ip: string,
    @Headers('user-agent') ua?: string,
  ) {
    return this.quotations.decideItem(user.userId, itemId, 'REJECTED', { ip, device: ua });
  }

  @Post('quotations/:id/finalize')
  @Roles(Role.CUSTOMER)
  @HttpCode(200)
  finalize(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.quotations.finalize(user.userId, id);
  }
}
