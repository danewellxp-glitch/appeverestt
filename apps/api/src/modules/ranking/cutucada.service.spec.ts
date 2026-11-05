import { Prisma, type Desafio, type Participante } from '@prisma/client';
import { ErroApp } from '../../common/erros';
import type { PrismaService } from '../../prisma/prisma.service';
import type { PushService } from '../push/push.service';
import { CutucadaService } from './cutucada.service';

/** Desafio de 30 dias a partir de 01/11/2026 (Brasília). Dia 12 = 12/11. */
const DESAFIO = { id: 'd1', dataInicio: new Date('2026-11-01T00:00:00Z'), totalDias: 30, timezone: 'America/Sao_Paulo' } as Desafio;
const NO_DIA_12 = new Date('2026-11-12T15:00:00-03:00');
const REMETENTE = { id: 'p1', usuarioId: 'u1' } as Participante;

interface Destino {
  aceitaCutucadas?: boolean;
  dia?: { concluido: boolean; invalidado: boolean };
}

function montar(opcoes: { destino?: Destino | null; configurado?: boolean; aparelhos?: number; duplicada?: boolean } = {}) {
  const destino = opcoes.destino === undefined ? {} : opcoes.destino;
  const prisma = {
    participante: {
      findFirst: jest.fn().mockResolvedValue(
        destino === null
          ? null
          : {
              usuarioId: 'u2',
              usuario: { aceitaCutucadas: destino.aceitaCutucadas ?? true },
              dias: destino.dia ? [destino.dia] : [],
            },
      ),
    },
    cutucada: {
      create: jest.fn(async () => {
        if (opcoes.duplicada) {
          throw new Prisma.PrismaClientKnownRequestError('único', { code: 'P2002', clientVersion: 'x' });
        }
        return {};
      }),
    },
    usuario: { findUnique: jest.fn().mockResolvedValue({ nome: 'Maria Lima' }) },
  };
  const aparelhos = Array.from({ length: opcoes.aparelhos ?? 1 }, (_, i) => ({ id: `i${i}` }));
  const push = {
    configurado: opcoes.configurado ?? true,
    aparelhosDoUsuario: jest.fn().mockResolvedValue(aparelhos),
    enviar: jest.fn().mockResolvedValue({ destinatarios: aparelhos.length, entregues: aparelhos.length, removidas: 0, falhas: 0 }),
  };
  const s = new CutucadaService(prisma as unknown as PrismaService, push as unknown as PushService);
  return { s, prisma, push };
}

async function codigo(p: Promise<unknown>): Promise<string | null> {
  try {
    await p;
    return null;
  } catch (e) {
    return e instanceof ErroApp ? (e.getResponse() as { codigo: string }).codigo : 'OUTRO';
  }
}

describe('CutucadaService.cutucar (R23)', () => {
  it('grava e manda o push com o modelo da cutucada', async () => {
    const { s, prisma, push } = montar();
    await expect(s.cutucar(DESAFIO, REMETENTE, 'p2', NO_DIA_12)).resolves.toEqual({ entregue: true });
    expect(prisma.cutucada.create).toHaveBeenCalledWith({ data: { deId: 'p1', paraId: 'p2', numeroDia: 12 } });
    expect(push.aparelhosDoUsuario).toHaveBeenCalledWith('u2');
    expect(push.enviar).toHaveBeenCalledWith(expect.any(Array), {
      titulo: 'Maria L. te cutucou 👋',
      corpo: 'Bora fechar o dia 12!',
      url: '/hoje',
      tag: 'cutucada-p1',
    });
  });

  it('a si mesmo: VALIDACAO', async () => {
    const { s, prisma } = montar();
    expect(await codigo(s.cutucar(DESAFIO, REMETENTE, 'p1', NO_DIA_12))).toBe('VALIDACAO');
    expect(prisma.cutucada.create).not.toHaveBeenCalled();
  });

  it('fora do período: erro do desafio', async () => {
    const { s } = montar();
    expect(await codigo(s.cutucar(DESAFIO, REMETENTE, 'p2', new Date('2026-10-30T12:00:00-03:00')))).toBe(
      'DESAFIO_NAO_INICIADO',
    );
    expect(await codigo(s.cutucar(DESAFIO, REMETENTE, 'p2', new Date('2026-12-05T12:00:00-03:00')))).toBe(
      'DESAFIO_ENCERRADO',
    );
  });

  it('destinatário de fora (não confirmado, excluído, outro desafio): NAO_ENCONTRADO', async () => {
    const { s } = montar({ destino: null });
    expect(await codigo(s.cutucar(DESAFIO, REMETENTE, 'p9', NO_DIA_12))).toBe('NAO_ENCONTRADO');
  });

  it('opt-out ou dia já fechado: CUTUCADA_RECUSADA (sem gravar)', async () => {
    const optOut = montar({ destino: { aceitaCutucadas: false } });
    expect(await codigo(optOut.s.cutucar(DESAFIO, REMETENTE, 'p2', NO_DIA_12))).toBe('CUTUCADA_RECUSADA');
    expect(optOut.prisma.cutucada.create).not.toHaveBeenCalled();
    const fechou = montar({ destino: { dia: { concluido: true, invalidado: false } } });
    expect(await codigo(fechou.s.cutucar(DESAFIO, REMETENTE, 'p2', NO_DIA_12))).toBe('CUTUCADA_RECUSADA');
    // Dia concluído mas invalidado pelo embaixador conta como "não fechou".
    const invalidado = montar({ destino: { dia: { concluido: true, invalidado: true } } });
    await expect(invalidado.s.cutucar(DESAFIO, REMETENTE, 'p2', NO_DIA_12)).resolves.toEqual({ entregue: true });
  });

  it('duplicada no mesmo dia: JA_CUTUCOU (P2002) e nenhum push', async () => {
    const { s, push } = montar({ duplicada: true });
    expect(await codigo(s.cutucar(DESAFIO, REMETENTE, 'p2', NO_DIA_12))).toBe('JA_CUTUCOU');
    expect(push.enviar).not.toHaveBeenCalled();
  });

  it('sem VAPID ou sem aparelho: grava e devolve entregue false', async () => {
    const semVapid = montar({ configurado: false });
    await expect(semVapid.s.cutucar(DESAFIO, REMETENTE, 'p2', NO_DIA_12)).resolves.toEqual({ entregue: false });
    expect(semVapid.prisma.cutucada.create).toHaveBeenCalled();
    expect(semVapid.push.enviar).not.toHaveBeenCalled();
    const semAparelho = montar({ aparelhos: 0 });
    await expect(semAparelho.s.cutucar(DESAFIO, REMETENTE, 'p2', NO_DIA_12)).resolves.toEqual({ entregue: false });
  });

  it('falha no envio não desfaz a cutucada', async () => {
    const { s, push } = montar();
    push.enviar.mockRejectedValueOnce(new Error('rede'));
    await expect(s.cutucar(DESAFIO, REMETENTE, 'p2', NO_DIA_12)).resolves.toEqual({ entregue: false });
  });
});
