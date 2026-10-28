import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { Desafio, Prisma } from '@prisma/client';
import type { App } from 'supertest/types';
import request from 'supertest';
import Redis from 'ioredis';
import { hojeNoFuso, somarDias } from '@everest/shared';
import { AppModule } from '../src/app.module';
import { configurarApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

export interface Contexto {
  app: INestApplication<App>;
  prisma: PrismaService;
  http: App;
}

export async function criarApp(): Promise<Contexto> {
  const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = modulo.createNestApplication<NestExpressApplication>({ logger: ['error', 'warn'] });
  configurarApp(app);
  await app.init();
  return {
    app: app as unknown as INestApplication<App>,
    prisma: app.get(PrismaService),
    http: app.getHttpServer() as App,
  };
}

export async function limparTudo(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "FotoProva", "DiaDesafio", "Participante", "Desafio", "Usuario" CASCADE',
  );
  const redis = new Redis(process.env.REDIS_URL ?? '');
  const chaves = await redis.keys('vagas:*');
  const chavesRanking = await redis.keys('ranking:*');
  const todas = [...chaves, ...chavesRanking];
  if (todas.length > 0) await redis.del(...todas);
  await redis.quit();
}

/** Data 'YYYY-MM-DD' relativa a hoje em São Paulo (ex.: -3 = começou há 3 dias). */
export function dataRelativa(dias: number): string {
  return somarDias(hojeNoFuso(new Date(), 'America/Sao_Paulo'), dias);
}

export async function criarDesafio(
  prisma: PrismaService,
  extra: Partial<Prisma.DesafioCreateInput> & { inicioRelativo?: number } = {},
): Promise<Desafio> {
  const { inicioRelativo = 0, ...resto } = extra;
  return prisma.desafio.create({
    data: {
      slug: 'desafio-teste',
      nome: 'Desafio Teste',
      dataInicio: new Date(`${dataRelativa(inicioRelativo)}T00:00:00Z`),
      instagramHandle: 'everest_teste',
      ativo: true,
      ...resto,
    },
  });
}

let contador = 0;
export function emailUnico(prefixo = 'user'): string {
  contador += 1;
  return `${prefixo}.${Date.now()}.${contador}@teste.dev`;
}

/** Cadastra e devolve um agente supertest com o cookie de sessão. */
export async function novoUsuarioLogado(
  http: App,
  nome = 'Pessoa Teste',
  email = emailUnico(),
): Promise<{ agente: ReturnType<typeof request.agent>; email: string; id: string }> {
  const agente = request.agent(http);
  const r = await agente
    .post('/api/auth/cadastro')
    .send({ nome, email, senha: 'senha-segura-123', aceitouTermos: true });
  if (r.status !== 201) throw new Error(`cadastro falhou: ${r.status} ${JSON.stringify(r.body)}`);
  const corpo = r.body as { usuario: { id: string } };
  return { agente, email, id: corpo.usuario.id };
}

export async function tornarAdmin(prisma: PrismaService, usuarioId: string): Promise<void> {
  await prisma.usuario.update({ where: { id: usuarioId }, data: { papel: 'ADMIN' } });
}

export async function esperar<T>(
  fn: () => Promise<T>,
  ok: (v: T) => boolean,
  timeoutMs = 20_000,
): Promise<T> {
  const fim = Date.now() + timeoutMs;
  let ultimo = await fn();
  while (!ok(ultimo)) {
    if (Date.now() > fim) throw new Error(`timeout esperando condição; último valor: ${JSON.stringify(ultimo)}`);
    await new Promise((r) => setTimeout(r, 250));
    ultimo = await fn();
  }
  return ultimo;
}
