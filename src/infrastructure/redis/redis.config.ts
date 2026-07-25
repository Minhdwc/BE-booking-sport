import { ConfigService } from '@nestjs/config';
import type { RedisOptions } from 'ioredis';

function normalizeRedisHost(raw: string): string {
  return raw
    .trim()
    .replace(/^rediss?:\/\//, '')
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0];
}

function parseRedisUrl(url: string): RedisOptions {
  const parsed = new URL(url.trim());
  const password = parsed.password ? decodeURIComponent(parsed.password) : undefined;
  const username = parsed.username ? decodeURIComponent(parsed.username) : undefined;

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    ...(username ? { username } : {}),
    ...(password ? { password } : {}),
    ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}

function withBullMqDefaults(options: RedisOptions): RedisOptions {
  return {
    ...options,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

export function getRedisOptions(config: ConfigService): RedisOptions {
  const redisUrl = config.get<string>('REDIS_URL')?.trim();
  if (redisUrl) {
    return withBullMqDefaults(parseRedisUrl(redisUrl));
  }

  const rawHost = config.get<string>('REDIS_HOST', 'localhost') ?? 'localhost';
  const host = normalizeRedisHost(rawHost);
  const port = Number(config.get('REDIS_PORT', 6379));
  const password = config.get<string>('REDIS_PASSWORD') || undefined;
  const useTls =
    config.get<string>('REDIS_TLS') === 'true' ||
    rawHost.startsWith('https://') ||
    host.includes('upstash.io');

  return withBullMqDefaults({
    host,
    port,
    password,
    ...(useTls ? { tls: {} } : {}),
  });
}
