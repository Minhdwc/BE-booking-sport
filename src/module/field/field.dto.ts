import { IsIn, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateFieldDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsInt()
  price!: number;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'maintenance'])
  status?: 'active' | 'inactive' | 'maintenance';

  @IsUUID()
  sportId!: string;

  @IsUUID()
  venueId!: string;
}

export class UpdateFieldDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsInt()
  price?: number;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'maintenance'])
  status?: 'active' | 'inactive' | 'maintenance';

  @IsOptional()
  @IsUUID()
  sportId?: string;

  @IsOptional()
  @IsUUID()
  venueId?: string;
}
