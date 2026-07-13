import { Injectable } from '@nestjs/common';
import { RedisService } from '@/infrastructure/redis/redis.service';
import { HealthRepository } from './health.repository';

@Injectable()
export class HealthService {
  constructor(
    private readonly healthRepository: HealthRepository,
    private readonly redis: RedisService,
  ) {}

  async check() {
    const checks: { database: string; redis: string } = {
      database: 'down',
      redis: 'down',
    };

    try {
      await this.healthRepository.checkDatabase();
      checks.database = 'up';
    } catch {
      checks.database = 'down';
    }

    try {
      const client = this.redis.getClient();
      if (client.status !== 'ready') {
        await client.connect();
      }
      const pong = await client.ping();
      checks.redis = pong === 'PONG' ? 'up' : 'down';
    } catch {
      checks.redis = 'down';
    }

    const ok = checks.database === 'up' && checks.redis === 'up';

    return {
      status: ok ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
