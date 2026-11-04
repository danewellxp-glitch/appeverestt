import { Injectable } from '@nestjs/common';
import { Prisma, type Desafio } from '@prisma/client';
import type {
  AdminDesafioConfig,
  AdminDesafiosResposta,
  AtualizarDesafioInput,
  CriarDesafioInput,
} from '@everest/shared';
import { ErroApp } from '../../common/erros';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService, chaveVagas, chavesDoRanking } from '../../redis/redis.module';
import { DesafioService, dataIso, infoTempo } from '../desafios/desafio.service';
import { travarDesafio } from '../inscricoes/inscrever';
import { PushAgendador } from '../push/push.agendador';

export interface OcupacaoDesafio {
  /** Inscrições com número de vaga. */
  vagasOcupadas: number;
  totalInscritos: number;
  temCheckins: boolean;
}

const SEM_INSCRICOES: OcupacaoDesafio = { vagasOcupadas: 0, totalInscritos: 0, temCheckins: false };

/** Situação do desafio que limita o PATCH (lida dentro da transação, com o desafio travado). */
export interface RestricoesEdicao {
  temCheckins: boolean;
  vagasOcupadas: number;
  /** Maior número de vaga em uso (null = nenhuma). */
  maiorVaga: number | null;
}

export function paraConfig(d: Desafio, o: OcupacaoDesafio, agora = new Date()): AdminDesafioConfig {
  const t = infoTempo(d, agora);
  return {
    id: d.id,
    slug: d.slug,
    nome: d.nome,
    dataInicio: t.dataInicio,
    dataFim: t.dataFim,
    totalDias: d.totalDias,
    totalVagas: d.totalVagas,
    instagramHandle: d.instagramHandle,
    hashtag: d.hashtag,
    timezone: d.timezone,
    inscricoesAbertas: d.inscricoesAbertas,
    embaixadorOcupaVaga: d.embaixadorOcupaVaga,
    ativo: d.ativo,
    status: t.status,
    diaAtual: t.diaAtual,
    vagasOcupadas: o.vagasOcupadas,
    totalInscritos: o.totalInscritos,
    temCheckins: o.temCheckins,
    criadoEm: d.criadoEm.toISOString(),
  };
}

/**
 * Regras do PATCH. Só conta o que muda de fato (o formulário pode reenviar os valores atuais).
 * - Data de início e total de dias: só sem nenhum check-in (os dias gravados mudariam de data).
 * - Total de vagas: não fica abaixo da maior vaga em uso. Os números não são renumerados e a
 *   inscrição procura a menor vaga livre em 1..total, então um total menor que um número ocupado
 *   deixaria entrar gente além do limite.
 */
export function conferirAtualizacao(
  atual: Pick<Desafio, 'dataInicio' | 'totalDias' | 'totalVagas'>,
  input: AtualizarDesafioInput,
  r: RestricoesEdicao,
): void {
  const mudaInicio = input.dataInicio !== undefined && input.dataInicio !== dataIso(atual.dataInicio);
  const mudaDias = input.totalDias !== undefined && input.totalDias !== atual.totalDias;
  if ((mudaInicio || mudaDias) && r.temCheckins) {
    const mensagem = 'A data de início e o total de dias não podem mudar depois do primeiro check-in.';
    throw new ErroApp('DESAFIO_NAO_EDITAVEL', mensagem, {
      ...(mudaInicio ? { dataInicio: mensagem } : {}),
      ...(mudaDias ? { totalDias: mensagem } : {}),
    });
  }

  const vagas = input.totalVagas;
  if (vagas === undefined || vagas === atual.totalVagas || r.maiorVaga === null || vagas >= r.maiorVaga) return;
  const mensagem =
    vagas < r.vagasOcupadas
      ? `Já há ${r.vagasOcupadas} vagas ocupadas: o total não pode ser menor que isso.`
      : `A vaga nº ${r.maiorVaga} está ocupada: o total precisa ser pelo menos ${r.maiorVaga}. ` +
        'Para diminuir mais, remova antes as inscrições das últimas vagas.';
  throw new ErroApp('DESAFIO_NAO_EDITAVEL', mensagem, { totalVagas: mensagem });
}

/** `@db.Date`: meia-noite UTC do dia informado. */
const paraData = (iso: string): Date => new Date(`${iso}T00:00:00Z`);

function dadosAtualizacao(input: AtualizarDesafioInput): Prisma.DesafioUpdateInput {
  const { dataInicio, ...resto } = input;
  return { ...resto, ...(dataInicio !== undefined ? { dataInicio: paraData(dataInicio) } : {}) };
}

/**
 * Só um desafio ativo por vez (índice único parcial `um_desafio_ativo`). Trava o ativo atual antes:
 * duas ativações ao mesmo tempo se enfileiram em vez de colidir no índice.
 */
async function desativarOutros(tx: Prisma.TransactionClient, excetoId?: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "Desafio" WHERE ativo = true FOR UPDATE`;
  await tx.desafio.updateMany({
    where: { ativo: true, ...(excetoId ? { id: { not: excetoId } } : {}) },
    data: { ativo: false },
  });
}

const ehP2002 = (e: unknown): boolean => e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

const ativacaoConcorrente = (): ErroApp =>
  new ErroApp('DESAFIO_NAO_EDITAVEL', 'Outro desafio foi ativado ao mesmo tempo. Atualize a página e tente de novo.');

/** Configuração dos desafios pelo painel do admin (criar, listar, editar). */
@Injectable()
export class AdminDesafiosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly desafios: DesafioService,
    private readonly agendador: PushAgendador,
  ) {}

  private async ocupacao(ids: string[]): Promise<Map<string, OcupacaoDesafio>> {
    if (ids.length === 0) return new Map();
    const [inscricoes, comCheckin] = await Promise.all([
      // `_count.vagaNumero` conta só as linhas com vaga (não nulas).
      this.prisma.participante.groupBy({
        by: ['desafioId'],
        where: { desafioId: { in: ids } },
        _count: { _all: true, vagaNumero: true },
      }),
      this.prisma.participante.groupBy({
        by: ['desafioId'],
        where: { desafioId: { in: ids }, dias: { some: {} } },
        _count: { _all: true },
      }),
    ]);
    const porDesafio = new Map(inscricoes.map((l) => [l.desafioId, l._count]));
    const comDias = new Set(comCheckin.map((l) => l.desafioId));
    return new Map(
      ids.map((id) => {
        const c = porDesafio.get(id);
        return [id, { vagasOcupadas: c?.vagaNumero ?? 0, totalInscritos: c?._all ?? 0, temCheckins: comDias.has(id) }];
      }),
    );
  }

  private async config(d: Desafio): Promise<AdminDesafioConfig> {
    const o = await this.ocupacao([d.id]);
    return paraConfig(d, o.get(d.id) ?? SEM_INSCRICOES);
  }

  /** O ativo primeiro; depois do mais novo (data de início) ao mais antigo. */
  async listar(): Promise<AdminDesafiosResposta> {
    const desafios = await this.prisma.desafio.findMany({
      orderBy: [{ ativo: 'desc' }, { dataInicio: 'desc' }, { criadoEm: 'desc' }],
    });
    const ocupacao = await this.ocupacao(desafios.map((d) => d.id));
    const agora = new Date();
    return { desafios: desafios.map((d) => paraConfig(d, ocupacao.get(d.id) ?? SEM_INSCRICOES, agora)) };
  }

  async obter(slug: string): Promise<AdminDesafioConfig> {
    return this.config(await this.desafios.porSlug(slug));
  }

  /** `ativar` desativa os outros na mesma transação (como o scripts/criar-desafio.ts). */
  async criar(input: CriarDesafioInput): Promise<AdminDesafioConfig> {
    const existe = () => this.prisma.desafio.findUnique({ where: { slug: input.slug }, select: { id: true } });
    if (await existe()) throw new ErroApp('DESAFIO_JA_EXISTE');
    try {
      const d = await this.prisma.$transaction(
        async (tx) => {
          if (input.ativar) await desativarOutros(tx);
          return tx.desafio.create({
            data: {
              slug: input.slug,
              nome: input.nome,
              dataInicio: paraData(input.dataInicio),
              totalDias: input.totalDias,
              totalVagas: input.totalVagas,
              instagramHandle: input.instagramHandle,
              hashtag: input.hashtag,
              inscricoesAbertas: input.inscricoesAbertas,
              embaixadorOcupaVaga: input.embaixadorOcupaVaga,
              ativo: input.ativar,
            },
          });
        },
        { maxWait: 15_000, timeout: 15_000 },
      );
      // Os lembretes push seguem o fuso do desafio ativo (R22).
      if (input.ativar) await this.agendador.sincronizarSemFalhar();
      return paraConfig(d, SEM_INSCRICOES);
    } catch (e) {
      // Slug criado ao mesmo tempo por outra requisição, ou outra ativação simultânea.
      if (ehP2002(e)) throw (await existe()) ? new ErroApp('DESAFIO_JA_EXISTE') : ativacaoConcorrente();
      throw e;
    }
  }

  /**
   * PATCH (superconjunto da resposta antiga: quem manda só `{ inscricoesAbertas }` continua igual).
   * Trava o desafio como a inscrição: o total de vagas não corre com uma inscrição nova.
   * `ativo: true` desativa os outros; `ativo: false` deixa o app sem desafio ativo.
   */
  async atualizar(slug: string, input: AtualizarDesafioInput): Promise<AdminDesafioConfig> {
    const d = await this.desafios.porSlug(slug);
    let atualizado: Desafio;
    try {
      atualizado = await this.prisma.$transaction(
        async (tx) => {
          await travarDesafio(tx, d.slug);
          const atual = await tx.desafio.findUniqueOrThrow({ where: { id: d.id } });
          const checkin = await tx.diaDesafio.findFirst({
            where: { participante: { desafioId: atual.id } },
            select: { id: true },
          });
          const vagas = await tx.participante.aggregate({
            where: { desafioId: atual.id },
            _max: { vagaNumero: true },
            _count: { vagaNumero: true },
          });
          conferirAtualizacao(atual, input, {
            temCheckins: checkin !== null,
            vagasOcupadas: vagas._count.vagaNumero,
            maiorVaga: vagas._max.vagaNumero,
          });
          if (input.ativo === true && !atual.ativo) await desativarOutros(tx, atual.id);
          return tx.desafio.update({ where: { id: atual.id }, data: dadosAtualizacao(input) });
        },
        { maxWait: 15_000, timeout: 15_000 },
      );
    } catch (e) {
      if (ehP2002(e)) throw ativacaoConcorrente();
      throw e;
    }
    // Vagas e o feed (mostra o total de vagas) saem do cache.
    await this.cache.apagar(chaveVagas(d.id), ...chavesDoRanking(d.id));
    // Ativar/desativar muda o fuso dos lembretes push (R22).
    if (input.ativo !== undefined && input.ativo !== d.ativo) await this.agendador.sincronizarSemFalhar();
    return this.config(atualizado);
  }
}
