import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSupportTicketDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsUUID()
  bookingId?: string;
}

export class UpdateSupportTicketDto {
  @IsOptional()
  @IsIn(['open', 'in_progress', 'resolved'])
  status?: 'open' | 'in_progress' | 'resolved';

  @IsOptional()
  @IsString()
  adminNote?: string;
}
