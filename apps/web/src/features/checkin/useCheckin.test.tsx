// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { CheckinInput, DiaDetalhe } from '@everest/shared';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/api';
import { chaves } from '../../lib/queries';
import { useCheckin } from './useCheckin';

const apiMock = vi.hoisted(() => vi.fn());
vi.mock('../../lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../lib/api')>();
  return { ...original, api: apiMock };
});

const SLUG = 'desafio-teste';

function diaBase(parcial: Partial<DiaDetalhe> = {}): DiaDetalhe {
  return {
    numeroDia: 4,
    data: '2026-10-27',
    aguaMl: 0,
    exercicio: false,
    paginasLidas: 0,
    storyPostado: false,
    concluido: false,
    invalidado: false,
    motivoInvalidacao: null,
    editavel: true,
    requisitosPendentes: ['AGUA', 'EXERCICIO', 'LEITURA', 'FOTOS', 'STORY'],
    fotos: [],
    ...parcial,
  };
}

function respostaDoServidor(body: CheckinInput): DiaDetalhe {
  return diaBase({ ...body, requisitosPendentes: ['FOTOS'] });
}

function montar(qc: QueryClient) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return renderHook(
    ({ dia }: { dia: DiaDetalhe }) => useCheckin(SLUG, qc.getQueryData<DiaDetalhe>(chaves.dia(SLUG, 4)) ?? dia, true),
    { wrapper, initialProps: { dia: diaBase() } },
  );
}

function corpoDoPut(chamada: number): CheckinInput {
  const args = apiMock.mock.calls[chamada] as [string, { body: CheckinInput }];
  return args[1].body;
}

describe('useCheckin', () => {
  let qc: QueryClient;

  beforeEach(() => {
    apiMock.mockReset();
    qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    qc.setQueryData(chaves.dia(SLUG, 4), diaBase());
  });

  afterEach(() => {
    qc.clear();
  });

  it('junta alterações rápidas num único PUT após o debounce, com update otimista', async () => {
    apiMock.mockImplementation((_url: string, op: { body: CheckinInput }) =>
      Promise.resolve(respostaDoServidor(op.body)),
    );
    const { result } = montar(qc);

    act(() => result.current.alterar((v) => ({ ...v, aguaMl: v.aguaMl + 250 })));
    act(() => result.current.alterar((v) => ({ ...v, aguaMl: v.aguaMl + 500 })));
    act(() => result.current.alterar((v) => ({ ...v, exercicio: true })));

    expect(result.current.valores).toEqual({ aguaMl: 750, exercicio: true, paginasLidas: 0, storyPostado: false });
    expect(result.current.estado).toBe('pendente');
    expect(apiMock).not.toHaveBeenCalled();

    await waitFor(() => expect(result.current.estado).toBe('salvo'), { timeout: 3000 });
    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(apiMock.mock.calls[0]?.[0]).toBe(`/desafios/${SLUG}/dias/4`);
    expect(corpoDoPut(0)).toEqual({ aguaMl: 750, exercicio: true, paginasLidas: 0, storyPostado: false });
    expect(corpoDoPut(0)).not.toHaveProperty('concluido');
    expect(qc.getQueryData<DiaDetalhe>(chaves.dia(SLUG, 4))?.aguaMl).toBe(750);
    expect(result.current.temRascunho).toBe(false);
  });

  it('salva na hora o que estiver pendente ao desmontar', async () => {
    apiMock.mockImplementation((_url: string, op: { body: CheckinInput }) =>
      Promise.resolve(respostaDoServidor(op.body)),
    );
    const { result, unmount } = montar(qc);
    act(() => result.current.alterar((v) => ({ ...v, paginasLidas: 12 })));
    unmount();
    await waitFor(() => expect(apiMock).toHaveBeenCalledTimes(1));
    expect(corpoDoPut(0).paginasLidas).toBe(12);
    await waitFor(() => expect(qc.getQueryData<DiaDetalhe>(chaves.dia(SLUG, 4))?.paginasLidas).toBe(12));
  });

  it('em erro: desfaz o cache, mantém o rascunho e permite tentar de novo', async () => {
    apiMock.mockRejectedValueOnce(new ApiError('REDE', 'Sem conexão.', 0));
    const { result } = montar(qc);
    act(() => result.current.alterar((v) => ({ ...v, storyPostado: true })));

    await waitFor(() => expect(result.current.estado).toBe('erro'), { timeout: 3000 });
    expect(result.current.erro).toEqual({ mensagem: 'Sem conexão.', podeTentar: true });
    expect(qc.getQueryData<DiaDetalhe>(chaves.dia(SLUG, 4))?.storyPostado).toBe(false);
    expect(result.current.valores?.storyPostado).toBe(true);

    apiMock.mockImplementation((_url: string, op: { body: CheckinInput }) =>
      Promise.resolve(respostaDoServidor(op.body)),
    );
    act(() => result.current.tentarDeNovo());
    await waitFor(() => expect(result.current.estado).toBe('salvo'));
    expect(corpoDoPut(1).storyPostado).toBe(true);
    expect(qc.getQueryData<DiaDetalhe>(chaves.dia(SLUG, 4))?.storyPostado).toBe(true);
  });

  it('DIA_NAO_EDITAVEL descarta o rascunho e não oferece nova tentativa', async () => {
    apiMock.mockRejectedValueOnce(new ApiError('DIA_NAO_EDITAVEL', 'Só o dia de hoje pode ser editado.', 409));
    const { result } = montar(qc);
    act(() => result.current.alterar((v) => ({ ...v, aguaMl: 500 })));
    await waitFor(() => expect(result.current.estado).toBe('erro'), { timeout: 3000 });
    expect(result.current.erro?.podeTentar).toBe(false);
    expect(result.current.temRascunho).toBe(false);
    expect(result.current.valores?.aguaMl).toBe(0);
  });

  it('resposta antiga não sobrescreve edição mais nova (envios em série)', async () => {
    let liberarPrimeiro: (() => void) | null = null;
    apiMock.mockImplementation(
      (_url: string, op: { body: CheckinInput }) =>
        new Promise<DiaDetalhe>((resolve) => {
          if (apiMock.mock.calls.length === 1) liberarPrimeiro = () => resolve(respostaDoServidor(op.body));
          else resolve(respostaDoServidor(op.body));
        }),
    );
    const { result } = montar(qc);
    act(() => result.current.alterar((v) => ({ ...v, aguaMl: 250 })));
    await waitFor(() => expect(apiMock).toHaveBeenCalledTimes(1), { timeout: 3000 });

    // Nova edição enquanto o primeiro PUT ainda está no ar.
    act(() => result.current.alterar((v) => ({ ...v, aguaMl: 500 })));
    expect(result.current.valores?.aguaMl).toBe(500);

    await act(async () => {
      liberarPrimeiro?.();
      await Promise.resolve();
    });
    // A resposta do 1º (250) não pode "voltar" a tela nem o cache.
    expect(result.current.valores?.aguaMl).toBe(500);

    await waitFor(() => expect(result.current.estado).toBe('salvo'), { timeout: 3000 });
    expect(apiMock).toHaveBeenCalledTimes(2);
    expect(corpoDoPut(1).aguaMl).toBe(500);
    expect(qc.getQueryData<DiaDetalhe>(chaves.dia(SLUG, 4))?.aguaMl).toBe(500);
    expect(result.current.valores?.aguaMl).toBe(500);
  });
});
