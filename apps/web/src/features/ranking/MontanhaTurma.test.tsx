import type { ItemRankingPosicionado, RankingResposta } from '@everest/shared';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/api';
import { MEU_ID, SLUG, apiSimulada, montarComProvedores } from './fixturesTurma';

const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api')>()),
  api: mocks.api,
}));

const { MontanhaTurma } = await import('./MontanhaTurma');

function item(id: string, nome: string, dias: number, posicao: number): ItemRankingPosicionado {
  return {
    participanteId: id,
    nomeExibicao: nome,
    ehEmbaixador: false,
    diasConcluidos: dias,
    melhorSequencia: dias,
    sequenciaAtual: dias,
    dataInscricao: '2026-10-01T12:00:00.000Z',
    fotoUrl: null,
    posicao,
  };
}

const RANKING: RankingResposta = {
  itens: [
    item('p1', 'Bia M.', 10, 1),
    item(MEU_ID, 'Ana S.', 10, 2),
    item('p2', 'Caio R.', 10, 3),
    item('p3', 'Duda F.', 4, 4),
  ],
  minhaPosicao: 2,
};

afterEach(cleanup);
beforeEach(() => {
  mocks.api.mockReset();
  Element.prototype.scrollIntoView = vi.fn();
});

describe('Aba Montanha', () => {
  it('agrupa por altitude: uma bolha por grupo com "+N" e rótulo acessível', async () => {
    mocks.api.mockImplementation(apiSimulada({ [`/desafios/${SLUG}/ranking`]: () => RANKING }));
    montarComProvedores(<MontanhaTurma />);

    // 10 de 30 dias = 2.949 m
    const bolha = await screen.findByRole('button', { name: 'Você e mais 2, a 2.949 m (10 dias)' });
    expect(bolha.textContent).toContain('+2');
    expect(bolha.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('button', { name: 'Duda F., a 1.180 m (4 dias)' }).textContent).not.toContain('+');

    const lista = screen.getByRole('list', { name: 'Turma por altitude' });
    const grupos = within(lista).getAllByRole('listitem').filter((li) => li.parentElement === lista);
    expect(grupos.map((g) => g.querySelector('b')?.textContent)).toEqual(['2.949 m', '1.180 m']);
    expect(within(grupos[0] as HTMLElement).getByText(/\(você\)/)).toBeTruthy();
  });

  it('tocar numa bolha marca aria-pressed, destaca e rola até o grupo; tocar de novo desmarca', async () => {
    mocks.api.mockImplementation(apiSimulada({ [`/desafios/${SLUG}/ranking`]: () => RANKING }));
    montarComProvedores(<MontanhaTurma />);
    const bolha = await screen.findByRole('button', { name: /Duda F\./ });
    fireEvent.click(bolha);
    expect(bolha.getAttribute('aria-pressed')).toBe('true');
    const grupo = document.getElementById('altitude-4') as HTMLElement;
    expect(grupo.getAttribute('aria-current')).toBe('true');
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    fireEvent.click(bolha);
    expect(bolha.getAttribute('aria-pressed')).toBe('false');
    expect(grupo.getAttribute('aria-current')).toBeNull();
  });

  it('vazio e erro', async () => {
    mocks.api.mockImplementation(apiSimulada({ [`/desafios/${SLUG}/ranking`]: () => ({ itens: [], minhaPosicao: null }) }));
    montarComProvedores(<MontanhaTurma />);
    expect(await screen.findByText('Ninguém na montanha ainda')).toBeTruthy();
    cleanup();

    mocks.api.mockImplementation(
      apiSimulada({ [`/desafios/${SLUG}/ranking`]: () => new ApiError('ERRO_INTERNO', 'Falhou.', 500) }),
    );
    montarComProvedores(<MontanhaTurma />);
    expect(await screen.findByText('Falhou.')).toBeTruthy();
  });

  it('carregando: mostra o esqueleto', () => {
    mocks.api.mockImplementation(() => new Promise(() => {}));
    montarComProvedores(<MontanhaTurma />);
    expect(screen.getByRole('status', { name: 'Carregando a montanha' })).toBeTruthy();
  });
});
