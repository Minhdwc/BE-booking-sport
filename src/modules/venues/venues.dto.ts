import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const TIME_HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class DTOCreateVenue {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  /** Giờ mở cửa HH:mm */
  @IsString()
  @Matches(TIME_HH_MM, { message: 'openTime phải dạng HH:mm' })
  openTime: string;

  /** Giờ đóng cửa HH:mm */
  @IsString()
  @Matches(TIME_HH_MM, { message: 'closeTime phải dạng HH:mm' })
  closeTime: string;

  /** Bắt đầu nghỉ HH:mm */
  @IsOptional()
  @IsString()
  @Matches(TIME_HH_MM, { message: 'restStartTime phải dạng HH:mm' })
  restStartTime?: string;

  /** Kết thúc nghỉ HH:mm */
  @IsOptional()
  @IsString()
  @Matches(TIME_HH_MM, { message: 'restEndTime phải dạng HH:mm' })
  restEndTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  ownerId?: string;
}

export class DTOUpdateVenue {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  location?: string;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsString()
  @Matches(TIME_HH_MM, { message: 'openTime phải dạng HH:mm' })
  openTime?: string;

  @IsOptional()
  @IsString()
  @Matches(TIME_HH_MM, { message: 'closeTime phải dạng HH:mm' })
  closeTime?: string;

  @IsOptional()
  @IsString()
  @Matches(TIME_HH_MM, { message: 'restStartTime phải dạng HH:mm' })
  restStartTime?: string | null;

  @IsOptional()
  @IsString()
  @Matches(TIME_HH_MM, { message: 'restEndTime phải dạng HH:mm' })
  restEndTime?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

export class DTOAddVenueOwner {
  @IsString()
  @IsNotEmpty()
  userId: string;
}
