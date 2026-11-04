import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import type { Desafio, Prisma, StatusPagamento } from '@prisma/client';
import type { App } from 'supertest/types';
import request from 'supertest';
import Redis from 'ioredis';
import { hojeNoFuso, somarDias } from '@everest/shared';
import { AppModule } from '../src/app.module';
import { menorVagaLivre } from '../src/modules/inscricoes/inscrever';
import { configurarApp } from '../src/app.setup';
import { VERIFICADOR_FIREBASE } from '../src/modules/auth/verificador-firebase';
import { PrismaService } from '../src/prisma/prisma.service';
import { CacheService, chaveVagas, chavesDoRanking } from '../src/redis/redis.module';
import { VerificadorFalso, tokenTeste } from './verificador-falso';

export interface Contexto {
  app: INestApplication<App>;
  prisma: PrismaService;
  http: App;
  verificador: VerificadorFalso;
}

/** `ajustar` troca outros providers (ex.: WEB_PUSH falso nos testes de push). */
export async function criarApp(
  ajustar: (b: TestingModuleBuilder) => TestingModuleBuilder = (b) => b,
): Promise<Contexto> {
  const verificador = new VerificadorFalso();
  const modulo = await ajustar(
    Test.createTestingModule({ imports: [AppModule] }).overrideProvider(VERIFICADOR_FIREBASE).useValue(verificador),
  ).compile();
  const app = modulo.createNestApplication<NestExpressApplication>({ logger: ['error', 'warn'] });
  configurarApp(app);
  await app.init();
  return {
    app: app as unknown as INestApplication<App>,
    prisma: app.get(PrismaService),
    http: app.getHttpServer() as App,
    verificador,
  };
}

export async function limparTudo(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "PushInscricao", "Feedback", "FotoProva", "DiaDesafio", "Participante", "Desafio", "Usuario" CASCADE',
  );
  const redis = new Redis(process.env.REDIS_URL ?? '');
  const todas = (
    await Promise.all(['vagas:*', 'ranking:*', 'feed:*'].map((padrao) => redis.keys(padrao)))
  ).flat();
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

let contadorUid = 0;
export function uidUnico(): string {
  contadorUid += 1;
  return `uid-${Date.now()}-${contadorUid}`;
}

/** Abre sessão via POST /auth/sessao (verificador falso). Perfil incompleto até o PATCH /me. */
export async function sessaoFirebase(
  http: App,
  email = emailUnico(),
  opcoes: { uid?: string; verificado?: boolean; nome?: string } = {},
): Promise<{ agente: ReturnType<typeof request.agent>; email: string; id: string; uid: string }> {
  const uid = opcoes.uid ?? uidUnico();
  const agente = request.agent(http);
  const r = await agente
    .post('/api/auth/sessao')
    .send({ idToken: tokenTeste(uid, email, { verificado: opcoes.verificado ?? true, nome: opcoes.nome }) });
  if (r.status !== 200) throw new Error(`sessão falhou: ${r.status} ${JSON.stringify(r.body)}`);
  const corpo = r.body as { usuario: { id: string } };
  return { agente, email, id: corpo.usuario.id, uid };
}

/** Dados de cadastro válidos para o PATCH /me (sem o nome). */
export const DADOS_PERFIL = {
  instagram: '@pessoa.teste',
  dataNascimento: '1995-04-12',
  whatsapp: '(11) 98765-4321',
  bairro: 'Pinheiros',
  cidade: 'São Paulo',
  uf: 'SP',
  aceitouTermos: true,
} as const;

/** Nome com sobrenome (o perfil exige nome completo). */
function nomeCompleto(nome: string): string {
  return nome.trim().includes(' ') ? nome : `${nome} Teste`;
}

/** Entra pelo Firebase (falso) e completa o perfil: agente supertest com o cookie de sessão. */
export async function novoUsuarioLogado(
  http: App,
  nome = 'Pessoa Teste',
  email = emailUnico(),
): Promise<{ agente: ReturnType<typeof request.agent>; email: string; id: string; uid: string }> {
  const sessao = await sessaoFirebase(http, email, { nome });
  const r = await sessao.agente.patch('/api/me').send({ nome: nomeCompleto(nome), ...DADOS_PERFIL });
  if (r.status !== 200) throw new Error(`PATCH /me falhou: ${r.status} ${JSON.stringify(r.body)}`);
  return sessao;
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

/** Grava o status do pagamento direto no banco (como o admin faria) e limpa os caches afetados. */
export async function definirPagamento(
  ctx: Contexto,
  participanteId: string,
  status: StatusPagamento,
): Promise<void> {
  const p = await ctx.prisma.participante.update({
    where: { id: participanteId },
    data: {
      pagamentoStatus: status,
      pagamentoInformadoEm: status === 'PENDENTE' ? null : new Date(),
      pagamentoConfirmadoEm: status === 'CONFIRMADO' ? new Date() : null,
    },
  });
  await ctx.app.get(CacheService).apagar(chaveVagas(p.desafioId), ...chavesDoRanking(p.desafioId));
}

/**
 * Desafio ativo que começou há `diasAtras` dias + usuário inscrito (hoje = dia diasAtras+1).
 * O pagamento fica CONFIRMADO por padrão (as rotas de check-in, ranking e feed exigem).
 */
export async function cenarioInscrito(
  ctx: Contexto,
  opcoes: { diasAtras?: number; nome?: string; pagamento?: StatusPagamento } = {},
): Promise<{
  desafio: Desafio;
  agente: ReturnType<typeof request.agent>;
  usuarioId: string;
  participanteId: string;
  hoje: number;
}> {
  const diasAtras = opcoes.diasAtras ?? 3;
  const desafio =
    (await ctx.prisma.desafio.findUnique({ where: { slug: 'desafio-teste' } })) ??
    (await criarDesafio(ctx.prisma, { inicioRelativo: -diasAtras }));
  const { agente, id } = await novoUsuarioLogado(ctx.http, opcoes.nome ?? 'Pessoa Teste');
  const r = await agente.post('/api/desafios/desafio-teste/inscricao');
  if (r.status !== 201) throw new Error(`inscrição falhou: ${JSON.stringify(r.body)}`);
  const corpo = r.body as { participacao: { participanteId: string } };
  const participanteId = corpo.participacao.participanteId;
  const pagamento = opcoes.pagamento ?? 'CONFIRMADO';
  if (pagamento !== 'PENDENTE') await definirPagamento(ctx, participanteId, pagamento);
  return { desafio, agente, usuarioId: id, participanteId, hoje: diasAtras + 1 };
}

export const CHECKIN_COMPLETO = { aguaMl: 3000, exercicio: true, paginasLidas: 10, storyPostado: true };

/** Insere direto no banco 3 fotos CONFIRMADA (sem storage) para um dia. */
export async function fotosFalsas(prisma: PrismaService, participanteId: string, numeroDia: number): Promise<string> {
  const dia = await prisma.diaDesafio.upsert({
    where: { participanteId_numeroDia: { participanteId, numeroDia } },
    update: {},
    create: { participanteId, numeroDia },
  });
  for (const tipo of ['AGUA', 'EXERCICIO', 'LEITURA'] as const) {
    const existente = await prisma.fotoProva.findFirst({
        where: { diaId: dia.id, tipo, status: { not: 'PENDENTE' } },
        select: { id: true },
      });
    if (existente) {
      await prisma.fotoProva.update({ where: { id: existente.id }, data: { status: 'CONFIRMADA' } });
      continue;
    }
    await prisma.fotoProva.create({
      data: {
        diaId: dia.id,
        tipo,
        storageKey: `falsa/${dia.id}/${tipo}.webp`,
        thumbKey: `falsa/${dia.id}/${tipo}.thumb.webp`,
        mimeType: 'image/webp',
        tamanhoBytes: 100,
        status: 'CONFIRMADA',
      },
    });
  }
  return dia.id;
}

/** Cria participante (pagamento CONFIRMADO) + dias concluídos direto no banco (para ranking/admin). */
export async function participanteComDias(
  prisma: PrismaService,
  desafioId: string,
  nome: string,
  diasConcluidos: number[],
  extra: { dataInscricao?: Date; vagaNumero?: number } = {},
): Promise<string> {
  const u = await prisma.usuario.create({
    data: {
      nome,
      email: emailUnico('rank'),
      senhaHash: 'x',
      aceitouTermosEm: new Date(),
      instagram: 'rank.teste',
      dataNascimento: new Date('1990-01-01T00:00:00Z'),
      whatsapp: '11987654321',
      bairro: 'Centro',
      cidade: 'Curitiba',
      uf: 'PR',
    },
  });
  const { totalVagas } = await prisma.desafio.findUniqueOrThrow({ where: { id: desafioId } });
  const vagaNumero = extra.vagaNumero ?? (await menorVagaLivre(prisma, desafioId, totalVagas));
  if (vagaNumero === null) throw new Error('participanteComDias: vagas esgotadas');
  const p = await prisma.participante.create({
    data: {
      desafioId,
      usuarioId: u.id,
      vagaNumero,
      pagamentoStatus: 'CONFIRMADO',
      pagamentoConfirmadoEm: new Date(),
      ...(extra.dataInscricao ? { dataInscricao: extra.dataInscricao } : {}),
    },
  });
  for (const n of diasConcluidos) {
    await prisma.diaDesafio.create({ data: { participanteId: p.id, numeroDia: n, ...CHECKIN_COMPLETO, concluido: true } });
  }
  return p.id;
}
