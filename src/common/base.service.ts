// src/common/base.service.ts
import { Injectable } from '@nestjs/common'
import { SocketGateway } from '../socket/socket.service'
import { RedisService } from '../redis/redis.service'

@Injectable()
export class BaseService {
  constructor(
    protected readonly socket: SocketGateway,
    protected readonly redis: RedisService,
  ) {}
}