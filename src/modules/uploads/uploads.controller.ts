import {
  Body,
  Controller,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { PresignUploadDto } from './uploads.dto';
import { UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder: string,
    @CurrentUser() user: JwtPayloadReturn,
  ) {
    return this.uploadsService.upload(file, folder || 'avatars', user);
  }

  @Post('presign')
  presign(@Body() presignUploadDto: PresignUploadDto, @CurrentUser() user: JwtPayloadReturn) {
    return this.uploadsService.createPresignedUrl(presignUploadDto, user);
  }
}
