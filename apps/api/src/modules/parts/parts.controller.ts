import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsNotEmpty, IsString } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PartsService } from './parts.service';

class SelectPartDto {
  @IsString()
  @IsNotEmpty()
  inventoryId!: string;
}

@ApiTags('parts')
@ApiBearerAuth()
@Controller()
export class PartsController {
  constructor(private readonly parts: PartsService) {}

  @Get('parts/search')
  search(
    @Query('vin') vin?: string,
    @Query('make') make?: string,
    @Query('model') model?: string,
    @Query('year') year?: string,
    @Query('engine') engine?: string,
    @Query('partNumber') partNumber?: string,
    @Query('category') category?: string,
  ) {
    return this.parts.search({
      vin,
      make,
      model,
      year: year ? Number(year) : undefined,
      engine,
      partNumber,
      category,
    });
  }

  @Get('quotation-items/:id/part-options')
  @Roles(Role.CUSTOMER)
  options(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.parts.optionsForItem(user.userId, id);
  }

  @Post('quotation-items/:id/select-part')
  @Roles(Role.CUSTOMER)
  @HttpCode(200)
  select(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SelectPartDto) {
    return this.parts.selectPart(user.userId, id, dto.inventoryId);
  }

  @Post('service-requests/:id/part-orders')
  @Roles(Role.CUSTOMER)
  createOrders(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.parts.createOrders(user.userId, id);
  }

  @Post('part-orders/:id/confirm-compatibility')
  @Roles(Role.GARAGE_TECHNICIAN, Role.GARAGE_MANAGER, Role.ADMIN)
  @HttpCode(200)
  confirmCompatibility(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.parts.confirmCompatibility(user, id);
  }

  @Get('supplier/orders')
  @Roles(Role.SUPPLIER)
  supplierOrders(@CurrentUser() user: AuthUser) {
    return this.parts.supplierOrders(user.userId);
  }

  @Post('part-orders/:id/dispatch')
  @Roles(Role.SUPPLIER)
  @HttpCode(200)
  dispatch(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.parts.dispatch(user.userId, id);
  }

  @Post('part-orders/:id/confirm-delivery')
  @Roles(Role.GARAGE_TECHNICIAN, Role.GARAGE_MANAGER)
  @HttpCode(200)
  confirmDelivery(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.parts.confirmDelivery(user.userId, id);
  }
}
