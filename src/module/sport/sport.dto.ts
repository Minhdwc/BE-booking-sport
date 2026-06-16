import { IsOptional, IsString } from 'class-validator';

export class CreateSportDto {
  @IsString()
  name!: string;
}

export class UpdateSportDto {
  @IsOptional()
  @IsString()
  name?: string;
}
