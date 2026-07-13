import { IsDateString, IsIn, IsUUID } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  fieldId: string;

  @IsUUID()
  timeslotId: string;

  @IsDateString()
  date: string;
}

export class UpdateBookingStatusDto {
  @IsIn(['confirmed', 'completed', 'cancelled'])
  status: 'confirmed' | 'completed' | 'cancelled';
}
