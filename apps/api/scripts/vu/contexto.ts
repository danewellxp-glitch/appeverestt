// Recursos compartilhados pelos comandos: banco (Prisma), Redis, Firebase, S3 e o ritmo das chamadas.
// As chaves de cache vêm do próprio módulo da API (precisa do reflect-metadata por causa dos decorators).
import 'reflect-metadata';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { chaveVagas, chavesDoRanking } from '../../src/redis/redis.module';
import { CHAVE_TRAVA_RODADA, type ConfigVu, PREFIXO_REDIS, lerConfig } from './config';
import type { ContadorVu, RecursosCliente } from './cliente';
import { FirebaseVu } from './firebase';
import { Ritmo, dormir } from './http';

export interface Contexto extends RecursosCliente {
  prisma: PrismaClient;
  log: (mensagem: string) => void;
}

export function novoContador(): ContadorVu {
  return { requisicoes: 0, repeticoes: 0, logins: 0 };
}

export function criarContexto(config: ConfigVu = lerConfig()): Contexto {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new Error('Defina REDIS_URL.');
  if (!process.env.DATABASE_URL) throw new Error('Defina DATABASE_URL.');
  const contador = novoContador();
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: 2, enableOfflineQueue: true });
  // Sem handler, o ioredis imprime "Unhandled error event" a cada tentativa de reconexão.
  let ultimoAviso = 0;
  redis.on('error', (e: Error) => {
    if (Date.now() - ultimoAviso < 60_000) return;
    ultimoAviso = Date.now();
    console.error(`! Redis: ${e.message}`);
  });
  return {
    config,
    prisma: new PrismaClient(),
    redis,
    firebase: new FirebaseVu(config, contador),
    ritmoApi: Ritmo.porMinuto(config.maxRpm),
    ritmoSessao: Ritmo.porMinuto(8),
    ritmoUpload: Ritmo.porMinuto(20),
    contador,
    log: (m) => console.log(m),
  };
}

export async function fecharContexto(ctx: Contexto): Promise<void> {
  await ctx.firebase.fechar();
  await ctx.prisma.$disconnect().catch(() => undefined);
  ctx.redis.disconnect();
}

/** Mesmas chaves que a API apaga quando vagas/ranking/feed mudam. */
export async function invalidarCachesDoDesafio(ctx: Contexto, desafioId: string): Promise<void> {
  await ctx.redis.del(chaveVagas(desafioId), ...chavesDoRanking(desafioId)).catch(() => undefined);
}

/** Apaga as chaves do simulador (sessões, última rodada); a trava fica com quem a segura. */
export async function apagarChavesDoSimulador(ctx: Contexto): Promise<number> {
  let cursor = '0';
  let apagadas = 0;
  do {
    const [proximo, chaves] = await ctx.redis.scan(
      cursor,
      'MATCH',
      `${PREFIXO_REDIS}*`,
      'COUNT',
      200,
    );
    cursor = proximo;
    const alvo = chaves.filter((c) => c !== CHAVE_TRAVA_RODADA);
    if (alvo.length > 0) apagadas += await ctx.redis.del(...alvo);
  } while (cursor !== '0');
  return apagadas;
}

const LIBERAR_TRAVA = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end`;

export interface Trava {
  liberar: () => Promise<void>;
}

/**
 * Trava no Redis para não rodar duas rodadas (ou limpar no meio de uma rodada) ao mesmo tempo.
 * `esperaMs` > 0: tenta de novo a cada 5 s até conseguir. Devolve null se não conseguiu.
 */
export async function travarRodada(
  ctx: Contexto,
  validadeS: number,
  esperaMs = 0,
): Promise<Trava | null> {
  const dono = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const limite = Date.now() + esperaMs;
  for (;;) {
    const r = await ctx.redis.set(CHAVE_TRAVA_RODADA, dono, 'EX', validadeS, 'NX');
    if (r === 'OK') {
      return {
        liberar: async () => {
          await ctx.redis.eval(LIBERAR_TRAVA, 1, CHAVE_TRAVA_RODADA, dono).catch(() => undefined);
        },
      };
    }
    if (Date.now() >= limite) return null;
    await dormir(5_000);
  }
}
