import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PaymentKind, Role } from '@prisma/client';
import { IsEnum, IsIn, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';

class CreateIntentDto {
  @IsString()
  @IsNotEmpty()
  serviceRequestId!: string;

  @IsEnum(PaymentKind)
  @IsIn([PaymentKind.RECOVERY, PaymentKind.REPAIR], {
    message: 'Only RECOVERY and REPAIR payments are supported in the MVP',
  })
  kind!: PaymentKind;
}

class RequestRefundDto {
  @IsString()
  @IsNotEmpty()
  paymentId!: string;

  @Matches(/^\d{1,10}(\.\d{1,2})?$/, { message: 'amount must be a decimal string like "100.00"' })
  amount!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

@ApiTags('payments')
@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('payments/intents')
  @ApiBearerAuth()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @Roles(Role.CUSTOMER)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  createIntent(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateIntentDto,
    @Headers('idempotency-key') idempotencyKey: string,
  ) {
    return this.payments.createIntent(user.userId, dto.serviceRequestId, dto.kind, idempotencyKey);
  }

  @Get('payments/:id')
  @ApiBearerAuth()
  @Roles(Role.CUSTOMER)
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.payments.getOwn(user.userId, id);
  }

  /** Gateway webhook — authenticated by HMAC signature, not by JWT. */
  @Public()
  @Post('payments/webhook')
  @HttpCode(200)
  webhook(@Req() req: RawBodyRequest<Request>, @Headers('x-webhook-signature') signature?: string) {
    return this.payments.handleWebhook(req.rawBody ?? Buffer.from(''), signature);
  }

  @Post('refunds')
  @ApiBearerAuth()
  @Roles(Role.CUSTOMER)
  requestRefund(@CurrentUser() user: AuthUser, @Body() dto: RequestRefundDto) {
    return this.payments.requestRefund(user.userId, dto.paymentId, dto.amount, dto.reason);
  }

  @Post('refunds/:id/approve')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @HttpCode(200)
  approveRefund(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.payments.approveRefund(user.userId, id);
  }
}
