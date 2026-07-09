import { Global, Module } from '@nestjs/common';
import { CloudFrontService } from './cloudfront.service';
import { S3Service } from './s3.service';

@Global()
@Module({
  providers: [S3Service, CloudFrontService],
  exports: [S3Service, CloudFrontService],
})
export class AwsModule {}
