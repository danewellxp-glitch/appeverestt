import { HttpStatus, Injectable } from '@nestjs/common';
import type { Desafio } from '@prisma/client';
import type {
  AdminDiaDetalhe,
  AdminParticipante,
  AdminParticipanteDetalhe,
  AdminParticipantesResposta,
  AtualizarDesafioInput,
  ConferenciaInput,
  ConferenciaResposta,
  InvalidacaoInput,
  InvalidacaoResposta,
} from '@everest/shared';
import { ErroApp } from '../../common/erros';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService, chaveVagas } from '../../redis/redis.module';
import { DesafioService } from '../desafios/desafio.service';
import { DiaService, recalcularDia } from '../dias/dia.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly desafios: DesafioService,
    private readonly dias: DiaService,
  ) {}

  private async listar(desafio: Desafio, participanteId?: string): Promise<AdminParticipante[]> {
    const participantes = await this.prisma.participante.findMany({
      where: { desafioId: desafio.id, ...(participanteId ? { id: participanteId } : {}) },
      include: { usuario: { select: { id: true, nome: true, email: true } } },
      orderBy: [{ vagaNumero: { sort: 'asc', nulls: 'first' } }, { dataInscricao: 'asc' }],
    });
    const ids = participantes.map((p) => p.id);
    const [concluidos, invalidados, aRevisar] = await Promise.all([
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
    ]);
    const mapa = (linhas: { participanteId: string; _count: { _all: number } }[]) =>
      new Map(linhas.map((l) => [l.participanteId, l._count._all]));
    const nConcluidos = mapa(concluidos);
    const nInvalidados = mapa(invalidados);
    const nParaRevisar = mapa(aRevisar);
    return participantes.map((p) => ({
      participanteId: p.id,
      usuarioId: p.usuario.id,
      nome: p.usuario.nome,
      email: p.usuario.email,
      vagaNumero: p.vagaNumero,
      ehEmbaixador: p.ehEmbaixador,
      dataInscricao: p.dataInscricao.toISOString(),
      diasConcluidos: nConcluidos.get(p.id) ?? 0,
      diasInvalidados: nInvalidados.get(p.id) ?? 0,
      paraRevisar: nParaRevisar.get(p.id) ?? 0,
    }));
  }

  async participantes(slug: string): Promise<AdminParticipantesResposta> {
    const d = await this.desafios.porSlug(slug);
    const participantes = await this.listar(d);
    return {
      desafio: { slug: d.slug, nome: d.nome, inscricoesAbertas: d.inscricoesAbertas, totalVagas: d.totalVagas },
      participantes,
      totalParaRevisar: participantes.reduce((soma, p) => soma + p.paraRevisar, 0),
    };
  }

  async participante(slug: string, participanteId: string): Promise<AdminParticipanteDetalhe> {
    const d = await this.desafios.porSlug(slug);
    const [p] = await this.listar(d, participanteId);
    if (!p) throw new ErroApp('NAO_ENCONTRADO', 'Participante não encontrado.');
    return {
      participante: p,
      progresso: await this.dias.progresso(d, p.participanteId, new Date(), { paraAdmin: true }),
    };
  }

  async dia(slug: string, participanteId: string, numeroDia: number): Promise<AdminDiaDetalhe> {
    const d = await this.desafios.porSlug(slug);
    const p = await this.prisma.participante.findFirst({
      where: { id: participanteId, desafioId: d.id },
      include: { usuario: { select: { nome: true } } },
    });
    if (!p) throw new ErroApp('NAO_ENCONTRADO', 'Participante não encontrado.');
    const detalhe = await this.dias.detalhe(d, p.id, numeroDia);
    return { ...detalhe, participanteId: p.id, nomeParticipante: p.usuario.nome };
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

  async atualizarDesafio(slug: string, input: AtualizarDesafioInput): Promise<AdminParticipantesResposta['desafio']> {
    const d = await this.desafios.porSlug(slug);
    const atualizado = await this.prisma.desafio.update({
      where: { id: d.id },
      data: { inscricoesAbertas: input.inscricoesAbertas },
    });
    await this.cache.apagar(chaveVagas(d.id));
    return {
      slug: atualizado.slug,
      nome: atualizado.nome,
      inscricoesAbertas: atualizado.inscricoesAbertas,
      totalVagas: atualizado.totalVagas,
    };
  }
}
