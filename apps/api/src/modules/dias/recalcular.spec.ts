import type { PrismaService } from '../../prisma/prisma.service';
import { recalcularDia } from './dia.service';

const COMPLETO = { aguaMl: 3000, exercicio: true, paginasLidas: 10, storyPostado: true, invalidado: false };
const TODAS = [{ tipo: 'AGUA' }, { tipo: 'EXERCICIO' }, { tipo: 'LEITURA' }];

function banco(dia: Record<string, unknown>) {
  const update = jest.fn().mockResolvedValue({});
  const db = { diaDesafio: { findUnique: jest.fn().mockResolvedValue(dia), update } };
  return { db: db as unknown as PrismaService, update };
}

describe('recalcularDia: concluidoEm (R23, X22)', () => {
  it('carimba a hora ao fechar o dia', async () => {
    const { db, update } = banco({ ...COMPLETO, concluido: false, concluidoEm: null, conferidoEm: null, fotos: TODAS });
    const antes = Date.now();
    await expect(recalcularDia(db, 'd')).resolves.toBe(true);
    const data = (update.mock.calls[0] as [{ data: { concluido: boolean; concluidoEm: Date } }])[0].data;
    expect(data.concluido).toBe(true);
    expect(data.concluidoEm.getTime()).toBeGreaterThanOrEqual(antes);
  });

  it('mantém a hora enquanto o dia segue fechado (sem escrita)', async () => {
    const quando = new Date('2026-11-12T10:00:00Z');
    const { db, update } = banco({ ...COMPLETO, concluido: true, concluidoEm: quando, conferidoEm: null, fotos: TODAS });
    await recalcularDia(db, 'd');
    expect(update).not.toHaveBeenCalled();
    // Zerando a conferência, a hora do fechamento continua a mesma.
    const outro = banco({ ...COMPLETO, concluido: true, concluidoEm: quando, conferidoEm: new Date(), fotos: TODAS });
    await recalcularDia(outro.db, 'd', { zerarConferencia: true });
    expect(outro.update).toHaveBeenCalledWith({
      where: { id: 'd' },
      data: { concluido: true, concluidoEm: quando, conferidoEm: null, conferidoPorId: null },
    });
  });

  it('limpa ao desfazer (foto removida, invalidação)', async () => {
    const quando = new Date('2026-11-12T10:00:00Z');
    const { db, update } = banco({ ...COMPLETO, concluido: true, concluidoEm: quando, conferidoEm: null, fotos: TODAS.slice(1) });
    await expect(recalcularDia(db, 'd')).resolves.toBe(false);
    expect(update).toHaveBeenCalledWith({ where: { id: 'd' }, data: { concluido: false, concluidoEm: null } });
    const inv = banco({ ...COMPLETO, invalidado: true, concluido: true, concluidoEm: quando, conferidoEm: null, fotos: TODAS });
    await recalcularDia(inv.db, 'd');
    expect(inv.update).toHaveBeenCalledWith({ where: { id: 'd' }, data: { concluido: false, concluidoEm: null } });
  });

  it('dia concluído antigo sem hora (antes do backfill) ganha a hora agora', async () => {
    const { db, update } = banco({ ...COMPLETO, concluido: true, concluidoEm: null, conferidoEm: null, fotos: TODAS });
    await recalcularDia(db, 'd');
    expect(update).toHaveBeenCalledTimes(1);
  });
});
