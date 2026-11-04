import { afterEach, describe, expect, it, vi } from 'vitest';
import { compartilharImagem } from './compartilhar';

const blob = new Blob(['png'], { type: 'image/png' });

function simularShare(share: (d: ShareData) => Promise<void>, pode = true) {
  Object.defineProperty(navigator, 'share', { value: vi.fn(share), configurable: true });
  Object.defineProperty(navigator, 'canShare', { value: vi.fn(() => pode), configurable: true });
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'share');
  Reflect.deleteProperty(navigator, 'canShare');
  vi.restoreAllMocks();
});

describe('compartilharImagem', () => {
  it('usa o menu de compartilhar com o arquivo PNG', async () => {
    simularShare(() => Promise.resolve());
    await expect(compartilharImagem(blob, 'story.png')).resolves.toBe('compartilhado');
    const dados = vi.mocked(navigator.share).mock.calls[0]![0]!;
    expect(dados.files?.[0]?.name).toBe('story.png');
    expect(dados.files?.[0]?.type).toBe('image/png');
    expect(dados.text).toBeUndefined();
  });

  it('cancelar o menu não baixa nada', async () => {
    simularShare(() => Promise.reject(new DOMException('cancelou', 'AbortError')));
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await expect(compartilharImagem(blob, 'story.png')).resolves.toBe('cancelado');
    expect(clique).not.toHaveBeenCalled();
  });

  it('sem suporte a arquivos, baixa o PNG', async () => {
    simularShare(() => Promise.resolve(), false);
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await expect(compartilharImagem(blob, 'story.png')).resolves.toBe('baixado');
    expect(clique).toHaveBeenCalledOnce();
    expect(navigator.share).not.toHaveBeenCalled();
  });

  it('se o share falhar por outro motivo, baixa o PNG', async () => {
    simularShare(() => Promise.reject(new DOMException('não', 'NotAllowedError')));
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await expect(compartilharImagem(blob, 'story.png')).resolves.toBe('baixado');
    expect(clique).toHaveBeenCalledOnce();
  });
});
