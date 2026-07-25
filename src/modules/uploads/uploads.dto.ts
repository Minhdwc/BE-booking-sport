import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class PresignUploadDto {
  @IsString()
  @IsIn(['avatars', 'venues', 'courts', 'payments'])
  folder: 'avatars' | 'venues' | 'courts' | 'payments';

  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
}
