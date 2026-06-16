import { IsOptional, IsString } from 'class-validator';

export class CreateTimeslotDto {
  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;
}

export class UpdateTimeslotDto {
  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;
}
