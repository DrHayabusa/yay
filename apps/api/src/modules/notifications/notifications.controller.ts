import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('me/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('limit') limit?: string) {
    return this.notifications.listForUser(user.userId, limit ? Number(limit) : undefined);
  }

  @Post(':id/read')
  async markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.notifications.markRead(user.userId, id);
    return { ok: true };
  }
}
