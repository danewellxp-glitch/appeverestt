import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, type Desafio } from '@prisma/client';
import {
  hojeNoFuso,
  idadeEm,
  type AdicionarParticipanteInput,
  type AdminDiaDetalhe,
  type AdminFeedbacksResposta,
  type AdminPagamento,
  type AdminParticipante,
  type AdminParticipanteDetalhe,
  type AdminParticipantesResposta,
  type ConferenciaInput,
  type ConferenciaResposta,
  type InvalidacaoInput,
  type InvalidacaoResposta,
  type PagamentoAdminInput,
} from '@everest/shared';
import { ErroApp } from '../../common/erros';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService, chaveVagas, chavesDoRanking } from '../../redis/redis.module';
import { DesafioService, dataIso } from '../desafios/desafio.service';
import { DiaService, recalcularDia } from '../dias/dia.service';
import { paraFeedback } from '../feedback/feedback.service';
import { inscreverPeloAdmin } from '../inscricoes/inscrever';
import { csvParticipantes } from './csv';
import { FotosParecidas, fotosComHash } from './fotos-parecidas';

const SELECAO_USUARIO = {
  id: true,
  nome: true,
  email: true,
  instagram: true,
  whatsapp: true,
  dataNascimento: true,
  bairro: true,
  cidade: true,
  uf: true,
  aceitouTermosEm: true,
  aceitouMarketingEm: true,
  criadoEm: true,
  excluidoEm: true,
} satisfies Prisma.UsuarioSelect;

type LinhaParticipante = Prisma.ParticipanteGetPayload<{
  include: { usuario: { select: typeof SELECAO_USUARIO }; feedback: true };
}>;

interface ParticipanteCarregado {
  linha: LinhaParticipante;
  resumo: AdminParticipante;
  /** Qualquer DiaDesafio (inclusive parcial): com dias, a inscrição não pode ser removida (FK RESTRICT). */
  totalDias: number;
}

const iso = (d: Date | null): string | null => d?.toISOString() ?? null;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly desafios: DesafioService,
    private readonly dias: DiaService,
  ) {}

  private async carregar(desafio: Desafio, participanteId?: string): Promise<ParticipanteCarregado[]> {
    const participantes = await this.prisma.participante.findMany({
      where: { desafioId: desafio.id, ...(participanteId ? { id: participanteId } : {}) },
      include: { usuario: { select: SELECAO_USUARIO }, feedback: true },
      orderBy: [{ vagaNumero: { sort: 'asc', nulls: 'first' } }, { dataInscricao: 'asc' }],
    });
    const ids = participantes.map((p) => p.id);
    const [concluidos, invalidados, aRevisar, todos, fotos] = await Promise.all([
      this.prisma.diaDesafio.groupBy({
        by: ['participanteId'],
        where: { participanteId: { in: ids }, concluido: true, invalidado: false },
        _count: { _all: true },
      }),
      this.prisma.diaDesafio.groupBy({
        by: ['participanteId'],
        where: { participanteId: { in: ids }, invalidado: true },
        _count: { _all: true },
      }),
      this.prisma.diaDesafio.groupBy({
        by: ['participanteId'],
        where: { participanteId: { in: ids }, concluido: true, invalidado: false, conferidoEm: null },
        _count: { _all: true },
      }),
      this.prisma.diaDesafio.groupBy({
        by: ['participanteId'],
        where: { participanteId: { in: ids } },
        _count: { _all: true },
      }),
      // Todas do desafio (mesmo filtrando um participante): a parecida pode ser de outra pessoa.
      fotosComHash(this.prisma, desafio.id),
    ]);
    const mapa = (linhas: { participanteId: string; _count: { _all: number } }[]) =>
      new Map(linhas.map((l) => [l.participanteId, l._count._all]));
    const nConcluidos = mapa(concluidos);
    const nInvalidados = mapa(invalidados);
    const nParaRevisar = mapa(aRevisar);
    const nTotal = mapa(todos);
    const diasFotoParecida = new FotosParecidas(fotos).diasParaRevisar();
    return participantes.map((p) => ({
      linha: p,
      totalDias: nTotal.get(p.id) ?? 0,
      resumo: {
        participanteId: p.id,
        usuarioId: p.usuario.id,
        nome: p.usuario.nome,
        email: p.usuario.email,
        instagram: p.usuario.instagram,
        whatsapp: p.usuario.whatsapp,
        vagaNumero: p.vagaNumero,
        ehEmbaixador: p.ehEmbaixador,
        dataInscricao: p.dataInscricao.toISOString(),
        pagamentoStatus: p.pagamentoStatus,
        pagamentoInformadoEm: iso(p.pagamentoInformadoEm),
        pagamentoConfirmadoEm: iso(p.pagamentoConfirmadoEm),
        contaExcluida: p.usuario.excluidoEm !== null,
        diasConcluidos: nConcluidos.get(p.id) ?? 0,
        diasInvalidados: nInvalidados.get(p.id) ?? 0,
        paraRevisar: nParaRevisar.get(p.id) ?? 0,
        diasFotoParecida: diasFotoParecida.get(p.id) ?? [],
        temFeedback: p.feedback !== null,
      },
    }));
  }

  async participantes(slug: string): Promise<AdminParticipantesResposta> {
    const d = await this.desafios.porSlug(slug);
    const participantes = (await this.carregar(d)).map((c) => c.resumo);
    return {
      desafio: { slug: d.slug, nome: d.nome, inscricoesAbertas: d.inscricoesAbertas, totalVagas: d.totalVagas },
      participantes,
      totalParaRevisar: participantes.reduce((soma, p) => soma + p.paraRevisar, 0),
      totalPagamentosInformados: participantes.filter((p) => p.pagamentoStatus === 'INFORMADO').length,
    };
  }

  async participante(slug: string, participanteId: string): Promise<AdminParticipanteDetalhe> {
    const d = await this.desafios.porSlug(slug);
    const [c] = await this.carregar(d, participanteId);
    if (!c) throw new ErroApp('NAO_ENCONTRADO', 'Participante não encontrado.');
    const { linha: p, resumo, totalDias } = c;
    const u = p.usuario;
    const nascimento = u.dataNascimento ? dataIso(u.dataNascimento) : null;
    return {
      participante: resumo,
      dados: {
        email: u.email,
        instagram: u.instagram,
        whatsapp: u.whatsapp,
        dataNascimento: nascimento,
        idade: nascimento ? idadeEm(nascimento, hojeNoFuso(new Date(), d.timezone)) : null,
        bairro: u.bairro,
        cidade: u.cidade,
        uf: u.uf,
        aceitouTermosEm: iso(u.aceitouTermosEm),
        aceitouMarketingEm: iso(u.aceitouMarketingEm),
        criadoEm: u.criadoEm.toISOString(),
        excluidoEm: iso(u.excluidoEm),
      },
      pagamento: {
        status: p.pagamentoStatus,
        informadoEm: iso(p.pagamentoInformadoEm),
        confirmadoEm: iso(p.pagamentoConfirmadoEm),
      },
      feedback: p.feedback ? paraFeedback(p.feedback) : null,
      progresso: await this.dias.progresso(d, p.id, new Date(), { paraAdmin: true }),
      removivel: !p.ehEmbaixador && totalDias === 0,
    };
  }

  /**
   * Conferência do Pix (X12). Idempotente. CONFIRMADO grava quando e quem; PENDENTE ("Não recebi")
   * zera a confirmação e mantém `informadoEm` (a tela do participante pede para avisar de novo).
   */
  async pagamento(
    slug: string,
    participanteId: string,
    adminId: string,
    input: PagamentoAdminInput,
  ): Promise<AdminPagamento> {
    const d = await this.desafios.porSlug(slug);
    const p = await this.prisma.participante.findFirst({ where: { id: participanteId, desafioId: d.id } });
    if (!p) throw new ErroApp('NAO_ENCONTRADO', 'Participante não encontrado.');

    if (input.status === 'CONFIRMADO') {
      // Condição no próprio UPDATE: confirmar de novo não sobrescreve quando/quem confirmou.
      await this.prisma.participante.updateMany({
        where: { id: p.id, pagamentoStatus: { not: 'CONFIRMADO' } },
        data: { pagamentoStatus: 'CONFIRMADO', pagamentoConfirmadoEm: new Date(), pagamentoConfirmadoPorId: adminId },
      });
    } else {
      if (p.ehEmbaixador) {
        throw new ErroApp('VALIDACAO', 'O embaixador não paga a inscrição.', undefined, HttpStatus.CONFLICT);
      }
      await this.prisma.participante.updateMany({
        where: { id: p.id, pagamentoStatus: { not: 'PENDENTE' } },
        data: { pagamentoStatus: 'PENDENTE', pagamentoConfirmadoEm: null, pagamentoConfirmadoPorId: null },
      });
    }
    await this.cache.apagar(chaveVagas(d.id), ...chavesDoRanking(d.id));
    // Outro admin pode ter removido a inscrição entre a leitura e a escrita.
    const atual = await this.prisma.participante.findUnique({ where: { id: p.id } });
    if (!atual) throw new ErroApp('NAO_ENCONTRADO', 'Participante não encontrado.');
    return {
      status: atual.pagamentoStatus,
      informadoEm: iso(atual.pagamentoInformadoEm),
      confirmadoEm: iso(atual.pagamentoConfirmadoEm),
    };
  }

  /**
   * Inscreve pelo painel quem já tem conta (pelo e-mail): menor vaga livre, mesma trava da inscrição
   * normal, mesmo com inscrições fechadas (ver `inscreverPeloAdmin`).
   */
  async adicionar(slug: string, adminId: string, input: AdicionarParticipanteInput): Promise<AdminParticipante> {
    const d = await this.desafios.porSlug(slug);
    const usuario = await this.prisma.usuario.findFirst({
      where: { email: input.email, excluidoEm: null },
      select: { id: true },
    });
    if (!usuario) {
      throw new ErroApp('NAO_ENCONTRADO', 'Não há conta com esse e-mail. A pessoa precisa criar a conta no app primeiro.');
    }
    const p = await inscreverPeloAdmin(this.prisma, {
      slug: d.slug,
      usuarioId: usuario.id,
      adminId,
      pagamentoStatus: input.pagamentoStatus,
    });
    await this.cache.apagar(chaveVagas(d.id), ...chavesDoRanking(d.id));
    const [c] = await this.carregar(d, p.id);
    if (!c) throw new ErroApp('NAO_ENCONTRADO', 'Participante não encontrado.');
    return c.resumo;
  }

  /**
   * Remove uma inscrição sem check-ins e que não é do embaixador, paga ou não (libera a vaga; o
   * número volta a ser o menor livre). Mesma trava do `inscrever` para não correr com uma inscrição.
   */
  async remover(slug: string, participanteId: string): Promise<{ ok: true }> {
    const d = await this.desafios.porSlug(slug);
    try {
      await this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Desafio" WHERE id = ${d.id} FOR UPDATE`;
          const r = await tx.participante.deleteMany({
            where: {
              id: participanteId,
              desafioId: d.id,
              ehEmbaixador: false,
              dias: { none: {} },
            },
          });
          if (r.count === 0) {
            const existe = await tx.participante.findFirst({
              where: { id: participanteId, desafioId: d.id },
              select: { id: true },
            });
            throw existe
              ? new ErroApp('PARTICIPANTE_NAO_REMOVIVEL')
              : new ErroApp('NAO_ENCONTRADO', 'Participante não encontrado.');
          }
        },
        { maxWait: 15_000, timeout: 15_000 },
      );
    } catch (e) {
      // Um check-in criado no meio (FK RESTRICT de DiaDesafio) também impede a remoção.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new ErroApp('PARTICIPANTE_NAO_REMOVIVEL');
      }
      throw e;
    }
    await this.cache.apagar(chaveVagas(d.id), ...chavesDoRanking(d.id));
    return { ok: true };
  }

  async feedbacks(slug: string): Promise<AdminFeedbacksResposta> {
    const d = await this.desafios.porSlug(slug);
    const linhas = await this.prisma.feedback.findMany({
      where: { participante: { desafioId: d.id } },
      include: {
        participante: { select: { id: true, vagaNumero: true, usuario: { select: { nome: true, instagram: true } } } },
      },
      orderBy: { atualizadoEm: 'desc' },
    });
    const total = linhas.length;
    const soma = linhas.reduce((s, f) => s + f.nota, 0);
    return {
      feedbacks: linhas.map((f) => ({
        ...paraFeedback(f),
        participanteId: f.participante.id,
        nome: f.participante.usuario.nome,
        instagram: f.participante.usuario.instagram,
        vagaNumero: f.participante.vagaNumero,
      })),
      total,
      media: total === 0 ? null : Math.round((soma / total) * 10) / 10,
    };
  }

  /** CSV com os dados de todos (UTF-8 com BOM, ";"): ver `csv.ts`. */
  async csv(slug: string): Promise<{ conteudo: string; slug: string }> {
    const d = await this.desafios.porSlug(slug);
    const carregados = await this.carregar(d);
    const conteudo = csvParticipantes(
      carregados.map(({ linha: p, resumo }) => ({
        vagaNumero: p.vagaNumero,
        nome: p.usuario.nome,
        email: p.usuario.email,
        instagram: p.usuario.instagram,
        whatsapp: p.usuario.whatsapp,
        dataNascimento: p.usuario.dataNascimento,
        bairro: p.usuario.bairro,
        cidade: p.usuario.cidade,
        uf: p.usuario.uf,
        dataInscricao: p.dataInscricao,
        pagamentoStatus: p.pagamentoStatus,
        pagamentoInformadoEm: p.pagamentoInformadoEm,
        pagamentoConfirmadoEm: p.pagamentoConfirmadoEm,
        diasConcluidos: resumo.diasConcluidos,
        diasInvalidados: resumo.diasInvalidados,
        aceitouMarketing: p.usuario.aceitouMarketingEm !== null,
        notaFeedback: p.feedback?.nota ?? null,
        autorizaDivulgacao: p.feedback?.autorizaDivulgacao ?? null,
        contaExcluida: resumo.contaExcluida,
      })),
      d.timezone,
    );
    return { conteudo, slug: d.slug };
  }

  async dia(slug: string, participanteId: string, numeroDia: number): Promise<AdminDiaDetalhe> {
    const d = await this.desafios.porSlug(slug);
    const p = await this.prisma.participante.findFirst({
      where: { id: participanteId, desafioId: d.id },
      include: { usuario: { select: { nome: true } } },
    });
    if (!p) throw new ErroApp('NAO_ENCONTRADO', 'Participante não encontrado.');
    const [detalhe, fotos] = await Promise.all([
      this.dias.detalhe(d, p.id, numeroDia),
      fotosComHash(this.prisma, d.id),
    ]);
    // Sinal de foto repetida (X20): só nesta rota do admin, nunca na do participante.
    const parecidas = new FotosParecidas(fotos);
    return {
      ...detalhe,
      participanteId: p.id,
      nomeParticipante: p.usuario.nome,
      fotos: detalhe.fotos.map((f) => ({ ...f, parecida: parecidas.daFoto(f.id) })),
    };
  }

  async invalidacao(diaId: string, adminId: string, input: InvalidacaoInput): Promise<InvalidacaoResposta> {
    const existente = await this.prisma.diaDesafio.findUnique({
      where: { id: diaId },
      select: { id: true, participante: { select: { desafioId: true } } },
    });
    if (!existente) throw new ErroApp('NAO_ENCONTRADO', 'Dia não encontrado.');

    const dia = await this.prisma.$transaction(async (tx) => {
      await tx.diaDesafio.update({
        where: { id: diaId },
        data: input.invalidado
          ? {
              invalidado: true,
              motivoInvalidacao: input.motivo ?? null,
              invalidadoPorId: adminId,
              invalidadoEm: new Date(),
              conferidoEm: null,
              conferidoPorId: null,
            }
          : // Revalidar não marca como conferido: o dia volta para a fila (X8).
            {
              invalidado: false,
              motivoInvalidacao: null,
              invalidadoPorId: null,
              invalidadoEm: null,
              conferidoEm: null,
              conferidoPorId: null,
            },
      });
      await recalcularDia(tx, diaId);
      return tx.diaDesafio.findUniqueOrThrow({ where: { id: diaId } });
    });
    await this.dias.invalidarRanking(existente.participante.desafioId);
    return {
      diaId: dia.id,
      invalidado: dia.invalidado,
      concluido: dia.concluido,
      motivoInvalidacao: dia.motivoInvalidacao,
    };
  }

  /** Fila de conferência (X8): aprova (ou desfaz a aprovação de) um dia concluído e não invalidado. */
  async conferencia(diaId: string, adminId: string, input: ConferenciaInput): Promise<ConferenciaResposta> {
    const existe = await this.prisma.diaDesafio.findUnique({ where: { id: diaId }, select: { id: true } });
    if (!existe) throw new ErroApp('NAO_ENCONTRADO', 'Dia não encontrado.');

    if (!input.conferido) {
      await this.prisma.diaDesafio.update({
        where: { id: diaId },
        data: { conferidoEm: null, conferidoPorId: null },
      });
      return { diaId, conferidoEm: null };
    }

    const conferidoEm = new Date();
    // Condição no próprio UPDATE: se o dia mudou entre a leitura e a escrita, não aprova.
    const r = await this.prisma.diaDesafio.updateMany({
      where: { id: diaId, concluido: true, invalidado: false },
      data: { conferidoEm, conferidoPorId: adminId },
    });
    if (r.count === 0) {
      throw new ErroApp(
        'VALIDACAO',
        'Só dá para aprovar um dia concluído e não invalidado.',
        undefined,
        HttpStatus.CONFLICT,
      );
    }
    return { diaId, conferidoEm: conferidoEm.toISOString() };
  }
}
