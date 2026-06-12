import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty({ example: 'Toyota' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  make!: string;

  @ApiProperty({ example: 'Camry' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  model!: string;

  @ApiProperty({ example: 2021 })
  @IsInt()
  @Min(1980)
  @Max(new Date().getFullYear() + 1)
  year!: number;

  @ApiProperty({ required: false, example: '4T1BF1FK5HU123456' })
  @IsOptional()
  @Matches(/^[A-HJ-NPR-Z0-9]{17}$/i, { message: 'vin must be a valid 17-character VIN' })
  vin?: string;

  @ApiProperty({ example: 'Dubai' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  plateEmirate!: string;

  @ApiProperty({ example: 'A' })
  @IsString()
  @Length(1, 3)
  plateCode!: string;

  @ApiProperty({ example: '12345' })
  @Matches(/^[0-9]{1,5}$/, { message: 'plateNumber must be 1-5 digits' })
  plateNumber!: string;

  @ApiProperty({ required: false, example: '2.5L I4' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  engine?: string;

  @ApiProperty({ required: false, example: 'White' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  color?: string;
}

export class UpdateVehicleDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  engine?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  color?: string;
}
