import { Body, Controller, Delete, Get, HttpCode, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';

class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsIn(['en', 'ar'])
  language?: string;
}

@ApiTags('users')
@ApiBearerAuth()
@Controller('me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  me(@CurrentUser() user: AuthUser) {
    return this.users.getMe(user.userId);
  }

  @Patch()
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return this.users.updateMe(user.userId, dto);
  }

  @Delete()
  @HttpCode(200)
  async remove(@CurrentUser() user: AuthUser) {
    await this.users.requestDeletion(user.userId);
    return { ok: true, message: 'Account deletion processed.' };
  }
}
