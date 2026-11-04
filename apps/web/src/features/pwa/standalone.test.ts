// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const VIEWPORT_NAVEGADOR = 'width=device-width, initial-scale=1.0, viewport-fit=cover';

function simularDisplayMode(standalone: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((q: string) => ({
      matches: standalone && q.includes('standalone'),
      media: q,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

/** Cada teste importa um módulo novo (o `aplicado` é estado de módulo). */
async function carregar() {
  vi.resetModules();
  return import('./standalone');
}

describe('modo app (PWA instalado)', () => {
  beforeEach(() => {
    document.head.innerHTML = `<meta name="viewport" content="${VIEWPORT_NAVEGADOR}" />`;
    delete document.documentElement.dataset.app;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('no navegador comum o zoom continua liberado (WCAG 1.4.4)', async () => {
    simularDisplayMode(false);
    const { aplicarModoApp, rodandoStandalone } = await carregar();
    expect(rodandoStandalone()).toBe(false);
    aplicarModoApp();
    expect(document.querySelector('meta[name="viewport"]')?.getAttribute('content')).toBe(VIEWPORT_NAVEGADOR);
    expect(document.documentElement.dataset.app).toBeUndefined();
  });

  it('no app instalado trava o zoom e liga o CSS de modo app', async () => {
    simularDisplayMode(true);
    const { aplicarModoApp, rodandoStandalone } = await carregar();
    expect(rodandoStandalone()).toBe(true);
    aplicarModoApp();
    const viewport = document.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? '';
    expect(viewport).toContain('user-scalable=no');
    expect(viewport).toContain('maximum-scale=1');
    expect(viewport).toContain('viewport-fit=cover');
    expect(document.documentElement.dataset.app).toBe('1');
  });

  it('no app instalado cancela a pinça do Safari (gesturestart)', async () => {
    simularDisplayMode(true);
    const { aplicarModoApp } = await carregar();
    aplicarModoApp();
    const evento = new Event('gesturestart', { cancelable: true });
    document.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBe(true);
  });
});
