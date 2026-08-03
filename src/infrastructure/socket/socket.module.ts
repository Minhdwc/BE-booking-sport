import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@/database/prisma.module';
import { SocketGateway } from './socket.gateway';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [SocketGateway],
  exports: [SocketGateway],
})
export class SocketModule {}
