import { Prisma, type Desafio, type Participante } from '@prisma/client';
import { ErroApp } from '../../common/erros';
import type { PrismaService } from '../../prisma/prisma.service';
import type { CacheService } from '../../redis/redis.module';
import type { StorageService } from '../../storage/storage.service';
import { TreinosService } from './treinos.service';

const DESAFIO = { id: 'd1', dataInicio: new Date('2026-11-01T00:00:00Z'), totalDias: 30, timezone: 'America/Sao_Paulo' } as Desafio;
const NO_DIA_12 = new Date('2026-11-12T15:00:00-03:00');

const usuario = (nome: string, excluido = false) => ({ nome, fotoUrl: 'f', excluidoEm: excluido ? new Date() : null });
const foto = (participanteId: string, nome: string, extra: { status?: string; concluido?: boolean } = {}) => ({
  status: extra.status ?? 'CONFIRMADA',
  storageKey: `k/${participanteId}.webp`,
  thumbKey: `k/${participanteId}.thumb.webp`,
  dia: { participanteId, concluido: extra.concluido ?? true, participante: { usuario: usuario(nome) } },
});

function montar(opcoes: { fotos?: unknown[]; pose?: unknown; meusTreinos?: number; poseDuplicada?: boolean } = {}) {
  const prisma = {
    fotoProva: {
      findMany: jest.fn().mockResolvedValue(opcoes.fotos ?? []),
      count: jest.fn().mockResolvedValue(opcoes.meusTreinos ?? 0),
    },
    poseDia: {
      findUnique: jest.fn().mockResolvedValue(opcoes.pose ?? null),
      create: jest.fn(async () => {
        if (opcoes.poseDuplicada) throw new Prisma.PrismaClientKnownRequestError('único', { code: 'P2002', clientVersion: 'x' });
        return {};
      }),
    },
  };
  const guardado = new Map<string, unknown>();
  const cache = {
    versao: jest.fn().mockResolvedValue('v1'),
    obter: jest.fn(async (k: string) => guardado.get(k) ?? null),
    guardar: jest.fn(async (k: string, v: unknown) => void guardado.set(k, v)),
    apagar: jest.fn(),
  };
  const storage = { urlLeitura: jest.fn(async (k: string) => `https://assinada/${k}`) };
  const s = new TreinosService(
    prisma as unknown as PrismaService,
    cache as unknown as CacheService,
    storage as unknown as StorageService,
  );
  return { s, prisma, cache };
}

async function codigo(p: Promise<unknown>): Promise<string | null> {
  try {
    await p;
    return null;
  } catch (e) {
    return e instanceof ErroApp ? (e.getResponse() as { codigo: string }).codigo : 'OUTRO';
  }
}

describe('TreinosService (R23)', () => {
  it('filtra no banco: só EXERCICIO válida, visível, dia não invalidado, confirmado e conta ativa', async () => {
    const { s, prisma } = montar();
    await s.treinos(DESAFIO, 'p1', undefined, NO_DIA_12);
    const where = (prisma.fotoProva.findMany.mock.calls[0] as [{ where: unknown }])[0].where;
    expect(where).toEqual({
      tipo: 'EXERCICIO',
      status: { in: ['ENVIADA', 'CONFIRMADA'] },
      visivelTurma: true,
      dia: {
        numeroDia: 12,
        invalidado: false,
        participante: { desafioId: 'd1', pagamentoStatus: 'CONFIRMADO', usuario: { excluidoEm: null } },
      },
    });
  });

  it('monta as fotos com URLs assinadas, nome curto e `minha` por quem pede (fora do cache)', async () => {
    const { s, cache } = montar({ fotos: [foto('p2', 'Maria Lima'), foto('p1', 'João Pedro', { status: 'ENVIADA', concluido: false })] });
    const r = await s.treinos(DESAFIO, 'p1', undefined, NO_DIA_12);
    expect(r).toMatchObject({ diaAtual: 12, dia: 12, status: 'EM_ANDAMENTO', pose: null });
    expect(r.fotos).toEqual([
      {
        participanteId: 'p2',
        nomeExibicao: 'Maria L.',
        iniciais: 'ML',
        fotoUrl: 'f',
        thumbUrl: 'https://assinada/k/p2.thumb.webp',
        url: 'https://assinada/k/p2.webp',
        concluidoDia: true,
        minha: false,
      },
      expect.objectContaining({ participanteId: 'p1', thumbUrl: null, concluidoDia: false, minha: true }),
    ]);
    // O cache compartilhado não guarda campos de quem pede.
    const guardado = (cache.guardar.mock.calls[0] as [string, { fotos: object[] }])[1];
    expect(cache.guardar.mock.calls[0]?.[0]).toBe('treinos:d1:v1:12');
    expect(guardado.fotos.every((f) => !('minha' in f))).toBe(true);
  });

  it('dia fora de 1..diaAtual: VALIDACAO; dia passado é aceito', async () => {
    const { s } = montar();
    expect(await codigo(s.treinos(DESAFIO, 'p1', 13, NO_DIA_12))).toBe('VALIDACAO');
    expect(await codigo(s.treinos(DESAFIO, 'p1', 0, NO_DIA_12))).toBe('VALIDACAO');
    await expect(s.treinos(DESAFIO, 'p1', 3, NO_DIA_12)).resolves.toMatchObject({ dia: 3, possoSugerirPose: false });
  });

  it('antes do início: sem dia e sem fotos', async () => {
    const { s, prisma } = montar();
    const r = await s.treinos(DESAFIO, 'p1', undefined, new Date('2026-10-20T12:00:00-03:00'));
    expect(r).toEqual({ diaAtual: null, dia: null, status: 'NAO_INICIADO', pose: null, possoSugerirPose: false, fotos: [] });
    expect(prisma.fotoProva.findMany).not.toHaveBeenCalled();
  });

  it('possoSugerirPose: sem pose ainda e com foto de treino válida hoje', async () => {
    expect((await montar({ meusTreinos: 1 }).s.treinos(DESAFIO, 'p1', undefined, NO_DIA_12)).possoSugerirPose).toBe(true);
    expect((await montar({ meusTreinos: 0 }).s.treinos(DESAFIO, 'p1', undefined, NO_DIA_12)).possoSugerirPose).toBe(false);
    const comPose = montar({
      meusTreinos: 1,
      pose: { texto: 'Prancha', criadoEm: new Date('2026-11-12T10:00:00Z'), autor: { usuario: usuario('Ana Souza') } },
    });
    const r = await comPose.s.treinos(DESAFIO, 'p1', undefined, NO_DIA_12);
    expect(r.possoSugerirPose).toBe(false);
    expect(r.pose).toEqual({
      texto: 'Prancha',
      autor: { nomeExibicao: 'Ana S.', iniciais: 'AS', fotoUrl: 'f' },
      criadoEm: '2026-11-12T10:00:00.000Z',
    });
  });

  it('pose de conta excluída aparece como "Participante removido"', async () => {
    const { s } = montar({ pose: { texto: 'Prancha', criadoEm: new Date(), autor: { usuario: usuario('Ana Souza', true) } } });
    const r = await s.treinos(DESAFIO, 'p1', undefined, NO_DIA_12);
    expect(r.pose?.autor).toEqual({ nomeExibicao: 'Participante removido', iniciais: 'PR', fotoUrl: null });
  });

  describe('sugerirPose', () => {
    const eu = { id: 'p1' } as Participante;
    const pose = { texto: 'Prancha', criadoEm: new Date(), autor: { usuario: usuario('João Pedro') } };

    it('sem foto de treino hoje: POSE_SEM_TREINO', async () => {
      const { s, prisma } = montar({ meusTreinos: 0 });
      expect(await codigo(s.sugerirPose(DESAFIO, eu, { texto: 'Prancha' }, NO_DIA_12))).toBe('POSE_SEM_TREINO');
      expect(prisma.poseDia.create).not.toHaveBeenCalled();
    });

    it('a primeira cria (dia atual) e invalida o cache; a segunda: POSE_JA_DEFINIDA', async () => {
      const ok = montar({ meusTreinos: 1, pose });
      await expect(ok.s.sugerirPose(DESAFIO, eu, { texto: 'Prancha' }, NO_DIA_12)).resolves.toMatchObject({
        pose: { texto: 'Prancha' },
      });
      expect(ok.prisma.poseDia.create).toHaveBeenCalledWith({
        data: { desafioId: 'd1', numeroDia: 12, texto: 'Prancha', autorId: 'p1' },
      });
      expect(ok.cache.apagar).toHaveBeenCalledWith('treinos:d1:versao');
      const dup = montar({ meusTreinos: 1, poseDuplicada: true });
      expect(await codigo(dup.s.sugerirPose(DESAFIO, eu, { texto: 'Prancha' }, NO_DIA_12))).toBe('POSE_JA_DEFINIDA');
    });

    it('fora do período: erro do desafio', async () => {
      const { s } = montar({ meusTreinos: 1 });
      expect(await codigo(s.sugerirPose(DESAFIO, eu, { texto: 'Prancha' }, new Date('2026-12-05T12:00:00-03:00')))).toBe(
        'DESAFIO_ENCERRADO',
      );
    });
  });
});
