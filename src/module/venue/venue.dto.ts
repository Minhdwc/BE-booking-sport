import { IsOptional, IsString } from 'class-validator';

export class CreateVenueDto {
  @IsString()
  name!: string;

  @IsString()
  location!: string;

  @IsOptional()
  @IsString()
  description?: string | null;
}

export class UpdateVenueDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  description?: string | null;
}
