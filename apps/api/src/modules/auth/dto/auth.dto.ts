import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

const UAE_PHONE = /^\+971[0-9]{8,9}$/;

export class RequestOtpDto {
  @ApiProperty({ example: '+971501234567' })
  @Matches(UAE_PHONE, { message: 'phone must be a UAE number in E.164 format (+971...)' })
  phone!: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+971501234567' })
  @Matches(UAE_PHONE, { message: 'phone must be a UAE number in E.164 format (+971...)' })
  phone!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code!: string;

  /** Required only on first login (account creation). */
  @ApiProperty({ required: false, example: 'Ahmed Al Maktoum' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName?: string;

  @ApiProperty({ required: false, enum: ['en', 'ar'] })
  @IsOptional()
  @IsIn(['en', 'ar'])
  language?: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
