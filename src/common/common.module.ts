import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt.guard';
import { RolesGuard } from './guards/role.guard';

@Global()
@Module({
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }, RolesGuard],
  exports: [RolesGuard],
})
export class CommonModule {}
