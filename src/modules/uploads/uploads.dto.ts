import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class PresignUploadDto {
  @IsString()
  @IsIn(['avatars', 'venues', 'fields', 'payments'])
  folder: 'avatars' | 'venues' | 'fields' | 'payments';

  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
}
