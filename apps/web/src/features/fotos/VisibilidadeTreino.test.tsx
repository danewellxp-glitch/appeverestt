import type { DiaDetalhe, FotoDia } from '@everest/shared';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/api';
import { chaves } from '../../lib/queries';
import { SLUG, apiSimulada, montarComProvedores } from '../ranking/fixturesTurma';

const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api')>()),
  api: mocks.api,
}));

const { CardFotos } = await import('./CardFotos');

const ROTA = `/desafios/${SLUG}/dias/5/fotos/EXERCICIO/visibilidade`;

function foto(tipo: FotoDia['tipo'], extra: Partial<FotoDia> = {}): FotoDia {
  return { id: `f-${tipo}`, tipo, status: 'CONFIRMADA', thumbUrl: `https://x/${tipo}.webp`, url: `https://x/${tipo}.webp`, visivelTurma: true, ...extra };
}

function dia(fotos: FotoDia[]): DiaDetalhe {
  return { numeroDia: 5, fotos } as unknown as DiaDetalhe;
}

function montar(fotos: FotoDia[]) {
  const r = montarComProvedores(<CardFotos slug={SLUG} numeroDia={5} fotos={fotos} editavel />);
  r.qc.setQueryData(chaves.dia(SLUG, 5), dia(fotos));
  return r;
}

afterEach(cleanup);
beforeEach(() => {
  mocks.api.mockReset();
});

describe('Check-in → foto do treino visível para a turma', () => {
  it('sem foto do treino: só o aviso, sem o interruptor', () => {
    montar([foto('AGUA')]);
    expect(screen.getByText(/A foto do treino fica visível para a turma/)).toBeTruthy();
    expect(screen.queryByRole('switch', { name: 'Esconder da turma' })).toBeNull();
  });

  it('esconder: PATCH com visivel=false e cache do dia atualizado', async () => {
    mocks.api.mockImplementation(apiSimulada({ [ROTA]: (o) => ({ visivelTurma: (o?.body as { visivel: boolean }).visivel }) }));
    const { qc } = montar([foto('EXERCICIO')]);
    const interruptor = screen.getByRole('switch', { name: 'Esconder da turma' });
    expect(interruptor.getAttribute('aria-checked')).toBe('false');
    await act(async () => {
      fireEvent.click(interruptor);
    });
    expect(mocks.api).toHaveBeenCalledWith(ROTA, { method: 'PATCH', body: { visivel: false } });
    expect(qc.getQueryData<DiaDetalhe>(chaves.dia(SLUG, 5))?.fotos[0]?.visivelTurma).toBe(false);
    expect(await screen.findByText('Foto do treino escondida da turma.')).toBeTruthy();
  });

  it('escondida: interruptor ligado, selo no slot e mostrar de novo manda visivel=true', async () => {
    mocks.api.mockImplementation(apiSimulada({ [ROTA]: (o) => ({ visivelTurma: (o?.body as { visivel: boolean }).visivel }) }));
    montar([foto('EXERCICIO', { visivelTurma: false })]);
    expect(screen.getByText('Escondida da turma')).toBeTruthy();
    expect(screen.getByText(/está escondida/)).toBeTruthy();
    const interruptor = screen.getByRole('switch', { name: 'Esconder da turma' });
    expect(interruptor.getAttribute('aria-checked')).toBe('true');
    await act(async () => {
      fireEvent.click(interruptor);
    });
    expect(mocks.api).toHaveBeenCalledWith(ROTA, { method: 'PATCH', body: { visivel: true } });
  });

  it('falha: volta o cache e avisa', async () => {
    mocks.api.mockImplementation(apiSimulada({ [ROTA]: () => new ApiError('ERRO_INTERNO', 'Falhou.', 500) }));
    const { qc } = montar([foto('EXERCICIO')]);
    await act(async () => {
      fireEvent.click(screen.getByRole('switch', { name: 'Esconder da turma' }));
    });
    expect(await screen.findByText('Falhou.')).toBeTruthy();
    expect(qc.getQueryData<DiaDetalhe>(chaves.dia(SLUG, 5))?.fotos[0]?.visivelTurma).toBe(true);
  });
});
