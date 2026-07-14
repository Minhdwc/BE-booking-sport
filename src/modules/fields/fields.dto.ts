import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class FieldAvailabilityQueryDto {
  @IsDateString()
  date: string;
}

export class CreateFieldDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsInt()
  @Min(0)
  price: number;

  @IsInt()
  @Min(15)
  minDurationMinutes: number;

  @IsInt()
  @Min(15)
  durationStepMinutes: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsUUID()
  sportId: string;

  @IsUUID()
  venueId: string;
}

export class UpdateFieldDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(15)
  minDurationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(15)
  durationStepMinutes?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsUUID()
  sportId?: string;

  @IsOptional()
  @IsUUID()
  venueId?: string;
}
