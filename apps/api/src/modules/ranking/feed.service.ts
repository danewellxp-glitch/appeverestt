import { Injectable } from '@nestjs/common';
import type { Desafio } from '@prisma/client';
import { iniciais, nomeExibicao, type FeedResposta } from '@everest/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService, chaveFeed } from '../../redis/redis.module';
import { NOME_REMOVIDO } from '../auth/auth.service';
import { DesafioService, infoTempo } from '../desafios/desafio.service';
import { RankingService } from './ranking.service';

export const TTL_FEED_S = 60;
const MAX_AVATARES = 4;

/** Atividade do grupo na home (/desafio) e no painel do embaixador. Cache de 60 s. */
@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly desafios: DesafioService,
    private readonly ranking: RankingService,
  ) {}

  async feed(desafio: Desafio, agora = new Date()): Promise<FeedResposta> {
    const chave = chaveFeed(desafio.id);
    const emCache = await this.cache.obter<FeedResposta>(chave);
    if (emCache) return emCache;

    const t = infoTempo(desafio, agora);
    const diaAtual = t.status === 'EM_ANDAMENTO' ? t.diaAtual : null;
    // Só pagamento CONFIRMADO (X12); `vagasOcupadas` continua contando toda vaga reservada.
    const filtroHoje = {
      participante: { desafioId: desafio.id, pagamentoStatus: 'CONFIRMADO' as const },
      numeroDia: diaAtual ?? -1,
      concluido: true,
      invalidado: false,
    };

    const [fecharamHoje, recentes, itens, vagasOcupadas] = await Promise.all([
      diaAtual === null ? Promise.resolve(0) : this.prisma.diaDesafio.count({ where: filtroHoje }),
      diaAtual === null
        ? Promise.resolve([])
        : this.prisma.diaDesafio.findMany({
            where: filtroHoje,
            orderBy: { atualizadoEm: 'desc' },
            take: MAX_AVATARES,
            select: {
              participante: { select: { usuario: { select: { nome: true, fotoUrl: true, excluidoEm: true } } } },
            },
          }),
      this.ranking.itens(desafio, agora),
      this.desafios.vagasOcupadas(desafio.id),
    ]);

    const lider = itens.reduce<(typeof itens)[number] | null>(
      (melhor, i) => (i.sequenciaAtual > (melhor?.sequenciaAtual ?? 0) ? i : melhor),
      null,
    );

    const resposta: FeedResposta = {
      diaAtual,
      fecharamHoje,
      avataresHoje: recentes.map(({ participante: { usuario: u } }) => {
        const nome = u.excluidoEm ? NOME_REMOVIDO : u.nome;
        return {
          nomeExibicao: u.excluidoEm ? NOME_REMOVIDO : nomeExibicao(nome),
          iniciais: iniciais(nome),
          fotoUrl: u.excluidoEm ? null : u.fotoUrl,
        };
      }),
      maiorSequenciaAtiva: lider ? { nomeExibicao: lider.nomeExibicao, dias: lider.sequenciaAtual } : null,
      vagasOcupadas,
      totalVagas: desafio.totalVagas,
    };
    await this.cache.guardar(chave, resposta, TTL_FEED_S);
    return resposta;
  }
}
