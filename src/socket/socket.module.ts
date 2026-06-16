// src/socket/socket.module.ts
import { Global, Module } from '@nestjs/common'
import { SocketGateway } from './socket.service'

@Global()
@Module({
  providers: [SocketGateway],
  exports: [SocketGateway],
})
export class SocketModule {}