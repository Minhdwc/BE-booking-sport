import { Module } from '@nestjs/common';
import { UserController, AuthController } from './user.controller';
import { UserService } from './user.service';

@Module({
  controllers: [UserController, AuthController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
