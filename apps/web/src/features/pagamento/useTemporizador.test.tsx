import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chaveInicioPix, formatarRelogio, limparInicioPix, useTemporizador } from './useTemporizador';

const CHAVE = chaveInicioPix('participante-teste');

describe('useTemporizador', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-01T12:00:00Z'));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('começa em 5:00 e mostra 3:59 depois de 61 s', () => {
    const { result } = renderHook(() => useTemporizador(300, CHAVE));
    expect(result.current.texto).toBe('5:00');
    act(() => {
      vi.advanceTimersByTime(61_000);
    });
    expect(result.current.texto).toBe('3:59');
    expect(result.current.zerou).toBe(false);
  });

  it('remontar com a mesma chave mantém a contagem (início no sessionStorage)', () => {
    const primeiro = renderHook(() => useTemporizador(300, CHAVE));
    act(() => {
      vi.advanceTimersByTime(61_000);
    });
    primeiro.unmount();

    const segundo = renderHook(() => useTemporizador(300, CHAVE));
    expect(segundo.result.current.texto).toBe('3:59');
  });

  it('para em 0:00, avisa e não deixa intervalo rodando', () => {
    const { result } = renderHook(() => useTemporizador(300, CHAVE));
    act(() => {
      vi.advanceTimersByTime(400_000);
    });
    expect(result.current.texto).toBe('0:00');
    expect(result.current.restante).toBe(0);
    expect(result.current.zerou).toBe(true);
    expect(result.current.anuncio).toContain('O tempo acabou');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('o anúncio para leitores de tela só muda na troca de minuto', () => {
    const { result } = renderHook(() => useTemporizador(300, CHAVE));
    expect(result.current.anuncio).toBe('Faltam 5 minutos.');
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current.anuncio).toBe('Faltam 5 minutos.');
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current.anuncio).toBe('Faltam 4 minutos.');
  });

  it('limparInicioPix recomeça a contagem', () => {
    const primeiro = renderHook(() => useTemporizador(300, CHAVE));
    act(() => {
      vi.advanceTimersByTime(61_000);
    });
    primeiro.unmount();
    limparInicioPix('participante-teste');
    const segundo = renderHook(() => useTemporizador(300, CHAVE));
    expect(segundo.result.current.texto).toBe('5:00');
  });
});

describe('formatarRelogio', () => {
  it('formata minutos e segundos', () => {
    expect(formatarRelogio(300)).toBe('5:00');
    expect(formatarRelogio(239)).toBe('3:59');
    expect(formatarRelogio(5)).toBe('0:05');
    expect(formatarRelogio(0)).toBe('0:00');
  });
});
