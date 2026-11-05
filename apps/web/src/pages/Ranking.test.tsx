import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/ui/Toast';
import { SLUG, apiSimulada } from '../features/ranking/fixturesTurma';

const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  api: mocks.api,
}));
vi.mock('../features/ranking/MontanhaTurma', () => ({ MontanhaTurma: () => <p>conteúdo montanha</p> }));
vi.mock('../features/ranking/Hoje', () => ({ Hoje: () => <p>conteúdo hoje</p> }));
vi.mock('../features/ranking/Treinos', () => ({ Treinos: () => <p>conteúdo treinos</p> }));

const { default: Ranking } = await import('./Ranking');
const { caminhoDaAba, lerAba } = await import('../features/ranking/abas');

function montar(rota: string) {
  const router = createMemoryRouter([{ path: '/ranking', element: <Ranking /> }], { initialEntries: ['/outra', rota], initialIndex: 1 });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return router;
}

function aba(nome: string) {
  return screen.getByRole('button', { name: nome });
}

afterEach(cleanup);
beforeEach(() => {
  mocks.api.mockReset();
  mocks.api.mockImplementation(apiSimulada({ [`/desafios/${SLUG}/ranking`]: () => ({ itens: [], minhaPosicao: null }) }));
  Element.prototype.scrollIntoView = vi.fn();
});

describe('abas do ranking', () => {
  it('lerAba aceita só as 4 abas; caminhoDaAba omite a padrão', () => {
    expect(lerAba('montanha')).toBe('montanha');
    expect(lerAba(null)).toBe('ranking');
    expect(lerAba('xpto')).toBe('ranking');
    expect(caminhoDaAba('ranking')).toBe('/ranking');
    expect(caminhoDaAba('hoje')).toBe('/ranking?aba=hoje');
  });
});

describe('/ranking (hub da turma)', () => {
  it('sem ?aba= abre o ranking', async () => {
    montar('/ranking');
    expect(screen.getByRole('group', { name: 'Seções da turma' })).toBeTruthy();
    expect(aba('Ranking').getAttribute('aria-pressed')).toBe('true');
    expect(await screen.findByText('O ranking ainda está vazio')).toBeTruthy();
  });

  it('?aba=hoje abre a aba Hoje', () => {
    montar('/ranking?aba=hoje');
    expect(aba('Hoje').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('conteúdo hoje')).toBeTruthy();
  });

  it('aba inválida cai no ranking', () => {
    montar('/ranking?aba=xpto');
    expect(aba('Ranking').getAttribute('aria-pressed')).toBe('true');
  });

  it('trocar de aba atualiza ?aba= com replace (sem empilhar histórico)', async () => {
    const router = montar('/ranking');
    await act(async () => {
      fireEvent.click(aba('Montanha'));
    });
    expect(router.state.location.search).toBe('?aba=montanha');
    expect(router.state.historyAction).toBe('REPLACE');
    expect(screen.getByText('conteúdo montanha')).toBeTruthy();

    await act(async () => {
      fireEvent.click(aba('Treinos'));
    });
    expect(screen.getByText('conteúdo treinos')).toBeTruthy();

    await act(async () => {
      fireEvent.click(aba('Ranking'));
    });
    expect(router.state.location.search).toBe('');
    expect(router.state.location.pathname).toBe('/ranking');
  });
});
