import type { PessoaHoje, TurmaHojeResposta } from '@everest/shared';
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/api';
import { MEU_ID, SLUG, apiSimulada, montarComProvedores } from './fixturesTurma';

const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api')>()),
  api: mocks.api,
}));

const { Hoje } = await import('./Hoje');

function pessoa(id: string, nome: string, extra: Partial<PessoaHoje> = {}): PessoaHoje {
  return {
    participanteId: id,
    nomeExibicao: nome,
    iniciais: nome.slice(0, 2).toUpperCase(),
    fotoUrl: null,
    concluidoEm: null,
    aceitaCutucadas: true,
    ...extra,
  };
}

function turma(extra: Partial<TurmaHojeResposta> = {}): TurmaHojeResposta {
  return {
    diaAtual: 5,
    status: 'EM_ANDAMENTO',
    totalParticipantes: 6,
    fecharam: [pessoa('p1', 'Bia M.', { concluidoEm: '2026-11-05T10:42:00.000Z' })],
    faltam: [
      pessoa(MEU_ID, 'Ana S.'),
      pessoa('p2', 'Caio R.'),
      pessoa('p3', 'Duda F.', { aceitaCutucadas: false }),
      pessoa('p4', 'Edu L.'),
    ],
    minhasCutucadasHoje: ['p4'],
    ...extra,
  };
}

afterEach(cleanup);
beforeEach(() => {
  mocks.api.mockReset();
});

describe('Aba Hoje', () => {
  it('mostra a barra coletiva, quem fechou com a hora e quem falta com os estados do botão', async () => {
    mocks.api.mockImplementation(apiSimulada({ [`/desafios/${SLUG}/turma/hoje`]: () => turma() }));
    montarComProvedores(<Hoje />);

    expect(await screen.findByText(/fechou hoje · dia 5/)).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Participantes que fecharam o dia' }).getAttribute('aria-valuemax')).toBe('6');

    const fecharam = screen.getByRole('heading', { name: /Fecharam o dia/ }).parentElement as HTMLElement;
    // 10:42 UTC = 07:42 em Brasília
    expect(within(fecharam).getByText('às 07:42').getAttribute('datetime')).toBe('2026-11-05T10:42:00.000Z');

    expect(screen.getByText('(você)')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Fechar meu dia' }).getAttribute('href')).toBe('/hoje');
    expect(screen.getByRole('button', { name: 'Cutucar Caio R.' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cutucar Duda F.' })).toBeNull();
    expect(screen.getByText('não recebe cutucadas')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cutucar Edu L.' })).toBeNull();
    expect(screen.getByText('Cutucado')).toBeTruthy();
  });

  it('cutucar envia o POST, avisa e marca a pessoa como cutucada', async () => {
    const post = vi.fn(() => ({ entregue: true }));
    mocks.api.mockImplementation(
      apiSimulada({ [`/desafios/${SLUG}/turma/hoje`]: () => turma(), [`/desafios/${SLUG}/cutucadas`]: post }),
    );
    montarComProvedores(<Hoje />);
    const botao = await screen.findByRole('button', { name: 'Cutucar Caio R.' });
    await act(async () => {
      fireEvent.click(botao);
    });
    expect(mocks.api).toHaveBeenCalledWith(`/desafios/${SLUG}/cutucadas`, {
      method: 'POST',
      body: { participanteId: 'p2' },
    });
    expect(await screen.findByText('Cutucada enviada para Caio R.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cutucar Caio R.' })).toBeNull();
    expect(screen.getAllByText('Cutucado')).toHaveLength(2);
  });

  it('sem push ativo: avisa que a pessoa ainda não ativou as notificações', async () => {
    mocks.api.mockImplementation(
      apiSimulada({
        [`/desafios/${SLUG}/turma/hoje`]: () => turma(),
        [`/desafios/${SLUG}/cutucadas`]: () => ({ entregue: false }),
      }),
    );
    montarComProvedores(<Hoje />);
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Cutucar Caio R.' }));
    });
    expect(await screen.findByText(/Caio R\. ainda não ativou as notificações/)).toBeTruthy();
  });

  it('JA_CUTUCOU também marca a pessoa', async () => {
    mocks.api.mockImplementation(
      apiSimulada({
        [`/desafios/${SLUG}/turma/hoje`]: () => turma(),
        [`/desafios/${SLUG}/cutucadas`]: () => new ApiError('JA_CUTUCOU', 'Você já cutucou essa pessoa hoje.', 409),
      }),
    );
    montarComProvedores(<Hoje />);
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Cutucar Caio R.' }));
    });
    expect(await screen.findByText('Você já cutucou Caio R. hoje.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cutucar Caio R.' })).toBeNull();
  });

  it('vazios: ninguém fechou, todo mundo fechou, não iniciado e encerrado', async () => {
    mocks.api.mockImplementation(
      apiSimulada({ [`/desafios/${SLUG}/turma/hoje`]: () => turma({ fecharam: [], faltam: [pessoa('p2', 'Caio R.')] }) }),
    );
    montarComProvedores(<Hoje />);
    expect(await screen.findByText('Ninguém fechou o dia ainda')).toBeTruthy();
    cleanup();

    mocks.api.mockImplementation(apiSimulada({ [`/desafios/${SLUG}/turma/hoje`]: () => turma({ faltam: [] }) }));
    montarComProvedores(<Hoje />);
    expect(await screen.findByText('Todo mundo fechou o dia!')).toBeTruthy();
    cleanup();

    mocks.api.mockImplementation(
      apiSimulada({ [`/desafios/${SLUG}/turma/hoje`]: () => turma({ status: 'NAO_INICIADO', diaAtual: null }) }),
    );
    montarComProvedores(<Hoje />);
    expect(await screen.findByText('O desafio ainda não começou')).toBeTruthy();
    cleanup();

    mocks.api.mockImplementation(
      apiSimulada({ [`/desafios/${SLUG}/turma/hoje`]: () => turma({ status: 'ENCERRADO', diaAtual: null }) }),
    );
    montarComProvedores(<Hoje />);
    expect(await screen.findByText('O desafio terminou')).toBeTruthy();
  });

  it('erro: mostra a mensagem e o "Tentar de novo"', async () => {
    mocks.api.mockImplementation(
      apiSimulada({ [`/desafios/${SLUG}/turma/hoje`]: () => new ApiError('ERRO_INTERNO', 'Falhou.', 500) }),
    );
    montarComProvedores(<Hoje />);
    expect(await screen.findByText('Falhou.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeTruthy();
  });
});
