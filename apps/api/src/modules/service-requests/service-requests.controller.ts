import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { ServiceRequestsService } from './service-requests.service';
import { CancelDto, CreateServiceRequestDto, TransitionDto } from './dto/service-request.dto';

@ApiTags('service-requests')
@ApiBearerAuth()
@Controller('service-requests')
export class ServiceRequestsController {
  constructor(private readonly cases: ServiceRequestsService) {}

  @Post()
  @Roles(Role.CUSTOMER)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateServiceRequestDto) {
    return this.cases.create(user, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.cases.listForActor(user, limit ? Number(limit) : undefined, cursor);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cases.getForActor(user, id);
  }

  @Get(':id/timeline')
  timeline(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cases.timeline(user, id);
  }

  @Post(':id/transition')
  @HttpCode(200)
  transition(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: TransitionDto) {
    return this.cases.transition(user, id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CancelDto) {
    return this.cases.transition(user, id, { toStatus: 'CANCELLED', notes: dto.reason });
  }
}
