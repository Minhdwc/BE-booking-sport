import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreatePriceRuleDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  dayOfWeek: number[];

  @IsString()
  @IsNotEmpty()
  timeFrom: string;

  @IsString()
  @IsNotEmpty()
  timeTo: string;

  @IsOptional()
  @IsBoolean()
  isPeak?: boolean;

  @IsInt()
  @Min(0)
  priceVnd: number;
}

export class UpdatePriceRuleDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  dayOfWeek?: number[];

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  timeFrom?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  timeTo?: string;

  @IsOptional()
  @IsBoolean()
  isPeak?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceVnd?: number;
}
