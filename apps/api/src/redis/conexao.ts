import type { RedisOptions } from 'ioredis';

/** Converte REDIS_URL (redis:// ou rediss://) em opções do ioredis. */
export function opcoesRedis(url: string): RedisOptions {
  const u = new URL(url);
  const db = u.pathname.length > 1 ? Number(u.pathname.slice(1)) : 0;
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 6379,
    username: u.username ? decodeURIComponent(u.username) : undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
    db: Number.isFinite(db) ? db : 0,
    ...(u.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}
