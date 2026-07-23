import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

export class ReviewListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  venueId?: string;
}

export class ReviewEligibilityQueryDto {
  @IsString()
  @IsNotEmpty()
  venueId: string;
}

export class CreateReviewDto {
  @IsString()
  @IsNotEmpty()
  venueId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  comment?: string;
}

export class UpdateReviewDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  comment?: string;
}
