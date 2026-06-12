import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';

@ApiTags('vehicles')
@ApiBearerAuth()
@Roles(Role.CUSTOMER)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.vehicles.list(user.userId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateVehicleDto) {
    return this.vehicles.create(user.userId, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.vehicles.getOwned(user.userId, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehicles.update(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.vehicles.softDelete(user.userId, id);
    return { ok: true };
  }
}
