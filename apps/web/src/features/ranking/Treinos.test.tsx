import type { FotoTreinoTurma, TreinosTurmaResposta } from '@everest/shared';
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/api';
import { SLUG, apiSimulada, montarComProvedores } from './fixturesTurma';

const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api')>()),
  api: mocks.api,
}));

const { Treinos } = await import('./Treinos');

function foto(id: string, nome: string, extra: Partial<FotoTreinoTurma> = {}): FotoTreinoTurma {
  return {
    participanteId: id,
    nomeExibicao: nome,
    iniciais: nome.slice(0, 2).toUpperCase(),
    fotoUrl: null,
    thumbUrl: `https://arquivos/${id}.thumb.webp`,
    url: `https://arquivos/${id}.webp`,
    concluidoDia: true,
    minha: false,
    ...extra,
  };
}

function treinos(extra: Partial<TreinosTurmaResposta> = {}): TreinosTurmaResposta {
  return {
    diaAtual: 5,
    dia: 5,
    status: 'EM_ANDAMENTO',
    pose: {
      texto: 'Flexão segurando o livro',
      autor: { nomeExibicao: 'Bia M.', iniciais: 'BM', fotoUrl: null },
      criadoEm: '2026-11-05T09:00:00.000Z',
    },
    possoSugerirPose: false,
    fotos: [foto('p1', 'Bia M.'), foto('p-eu', 'Ana S.', { minha: true })],
    ...extra,
  };
}

const ROTA = `/desafios/${SLUG}/turma/treinos`;

afterEach(cleanup);
beforeEach(() => {
  mocks.api.mockReset();
});

describe('Aba Treinos', () => {
  it('mostra a pose do dia e a grade com nome; tocar abre a foto cheia', async () => {
    mocks.api.mockImplementation(apiSimulada({ [ROTA]: () => treinos() }));
    montarComProvedores(<Treinos />);

    expect(await screen.findByText('Flexão segurando o livro')).toBeTruthy();
    expect(screen.getByText('sugerida por Bia M.')).toBeTruthy();
    expect(screen.getByText('Hoje · dia 5')).toBeTruthy();
    const grade = screen.getByRole('list', { name: 'Treinos do dia 5' });
    expect(within(grade).getAllByRole('listitem')).toHaveLength(2);
    expect(within(grade).getByText('Você')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Ver o treino de Bia M.' }));
    const folha = await screen.findByRole('dialog', { name: 'Treino de Bia M.' });
    expect(within(folha).getByRole('img').getAttribute('src')).toBe('https://arquivos/p1.webp');
  });

  it('setas trocam o dia (até o atual) e pedem ?dia=n', async () => {
    mocks.api.mockImplementation(
      apiSimulada({
        [ROTA]: (_o, caminho) =>
          caminho.endsWith('?dia=4') ? treinos({ dia: 4, pose: null, fotos: [foto('p9', 'Caio R.')] }) : treinos(),
      }),
    );
    montarComProvedores(<Treinos />);
    const proximo = await screen.findByRole('button', { name: 'Próximo dia' });
    expect(proximo.hasAttribute('disabled')).toBe(true);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Dia anterior' }));
    });
    expect(await screen.findByText('Dia 4')).toBeTruthy();
    expect(mocks.api).toHaveBeenCalledWith(`${ROTA}?dia=4`, expect.anything());
    expect(screen.getByRole('button', { name: 'Ver o treino de Caio R.' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Pose do dia' })).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Próximo dia' }));
    });
    expect(await screen.findByText('Hoje · dia 5')).toBeTruthy();
  });

  it('quem pode sugerir abre a folha, valida e envia a pose', async () => {
    const post = vi.fn((o: { body?: unknown } | undefined) => ({
      pose: {
        texto: (o?.body as { texto: string }).texto,
        autor: { nomeExibicao: 'Ana S.', iniciais: 'AS', fotoUrl: null },
        criadoEm: '2026-11-05T09:00:00.000Z',
      },
    }));
    mocks.api.mockImplementation(
      apiSimulada({ [ROTA]: () => treinos({ pose: null, possoSugerirPose: true }), [`/desafios/${SLUG}/turma/pose`]: post }),
    );
    montarComProvedores(<Treinos />);
    fireEvent.click(await screen.findByRole('button', { name: 'Sugerir a pose do dia' }));
    const folha = await screen.findByRole('dialog', { name: 'Pose do dia' });
    const campo = within(folha).getByRole('textbox', { name: 'Pose do dia' });

    fireEvent.change(campo, { target: { value: 'oi' } });
    fireEvent.click(within(folha).getByRole('button', { name: 'Definir a pose' }));
    expect(within(folha).getByText('Pelo menos 3 caracteres.')).toBeTruthy();
    expect(post).not.toHaveBeenCalled();

    fireEvent.change(campo, { target: { value: '  Prancha com o livro  ' } });
    await act(async () => {
      fireEvent.click(within(folha).getByRole('button', { name: 'Definir a pose' }));
    });
    expect(mocks.api).toHaveBeenCalledWith(`/desafios/${SLUG}/turma/pose`, {
      method: 'POST',
      body: { texto: 'Prancha com o livro' },
    });
    expect(await screen.findByText('Prancha com o livro')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Sugerir a pose do dia' })).toBeNull();
  });

  it('POSE_JA_DEFINIDA mostra o erro na folha', async () => {
    mocks.api.mockImplementation(
      apiSimulada({
        [ROTA]: () => treinos({ pose: null, possoSugerirPose: true }),
        [`/desafios/${SLUG}/turma/pose`]: () => new ApiError('POSE_JA_DEFINIDA', 'Alguém já sugeriu a pose de hoje.', 409),
      }),
    );
    montarComProvedores(<Treinos />);
    fireEvent.click(await screen.findByRole('button', { name: 'Sugerir a pose do dia' }));
    const folha = await screen.findByRole('dialog', { name: 'Pose do dia' });
    fireEvent.change(within(folha).getByRole('textbox', { name: 'Pose do dia' }), { target: { value: 'Agachamento' } });
    await act(async () => {
      fireEvent.click(within(folha).getByRole('button', { name: 'Definir a pose' }));
    });
    expect(await within(folha).findByText('Alguém já sugeriu a pose de hoje.')).toBeTruthy();
  });

  it('encerrado: abre no último dia (diaAtual null) e as setas navegam até ele', async () => {
    mocks.api.mockImplementation(
      apiSimulada({
        [ROTA]: (_o, caminho) =>
          caminho.endsWith('?dia=29')
            ? treinos({ status: 'ENCERRADO', diaAtual: null, dia: 29, pose: null })
            : treinos({ status: 'ENCERRADO', diaAtual: null, dia: 30, pose: null }),
      }),
    );
    montarComProvedores(<Treinos />);
    expect(await screen.findByText('Dia 30')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Próximo dia' }).hasAttribute('disabled')).toBe(true);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Dia anterior' }));
    });
    expect(await screen.findByText('Dia 29')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Próximo dia' }).hasAttribute('disabled')).toBe(false);
    expect(screen.queryByText(/Ninguém sugeriu/)).toBeNull();
  });

  it('vazios: sem fotos hoje, sem pose e desafio não iniciado', async () => {
    mocks.api.mockImplementation(apiSimulada({ [ROTA]: () => treinos({ pose: null, fotos: [] }) }));
    montarComProvedores(<Treinos />);
    expect(await screen.findByText('Nenhum treino postado hoje ainda')).toBeTruthy();
    expect(screen.getByText(/Ninguém sugeriu a pose de hoje ainda/)).toBeTruthy();
    cleanup();

    mocks.api.mockImplementation(
      apiSimulada({ [ROTA]: () => treinos({ status: 'NAO_INICIADO', diaAtual: null, dia: null, pose: null, fotos: [] }) }),
    );
    montarComProvedores(<Treinos />);
    expect(await screen.findByText('O desafio ainda não começou')).toBeTruthy();
  });
});
