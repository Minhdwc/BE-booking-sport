import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSportDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateSportDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
}
