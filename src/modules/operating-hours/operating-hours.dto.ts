import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class OperatingHourItemDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  @IsNotEmpty()
  openTime: string;

  @IsString()
  @IsNotEmpty()
  closeTime: string;
}
