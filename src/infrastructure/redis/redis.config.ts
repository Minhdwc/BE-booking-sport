import { ConfigService } from '@nestjs/config';
import type { RedisOptions } from 'ioredis';

/** Strip accidental protocol/path from REDIS_HOST (e.g. https://xxx.upstash.io). */
function normalizeRedisHost(raw: string): string {
  return raw
    .trim()
    .replace(/^rediss?:\/\//, '')
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0];
}

export function getRedisOptions(config: ConfigService): RedisOptions {
  const host = normalizeRedisHost(config.get<string>('REDIS_HOST', 'localhost') ?? 'localhost');
  const port = Number(config.get('REDIS_PORT', 6379));
  const password = config.get<string>('REDIS_PASSWORD') || undefined;
  const useTls = config.get<string>('REDIS_TLS') === 'true';

  return {
    host,
    port,
    password,
    ...(useTls ? { tls: {} } : {}),
  };
}
