import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CloudFrontService {
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('AWS_CLOUDFRONT_URL', '');
  }

  getUrl(key: string): string {
    if (!this.baseUrl) return key;
    return `${this.baseUrl}/${key}`;
  }

  getUrls(keys: string[]): string[] {
    return keys.map((key) => this.getUrl(key));
  }
}
