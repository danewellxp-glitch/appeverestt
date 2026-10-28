import { Injectable } from '@nestjs/common';
import type { Desafio } from '@prisma/client';
import {
  calcularMelhorSequencia,
  calcularSequenciaAtual,
  nomeExibicao,
  ordenarRanking,
  type ItemRankingPosicionado,
  type RankingResposta,
} from '@everest/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService, chaveRanking } from '../../redis/redis.module';
import { infoTempo } from '../desafios/desafio.service';
import { diaReferenciaSequencia } from '../dias/dia.service';

export const TTL_RANKING_S = 60;

interface LinhaAgregada {
  id: string;
  nome: string;
  ehEmbaixador: boolean;
  dataInscricao: Date;
  diasConcluidos: number;
}

@Injectable()
export class RankingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /** Ranking ordenado (Q4/Q5). Só "Nome S." — nunca e-mail. Cache de 60 s. */
  async itens(desafio: Desafio, agora = new Date()): Promise<ItemRankingPosicionado[]> {
    const chave = chaveRanking(desafio.id);
    const emCache = await this.cache.obter<ItemRankingPosicionado[]>(chave);
    if (emCache) return emCache;

    const linhas = await this.prisma.$queryRaw<LinhaAgregada[]>`
      SELECT p.id, u.nome, p."ehEmbaixador", p."dataInscricao",
             COUNT(d.id) FILTER (WHERE d.concluido AND NOT d.invalidado)::int AS "diasConcluidos"
      FROM "Participante" p
      JOIN "Usuario" u ON u.id = p."usuarioId"
      LEFT JOIN "DiaDesafio" d ON d."participanteId" = p.id
      WHERE p."desafioId" = ${desafio.id}
      GROUP BY p.id, u.nome`;

    const diasOk = await this.prisma.$queryRaw<{ participanteId: string; numeroDia: number }[]>`
      SELECT d."participanteId", d."numeroDia"
      FROM "DiaDesafio" d
      JOIN "Participante" p ON p.id = d."participanteId"
      WHERE p."desafioId" = ${desafio.id} AND d.concluido AND NOT d.invalidado`;

    const porParticipante = new Map<string, boolean[]>();
    for (const l of linhas) porParticipante.set(l.id, new Array<boolean>(desafio.totalDias).fill(false));
    for (const d of diasOk) {
      const arr = porParticipante.get(d.participanteId);
      if (arr && d.numeroDia >= 1 && d.numeroDia <= desafio.totalDias) arr[d.numeroDia - 1] = true;
    }

    const ref = diaReferenciaSequencia(infoTempo(desafio, agora), desafio.totalDias);
    const itens = ordenarRanking(
      linhas.map((l) => {
        const concluidos = porParticipante.get(l.id) ?? [];
        return {
          participanteId: l.id,
          nomeExibicao: nomeExibicao(l.nome),
          ehEmbaixador: l.ehEmbaixador,
          diasConcluidos: l.diasConcluidos,
          melhorSequencia: calcularMelhorSequencia(concluidos),
          sequenciaAtual: calcularSequenciaAtual(concluidos, ref),
          dataInscricao: l.dataInscricao.toISOString(),
        };
      }),
    );
    await this.cache.guardar(chave, itens, TTL_RANKING_S);
    return itens;
  }

  async ranking(desafio: Desafio, participanteId: string): Promise<RankingResposta> {
    const itens = await this.itens(desafio);
    const minha = itens.find((i) => i.participanteId === participanteId);
    return { itens, minhaPosicao: minha?.posicao ?? null };
  }
}
