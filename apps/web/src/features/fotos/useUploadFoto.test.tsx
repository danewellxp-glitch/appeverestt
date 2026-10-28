// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { TAMANHO_MAX_FOTO_BYTES } from '@everest/shared';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/api';
import { MENSAGENS_ERRO } from '../../lib/erros';
import { useFotosDia } from './useUploadFoto';

const mocks = vi.hoisted(() => ({ api: vi.fn(), comprimir: vi.fn(), enviar: vi.fn() }));
vi.mock('../../lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../lib/api')>();
  return { ...original, api: mocks.api };
});
vi.mock('./comprimir', () => ({ comprimirFoto: mocks.comprimir }));
vi.mock('./enviarArquivo', () => ({ enviarArquivo: mocks.enviar }));

const SLUG = 'desafio-teste';

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return renderHook(() => useFotosDia(SLUG, 4), { wrapper });
}

describe('useFotosDia', () => {
  beforeEach(() => {
    mocks.api.mockReset();
    mocks.comprimir.mockReset();
    mocks.enviar.mockReset();
    URL.createObjectURL = vi.fn(() => 'blob:previa');
    URL.revokeObjectURL = vi.fn();
  });

  it('comprime, pede a upload-url, faz o PUT com os headers e confirma', async () => {
    const comprimido = new File([new Uint8Array(1234)], 'foto.jpg', { type: 'image/jpeg' });
    mocks.comprimir.mockResolvedValue(comprimido);
    mocks.api.mockImplementation((caminho: string) =>
      Promise.resolve(
        caminho.endsWith('/upload-url')
          ? { fotoId: 'f1', uploadUrl: 'http://storage/put', headers: { 'Content-Type': 'image/jpeg' } }
          : { fotoId: 'f1', status: 'ENVIADA' },
      ),
    );
    mocks.enviar.mockImplementation(async (_u: string, _h: unknown, _c: Blob, progresso: (p: number) => void) => {
      progresso(50);
    });

    const { result } = montar();
    const original = new File([new Uint8Array(10)], 'IMG_1.png', { type: 'image/png' });
    await act(async () => {
      await result.current.enviar('AGUA', original);
    });

    expect(mocks.comprimir).toHaveBeenCalledWith(original);
    expect(mocks.api).toHaveBeenNthCalledWith(1, `/desafios/${SLUG}/dias/4/fotos/upload-url`, {
      method: 'POST',
      body: { tipo: 'AGUA', mimeType: 'image/jpeg', tamanhoBytes: 1234 },
    });
    expect(mocks.enviar).toHaveBeenCalledWith(
      'http://storage/put',
      { 'Content-Type': 'image/jpeg' },
      comprimido,
      expect.any(Function),
    );
    expect(mocks.api).toHaveBeenNthCalledWith(2, `/desafios/${SLUG}/dias/4/fotos/f1/confirmar`, { method: 'POST' });
    expect(result.current.estados.AGUA).toEqual({ upload: null, removendo: false, erro: null });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:previa');
  });

  it('recusa foto acima de 5 MB antes de falar com a API', async () => {
    mocks.comprimir.mockResolvedValue(
      new File([new Uint8Array(TAMANHO_MAX_FOTO_BYTES + 1)], 'grande.jpg', { type: 'image/jpeg' }),
    );
    const { result } = montar();
    await act(async () => {
      await result.current.enviar('LEITURA', new File([new Uint8Array(1)], 'x.jpg', { type: 'image/jpeg' }));
    });
    expect(mocks.api).not.toHaveBeenCalled();
    expect(result.current.estados.LEITURA?.erro).toBe(MENSAGENS_ERRO.FOTO_GRANDE_DEMAIS);
  });

  it('mostra a mensagem amigável quando a confirmação falha', async () => {
    mocks.comprimir.mockResolvedValue(new File([new Uint8Array(10)], 'f.jpg', { type: 'image/jpeg' }));
    mocks.enviar.mockResolvedValue(undefined);
    mocks.api.mockImplementation((caminho: string) =>
      caminho.endsWith('/upload-url')
        ? Promise.resolve({ fotoId: 'f2', uploadUrl: 'http://storage/put', headers: { 'Content-Type': 'image/jpeg' } })
        : Promise.reject(new ApiError('FOTO_INVALIDA', MENSAGENS_ERRO.FOTO_INVALIDA, 400)),
    );
    const { result } = montar();
    await act(async () => {
      await result.current.enviar('EXERCICIO', new File([new Uint8Array(1)], 'x.jpg', { type: 'image/jpeg' }));
    });
    expect(result.current.estados.EXERCICIO?.erro).toBe(MENSAGENS_ERRO.FOTO_INVALIDA);
    expect(result.current.estados.EXERCICIO?.upload).toBeNull();
  });

  it('remove com DELETE pelo tipo', async () => {
    mocks.api.mockResolvedValue({ ok: true });
    const { result } = montar();
    await act(async () => {
      await result.current.remover('AGUA');
    });
    expect(mocks.api).toHaveBeenCalledWith(`/desafios/${SLUG}/dias/4/fotos/AGUA`, { method: 'DELETE' });
    await waitFor(() => expect(result.current.estados.AGUA?.removendo).toBe(false));
  });
});
