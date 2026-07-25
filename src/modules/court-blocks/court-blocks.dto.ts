import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CourtBlocksQueryDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}

export class CreateCourtBlockDto {
  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
