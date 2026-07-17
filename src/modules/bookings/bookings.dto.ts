import { IsDateString, IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  fieldId: string;

  @IsString()
  @IsNotEmpty()
  timeslotId: string;

  @IsDateString()
  date: string;
}

export class UpdateBookingStatusDto {
  @IsIn(['confirmed', 'completed', 'cancelled'])
  status: 'confirmed' | 'completed' | 'cancelled';
}
