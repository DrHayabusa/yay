import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CaseStatus, MediaKind, RequestType } from '@prisma/client';

export class LocationDto {
  @ApiProperty({ example: 25.2048 })
  @IsNumber()
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: 55.2708 })
  @IsNumber()
  @IsLongitude()
  lng!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;
}

export class MediaRefDto {
  @ApiProperty({ description: 'Storage key returned by POST /media/presign' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  storageKey!: string;

  @ApiProperty({ enum: MediaKind })
  @IsEnum(MediaKind)
  kind!: MediaKind;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @MaxLength(100)
  mimeType!: string;
}

const EMERGENCY_FLAGS = ['ACCIDENT', 'INJURY', 'FIRE', 'FUEL_LEAK', 'ROAD_DANGER'] as const;

export class CreateServiceRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  vehicleId!: string;

  @ApiProperty({ enum: RequestType, default: RequestType.BREAKDOWN })
  @IsOptional()
  @IsEnum(RequestType)
  type?: RequestType;

  @ApiProperty({ type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  location!: LocationDto;

  @ApiProperty({ required: false, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ description: 'Vehicle + plate photos (kind per item). Plate photo required.' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => MediaRefDto)
  media!: MediaRefDto[];

  @ApiProperty()
  @IsBoolean()
  canMove!: boolean;

  @ApiProperty()
  @IsBoolean()
  isSafeLocation!: boolean;

  @ApiProperty({ isArray: true, enum: EMERGENCY_FLAGS, required: false })
  @IsOptional()
  @IsArray()
  @IsIn(EMERGENCY_FLAGS, { each: true })
  emergencyFlags?: string[];
}

export class TransitionDto {
  @ApiProperty({ enum: CaseStatus })
  @IsEnum(CaseStatus)
  toStatus!: CaseStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @IsLatitude()
  lat?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @IsLongitude()
  lng?: number;

  @ApiProperty({ required: false, description: 'Media ids attached as evidence' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  evidenceMediaIds?: string[];

  @ApiProperty({ required: false, description: 'Handover OTP where the transition requires it' })
  @IsOptional()
  @IsString()
  @MaxLength(6)
  otp?: string;
}

export class CancelDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
