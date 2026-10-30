import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useContador } from './useContador';

function simularReducedMotion(ativo: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    (consulta: string) =>
      ({
        matches: ativo && consulta.includes('prefers-reduced-motion'),
        media: consulta,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useContador', () => {
  it('com reduced motion devolve o valor final na hora', () => {
    simularReducedMotion(true);
    const { result } = renderHook(() => useContador(4129));
    expect(result.current).toBe(4129);
  });

  it('sem reduced motion começa do zero (anima até o valor)', () => {
    simularReducedMotion(false);
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    const { result } = renderHook(() => useContador(37));
    expect(result.current).toBe(0);
  });

  it('valor 0 não anima', () => {
    simularReducedMotion(false);
    const { result } = renderHook(() => useContador(0));
    expect(result.current).toBe(0);
  });
});
