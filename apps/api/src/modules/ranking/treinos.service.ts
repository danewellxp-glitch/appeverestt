import { Injectable } from '@nestjs/common';
import { Prisma, type Desafio, type Participante } from '@prisma/client';
import {
  iniciais,
  nomeExibicao,
  type FotoTreinoTurma,
  type PoseDia,
  type PoseDiaInput,
  type PoseDiaResposta,
  type TreinosTurmaResposta,
} from '@everest/shared';
import { ErroApp } from '../../common/erros';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService, chaveTreinos, chaveTreinosVersao } from '../../redis/redis.module';
import { StorageService } from '../../storage/storage.service';
import { NOME_REMOVIDO } from '../auth/auth.service';
import { infoTempo } from '../desafios/desafio.service';

/** Bem abaixo dos 10 min das URLs assinadas (D9). */
export const TTL_TREINOS_S = 60;
/** A versão das chaves de treinos dura mais que as entradas; some sozinha se o desafio parar. */
export const TTL_VERSAO_TREINOS_S = 24 * 60 * 60;

const STATUS_VALIDOS = ['ENVIADA', 'CONFIRMADA'] as const;

/** Foto da turma sem o campo de quem pede (é o que vai para o cache compartilhado). */
export type FotoTreinoCompartilhada = Omit<FotoTreinoTurma, 'minha'>;

export interface TreinosDoDia {
  pose: PoseDia | null;
  fotos: FotoTreinoCompartilhada[];
}

interface AutorLinha {
  nome: string;
  fotoUrl: string | null;
  excluidoEm: Date | null;
}

function pessoa(u: AutorLinha): { nomeExibicao: string; iniciais: string; fotoUrl: string | null } {
  const removido = u.excluidoEm !== null;
  const nome = removido ? NOME_REMOVIDO : u.nome;
  return {
    nomeExibicao: removido ? NOME_REMOVIDO : nomeExibicao(nome),
    iniciais: iniciais(nome),
    fotoUrl: removido ? null : u.fotoUrl,
  };
}

/** Dia corrente para a aba Treinos: EM_ANDAMENTO = hoje; ENCERRADO = último; NAO_INICIADO = nenhum. */
export function ultimoDiaComTreinos(desafio: Desafio, agora = new Date()): { diaAtual: number | null; limite: number } {
  const t = infoTempo(desafio, agora);
  if (t.status === 'EM_ANDAMENTO' && t.diaAtual !== null) return { diaAtual: t.diaAtual, limite: t.diaAtual };
  if (t.status === 'ENCERRADO') return { diaAtual: null, limite: desafio.totalDias };
  return { diaAtual: null, limite: 0 };
}

function ehP2002(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

/**
 * Aba Treinos do hub da turma (R23): fotos do treino (EXERCICIO) que a turma pode ver e a pose do
 * dia (X24, X25). Água e leitura continuam privadas.
 */
@Injectable()
export class TreinosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly storage: StorageService,
  ) {}

  /** Parte compartilhada (cache por dia, versão invalidada junto com o ranking/visibilidade/pose). */
  async doDia(desafio: Desafio, dia: number): Promise<TreinosDoDia> {
    const versao = await this.cache.versao(chaveTreinosVersao(desafio.id), TTL_VERSAO_TREINOS_S);
    const chave = versao === null ? null : chaveTreinos(desafio.id, versao, dia);
    if (chave) {
      const emCache = await this.cache.obter<TreinosDoDia>(chave);
      if (emCache) return emCache;
    }

    const [fotos, pose] = await Promise.all([
      this.prisma.fotoProva.findMany({
        where: {
          tipo: 'EXERCICIO',
          status: { in: [...STATUS_VALIDOS] },
          visivelTurma: true,
          dia: {
            numeroDia: dia,
            invalidado: false,
            participante: { desafioId: desafio.id, pagamentoStatus: 'CONFIRMADO', usuario: { excluidoEm: null } },
          },
        },
        orderBy: { criadoEm: 'desc' },
        select: {
          status: true,
          storageKey: true,
          thumbKey: true,
          dia: {
            select: {
              participanteId: true,
              concluido: true,
              participante: { select: { usuario: { select: { nome: true, fotoUrl: true, excluidoEm: true } } } },
            },
          },
        },
      }),
      this.pose(desafio.id, dia),
    ]);

    const resposta: TreinosDoDia = {
      pose,
      fotos: await Promise.all(
        fotos.map(async (f) => ({
          participanteId: f.dia.participanteId,
          ...pessoa(f.dia.participante.usuario),
          thumbUrl: f.status === 'CONFIRMADA' && f.thumbKey ? await this.storage.urlLeitura(f.thumbKey) : null,
          url: await this.storage.urlLeitura(f.storageKey),
          concluidoDia: f.dia.concluido,
        })),
      ),
    };
    if (chave) await this.cache.guardar(chave, resposta, TTL_TREINOS_S);
    return resposta;
  }

  async pose(desafioId: string, dia: number): Promise<PoseDia | null> {
    const p = await this.prisma.poseDia.findUnique({
      where: { desafioId_numeroDia: { desafioId, numeroDia: dia } },
      select: {
        texto: true,
        criadoEm: true,
        autor: { select: { usuario: { select: { nome: true, fotoUrl: true, excluidoEm: true } } } },
      },
    });
    return p ? { texto: p.texto, autor: pessoa(p.autor.usuario), criadoEm: p.criadoEm.toISOString() } : null;
  }

  /** A pessoa mandou a foto do treino (válida) nesse dia, num dia não invalidado. Visível ou não. */
  async temTreino(participanteId: string, dia: number): Promise<boolean> {
    const n = await this.prisma.fotoProva.count({
      where: {
        tipo: 'EXERCICIO',
        status: { in: [...STATUS_VALIDOS] },
        dia: { participanteId, numeroDia: dia, invalidado: false },
      },
    });
    return n > 0;
  }

  /** `dia` omitido = o dia atual (ou o último, com o desafio encerrado). Aceita dias passados. */
  async treinos(
    desafio: Desafio,
    participanteId: string,
    diaPedido?: number,
    agora = new Date(),
  ): Promise<TreinosTurmaResposta> {
    const t = infoTempo(desafio, agora);
    const { diaAtual, limite } = ultimoDiaComTreinos(desafio, agora);
    if (diaPedido !== undefined && (diaPedido < 1 || diaPedido > limite)) {
      throw new ErroApp(
        'VALIDACAO',
        limite === 0 ? 'O desafio ainda não começou.' : `Escolha um dia entre 1 e ${limite}.`,
        { dia: 'Dia inválido.' },
      );
    }
    const dia = diaPedido ?? (limite > 0 ? limite : null);
    if (dia === null) {
      return { diaAtual, dia: null, status: t.status, pose: null, possoSugerirPose: false, fotos: [] };
    }

    const base = await this.doDia(desafio, dia);
    const possoSugerirPose =
      base.pose === null && dia === diaAtual && (await this.temTreino(participanteId, dia));
    return {
      diaAtual,
      dia,
      status: t.status,
      pose: base.pose,
      possoSugerirPose,
      fotos: base.fotos.map((f) => ({ ...f, minha: f.participanteId === participanteId })),
    };
  }

  /**
   * Pose do dia (X25): só no dia atual, só quem já mandou a foto do treino do dia, e só a primeira
   * (único por desafio+dia no banco).
   */
  async sugerirPose(
    desafio: Desafio,
    participante: Participante,
    input: PoseDiaInput,
    agora = new Date(),
  ): Promise<PoseDiaResposta> {
    const t = infoTempo(desafio, agora);
    if (t.status === 'NAO_INICIADO') throw new ErroApp('DESAFIO_NAO_INICIADO');
    if (t.status === 'ENCERRADO' || t.diaAtual === null) throw new ErroApp('DESAFIO_ENCERRADO');
    const dia = t.diaAtual;
    if (!(await this.temTreino(participante.id, dia))) throw new ErroApp('POSE_SEM_TREINO');
    try {
      await this.prisma.poseDia.create({
        data: { desafioId: desafio.id, numeroDia: dia, texto: input.texto, autorId: participante.id },
      });
    } catch (e) {
      if (ehP2002(e)) throw new ErroApp('POSE_JA_DEFINIDA');
      throw e;
    }
    await this.cache.apagar(chaveTreinosVersao(desafio.id));
    const pose = await this.pose(desafio.id, dia);
    if (!pose) throw new ErroApp('ERRO_INTERNO');
    return { pose };
  }
}
