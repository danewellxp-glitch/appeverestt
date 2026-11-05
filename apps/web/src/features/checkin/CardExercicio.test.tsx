import type { TreinosTurmaResposta } from '@everest/shared';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SLUG, apiSimulada, montarComProvedores } from '../ranking/fixturesTurma';

const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api')>()),
  api: mocks.api,
}));

const { CardExercicio } = await import('./CardExercicio');

const ROTA = `/desafios/${SLUG}/turma/treinos`;

function treinos(extra: Partial<TreinosTurmaResposta> = {}): TreinosTurmaResposta {
  return { diaAtual: 5, dia: 5, status: 'EM_ANDAMENTO', pose: null, possoSugerirPose: false, fotos: [], ...extra };
}

function montar(ehHoje = true) {
  return montarComProvedores(<CardExercicio exercicio={false} editavel aoAlterar={() => {}} slug={SLUG} ehHoje={ehHoje} />);
}

afterEach(cleanup);
beforeEach(() => {
  mocks.api.mockReset();
});

describe('CardExercicio → pose do dia', () => {
  it('mostra a pose do dia e quem sugeriu', async () => {
    mocks.api.mockImplementation(
      apiSimulada({
        [ROTA]: () =>
          treinos({
            pose: {
              texto: 'Flexão com o livro',
              autor: { nomeExibicao: 'Maria L.', iniciais: 'ML', fotoUrl: null },
              criadoEm: '2026-11-05T09:00:00.000Z',
            },
          }),
      }),
    );
    montar();
    expect(await screen.findByText('Flexão com o livro')).toBeTruthy();
    expect(screen.getByText(/sugerida por Maria L\./)).toBeTruthy();
    expect(mocks.api).toHaveBeenCalledWith(ROTA, expect.anything());
  });

  it('sem pose e com foto do treino: oferece "Sugerir a pose do dia"', async () => {
    mocks.api.mockImplementation(apiSimulada({ [ROTA]: () => treinos({ possoSugerirPose: true }) }));
    montar();
    fireEvent.click(await screen.findByRole('button', { name: /Sugerir a pose do dia/ }));
    expect(await screen.findByRole('dialog', { name: 'Pose do dia' })).toBeTruthy();
  });

  it('sem pose e sem poder sugerir: nada extra', async () => {
    mocks.api.mockImplementation(apiSimulada({ [ROTA]: () => treinos() }));
    montar();
    await screen.findByRole('switch', { name: 'Fiz meu treino hoje' });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText(/Pose do dia/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Sugerir/ })).toBeNull();
  });

  it('dia passado: não busca a pose', () => {
    mocks.api.mockImplementation(apiSimulada({ [ROTA]: () => treinos() }));
    montar(false);
    expect(mocks.api).not.toHaveBeenCalledWith(ROTA, expect.anything());
  });
});
