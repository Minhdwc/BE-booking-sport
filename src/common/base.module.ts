// src/common/common.module.ts
import { Global, Module } from '@nestjs/common';
import { BaseService } from './base.service';

@Global()
@Module({
  providers: [BaseService],
  exports: [BaseService],
})
export class BaseModule {}
