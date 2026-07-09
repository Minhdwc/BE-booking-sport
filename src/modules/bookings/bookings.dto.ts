import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';

const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];

export class CreateBookingDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  fieldId: string;

  @IsUUID()
  timeslotId: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsIn(BOOKING_STATUSES)
  status?: string;
}

export class UpdateBookingDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  fieldId?: string;

  @IsOptional()
  @IsUUID()
  timeslotId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsIn(BOOKING_STATUSES)
  status?: string;
}
