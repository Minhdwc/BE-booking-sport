import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import { CloudFrontService } from '@/infrastructure/aws/cloudfront.service';
import { S3Service } from '@/infrastructure/aws/s3.service';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { ALLOWED_UPLOAD_FOLDERS, ALLOWED_UPLOAD_MIME_TYPES, PresignUploadDto } from './uploads.dto';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Injectable()
export class UploadsService {
  constructor(
    private readonly s3Service: S3Service,
    private readonly cloudFrontService: CloudFrontService,
  ) {}

  async upload(file: Express.Multer.File | undefined, folder: string, user: JwtPayloadReturn) {
    if (!file) {
      throw new BadRequestException('File không tồn tại');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new PayloadTooLargeException('File không được vượt quá 5MB');
    }

    if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.mimetype as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number])) {
      throw new BadRequestException('Chỉ chấp nhận file ảnh JPEG, PNG hoặc WebP');
    }

    if (!ALLOWED_UPLOAD_FOLDERS.includes(folder as (typeof ALLOWED_UPLOAD_FOLDERS)[number])) {
      throw new BadRequestException('Thư mục upload không hợp lệ');
    }

    if (user.role === 'user' && folder !== 'avatars') {
      throw new ForbiddenException('Bạn chỉ được upload ảnh đại diện');
    }

    if (
      (user.role === 'staff' || user.role === 'super_staff') &&
      !['avatars', 'venues', 'fields'].includes(folder)
    ) {
      throw new ForbiddenException('Thư mục upload không hợp lệ');
    }

    const uploadFolder = folder === 'avatars' ? `avatars/${user.id}` : folder;
    const result = await this.s3Service.upload(file, uploadFolder);

    return {
      key: result.key,
      url: this.cloudFrontService.getUrl(result.key) || result.url,
    };
  }

  async createPresignedUrl(dto: PresignUploadDto, user: JwtPayloadReturn) {
    if (user.role === 'user' && dto.folder !== 'avatars') {
      throw new ForbiddenException('Bạn chỉ được upload ảnh đại diện');
    }

    const uploadFolder = dto.folder === 'avatars' ? `avatars/${user.id}` : dto.folder;
    const key = this.s3Service.generateKey(uploadFolder, dto.filename);
    const uploadUrl = await this.s3Service.getPresignedUploadUrl(key, dto.contentType);

    return {
      key,
      uploadUrl,
      url: this.cloudFrontService.getUrl(key) || this.s3Service.getPublicUrl(key),
    };
  }
}
