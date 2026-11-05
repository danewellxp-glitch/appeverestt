import { Injectable } from '@nestjs/common';
import type { Desafio } from '@prisma/client';
import { iniciais, nomeExibicao, type PessoaHoje, type TurmaHojeResposta } from '@everest/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService, chaveTurma } from '../../redis/redis.module';
import { NOME_REMOVIDO } from '../auth/auth.service';
import { infoTempo } from '../desafios/desafio.service';
import { RankingService } from './ranking.service';

export const TTL_TURMA_S = 60;

/** Parte da aba Hoje que é igual para todo mundo (vai para o cache). */
export type TurmaHojeCompartilhada = Omit<TurmaHojeResposta, 'minhasCutucadasHoje'>;

interface UsuarioLinha {
  nome: string;
  fotoUrl: string | null;
  excluidoEm: Date | null;
  aceitaCutucadas: boolean;
}

/** "Nome S." + iniciais + foto; conta excluída vira "Participante removido" (X5). Nunca e-mail. */
export function pessoaHoje(participanteId: string, u: UsuarioLinha, concluidoEm: Date | null): PessoaHoje {
  const removido = u.excluidoEm !== null;
  const nome = removido ? NOME_REMOVIDO : u.nome;
  return {
    participanteId,
    nomeExibicao: removido ? NOME_REMOVIDO : nomeExibicao(nome),
    iniciais: iniciais(nome),
    fotoUrl: removido ? null : u.fotoUrl,
    concluidoEm: concluidoEm?.toISOString() ?? null,
    aceitaCutucadas: !removido && u.aceitaCutucadas,
  };
}

/** Aba Hoje do hub da turma (R23): quem fechou o dia atual e quem falta. Cache de 60 s. */
@Injectable()
export class TurmaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly ranking: RankingService,
  ) {}

  async compartilhada(desafio: Desafio, agora = new Date()): Promise<TurmaHojeCompartilhada> {
    const chave = chaveTurma(desafio.id);
    const emCache = await this.cache.obter<TurmaHojeCompartilhada>(chave);
    if (emCache) return emCache;

    const t = infoTempo(desafio, agora);
    const diaAtual = t.status === 'EM_ANDAMENTO' ? t.diaAtual : null;

    // Só pagamento CONFIRMADO (X12); a ordem de `faltam` é a do ranking.
    const [itens, participantes, diasFechados] = await Promise.all([
      this.ranking.itens(desafio, agora),
      this.prisma.participante.findMany({
        where: { desafioId: desafio.id, pagamentoStatus: 'CONFIRMADO' },
        select: {
          id: true,
          usuario: { select: { nome: true, fotoUrl: true, excluidoEm: true, aceitaCutucadas: true } },
        },
      }),
      diaAtual === null
        ? Promise.resolve([])
        : this.prisma.diaDesafio.findMany({
            where: {
              numeroDia: diaAtual,
              concluido: true,
              invalidado: false,
              participante: { desafioId: desafio.id, pagamentoStatus: 'CONFIRMADO' },
            },
            select: { participanteId: true, concluidoEm: true, atualizadoEm: true },
          }),
    ]);

    const porId = new Map(participantes.map((p) => [p.id, p.usuario]));
    const fechou = new Map(diasFechados.map((d) => [d.participanteId, d.concluidoEm ?? d.atualizadoEm]));

    const fecharam = [...fechou.entries()]
      .sort((a, b) => b[1].getTime() - a[1].getTime())
      .flatMap(([id, quando]) => {
        const u = porId.get(id);
        return u ? [pessoaHoje(id, u, quando)] : [];
      });

    // Contas excluídas não aparecem em "ainda não fecharam" (não há quem cutucar).
    const faltam: PessoaHoje[] = [];
    if (diaAtual !== null) {
      for (const item of itens) {
        const u = porId.get(item.participanteId);
        if (!u || u.excluidoEm || fechou.has(item.participanteId)) continue;
        faltam.push(pessoaHoje(item.participanteId, u, null));
      }
    }

    const resposta: TurmaHojeCompartilhada = {
      diaAtual,
      status: t.status,
      totalParticipantes:
        diaAtual === null
          ? participantes.filter((p) => p.usuario.excluidoEm === null).length
          : fecharam.length + faltam.length,
      fecharam,
      faltam,
    };
    await this.cache.guardar(chave, resposta, TTL_TURMA_S);
    return resposta;
  }

  /** `minhasCutucadasHoje` fica fora do cache (é de quem pede). */
  async hoje(desafio: Desafio, participanteId: string, agora = new Date()): Promise<TurmaHojeResposta> {
    const base = await this.compartilhada(desafio, agora);
    const minhas =
      base.diaAtual === null
        ? []
        : await this.prisma.cutucada.findMany({
            where: { deId: participanteId, numeroDia: base.diaAtual },
            select: { paraId: true },
          });
    return { ...base, minhasCutucadasHoje: minhas.map((c) => c.paraId) };
  }
}
