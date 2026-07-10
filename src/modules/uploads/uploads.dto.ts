import { IsIn, IsNotEmpty, IsString } from 'class-validator';

const UPLOAD_FOLDERS = ['avatars', 'venues', 'fields'] as const;
const UPLOAD_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export class PresignUploadDto {
  @IsString()
  @IsIn(UPLOAD_FOLDERS)
  folder: (typeof UPLOAD_FOLDERS)[number];

  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsIn(UPLOAD_CONTENT_TYPES)
  contentType: (typeof UPLOAD_CONTENT_TYPES)[number];
}

export const ALLOWED_UPLOAD_FOLDERS = UPLOAD_FOLDERS;
export const ALLOWED_UPLOAD_MIME_TYPES = UPLOAD_CONTENT_TYPES;
