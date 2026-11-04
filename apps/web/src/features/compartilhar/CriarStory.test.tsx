import type { MeuProgresso } from '@everest/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../components/ui/Toast';
import { CriarStory } from './CriarStory';

vi.mock('./carregarImagem', () => ({
  carregarFontes: () => Promise.resolve(),
  carregarLogo: () => Promise.resolve(null),
  imagemDeArquivo: () => Promise.resolve(new Image()),
  imagemDeUrl: () => Promise.resolve(new Image()),
}));
vi.mock('../../lib/queries', () => ({ useRanking: () => ({ data: { minhaPosicao: 4 } }) }));

const desenho = vi.fn();
vi.mock('./desenhar/modelos', async (original) => ({
  ...(await original<typeof import('./desenhar/modelos')>()),
  desenharStory: (...args: unknown[]) => desenho(...args),
}));

const progresso: MeuProgresso = {
  diaAtual: 3,
  status: 'EM_ANDAMENTO',
  totalDias: 30,
  dias: [],
  diasConcluidos: 2,
  evolucao: 0,
  melhorSequencia: 2,
  sequenciaAtual: 2,
};

function montar(extra: Partial<Parameters<typeof CriarStory>[0]> = {}) {
  const aoMarcarPostado = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ToastProvider>
        <CriarStory
          aberta
          aoFechar={() => {}}
          slug="d"
          dia={{ numeroDia: 3, aguaMl: 3000, exercicio: true, paginasLidas: 10, fotos: [] }}
          progresso={progresso}
          instagramHandle="everest"
          hashtag="DESAFIO30"
          storyPostado={false}
          podeMarcar
          aoMarcarPostado={aoMarcarPostado}
          {...extra}
        />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { aoMarcarPostado };
}

beforeEach(() => {
  desenho.mockClear();
  HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback) {
    cb(new Blob(['png'], { type: 'image/png' }));
  };
  Object.defineProperty(navigator, 'share', {
    value: vi.fn(() => Promise.resolve()),
    configurable: true,
  });
  Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
});
afterEach(() => {
  cleanup();
  Reflect.deleteProperty(navigator, 'share');
  Reflect.deleteProperty(navigator, 'canShare');
});

describe('CriarStory', () => {
  it('desenha com o fundo vermelho quando não há foto do treino', async () => {
    montar();
    await waitFor(() => expect(desenho).toHaveBeenCalled());
    const [, dados, opcoes] = desenho.mock.calls.at(-1)!;
    expect(opcoes).toMatchObject({ modelo: 'escalada', fundo: { tipo: 'marca' } });
    expect(dados).toMatchObject({ numeroDia: 3, posicao: 4, habitosOk: 3 });
    expect(screen.queryByRole('button', { name: 'Treino' })).toBeNull();
  });

  it('troca de modelo e de fundo redesenha', async () => {
    montar();
    await waitFor(() => expect(desenho).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Sequência' }));
    fireEvent.click(screen.getByRole('button', { name: 'Adesivo' }));
    await waitFor(() =>
      expect(desenho.mock.calls.at(-1)![2]).toMatchObject({
        modelo: 'sequencia',
        fundo: { tipo: 'adesivo' },
      }),
    );
  });

  it('com foto de treino válida, começa com ela', async () => {
    montar({
      dia: {
        numeroDia: 3,
        aguaMl: 0,
        exercicio: true,
        paginasLidas: 0,
        fotos: [
          {
            id: 'f',
            tipo: 'EXERCICIO',
            status: 'CONFIRMADA',
            thumbUrl: null,
            url: 'https://x/f.webp',
          },
        ],
      },
    });
    await waitFor(() =>
      expect(desenho.mock.calls.at(-1)?.[2]).toMatchObject({ fundo: { tipo: 'foto' } }),
    );
    expect(screen.getByRole('button', { name: 'Treino' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('compartilha e oferece marcar o story de hoje', async () => {
    const { aoMarcarPostado } = montar();
    const botao = await screen.findByRole('button', { name: 'Compartilhar no Instagram' });
    await waitFor(() => expect(botao.hasAttribute('disabled')).toBe(false));
    fireEvent.click(botao);
    await waitFor(() => expect(navigator.share).toHaveBeenCalledOnce());
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar' }));
    expect(aoMarcarPostado).toHaveBeenCalledOnce();
  });
});
