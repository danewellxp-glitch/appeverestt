import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './env';

/** Acesso tipado às variáveis de ambiente já validadas. */
@Injectable()
export class AppConfig {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get<K extends keyof Env>(chave: K): Env[K] {
    return this.config.get(chave, { infer: true });
  }

  get producao(): boolean {
    return this.get('NODE_ENV') === 'production';
  }
}
