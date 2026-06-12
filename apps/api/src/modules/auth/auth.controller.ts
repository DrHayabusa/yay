import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { RefreshDto, RequestOtpDto, VerifyOtpDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('otp/request')
  @HttpCode(200)
  async requestOtp(@Body() dto: RequestOtpDto) {
    await this.auth.requestOtp(dto.phone);
    // Same response whether or not an account exists — no user enumeration.
    return { ok: true, message: 'If the number is valid, a code has been sent.' };
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('otp/verify')
  @HttpCode(200)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.phone, dto.code, dto.fullName, dto.language);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@CurrentUser() user: AuthUser, @Body() dto: RefreshDto) {
    await this.auth.logout(user.userId, dto.refreshToken);
    return { ok: true };
  }
}
