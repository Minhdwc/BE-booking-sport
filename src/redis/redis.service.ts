// src/redis/redis.service.ts
import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async get(key: string) {
    return this.redis.get(key)
  }

  async set(key: string, value: string, ttl?: number) {
    if (ttl !== undefined) {
      if (ttl <= 0) {
        throw new Error('TTL must be greater than 0')
      }
      return this.redis.setex(key, ttl, value)
    }
    return this.redis.set(key, value)
  }

  async del(key: string) {
    return this.redis.del(key)
  }

  async onModuleDestroy() {
    await this.redis.quit()
  }
}