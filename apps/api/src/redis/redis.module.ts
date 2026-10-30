import { Global, Inject, Injectable, Module, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfig } from '../config/app-config.service';

export const REDIS_CACHE = Symbol('REDIS_CACHE');

/** Cache JSON simples sobre o Redis. Falhas no Redis nunca derrubam a requisição. */
@Injectable()
export class CacheService {
  constructor(@Inject(REDIS_CACHE) private readonly redis: Redis) {}

  async obter<T>(chave: string): Promise<T | null> {
    try {
      const bruto = await this.redis.get(chave);
      return bruto === null ? null : (JSON.parse(bruto) as T);
    } catch {
      return null;
    }
  }

  async guardar(chave: string, valor: unknown, ttlSegundos: number): Promise<void> {
    try {
      await this.redis.set(chave, JSON.stringify(valor), 'EX', ttlSegundos);
    } catch {
      // cache é opcional
    }
  }

  async apagar(...chaves: string[]): Promise<void> {
    if (chaves.length === 0) return;
    try {
      await this.redis.del(...chaves);
    } catch {
      // cache é opcional
    }
  }

  async ping(): Promise<boolean> {
    try {
      return (await this.redis.ping()) === 'PONG';
    } catch {
      return false;
    }
  }
}

export const chaveVagas = (desafioId: string): string => `vagas:${desafioId}`;
export const chaveRanking = (desafioId: string): string => `ranking:${desafioId}`;
export const chaveFeed = (desafioId: string): string => `feed:${desafioId}`;

/** Chaves que mudam junto com o ranking (check-in, fotos, invalidação, exclusão de conta). */
export const chavesDoRanking = (desafioId: string): string[] => [chaveRanking(desafioId), chaveFeed(desafioId)];

@Injectable()
class RedisCloser implements OnModuleDestroy {
  constructor(@Inject(REDIS_CACHE) private readonly redis: Redis) {}
  async onModuleDestroy(): Promise<void> {
    await this.redis.quit().catch(() => undefined);
  }
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CACHE,
      inject: [AppConfig],
      useFactory: (config: AppConfig): Redis =>
        new Redis(config.get('REDIS_URL'), { maxRetriesPerRequest: 2, enableOfflineQueue: true }),
    },
    CacheService,
    RedisCloser,
  ],
  exports: [REDIS_CACHE, CacheService],
})
export class RedisModule {}
