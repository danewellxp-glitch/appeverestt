import { describe, expect, it } from 'vitest';
import { ALTITUDE_CUME, METROS_POR_DIA, altitudeSimbolica } from '../regras/altitude';

describe('altitudeSimbolica', () => {
  it('0 dias → 0 m; 30 dias → cume', () => {
    expect(altitudeSimbolica(0)).toBe(0);
    expect(altitudeSimbolica(30)).toBe(8848);
    expect(ALTITUDE_CUME).toBe(8848);
  });

  it('14 → 4129; 15 → 4424', () => {
    expect(altitudeSimbolica(14)).toBe(4129);
    expect(altitudeSimbolica(15)).toBe(4424);
  });

  it('nunca passa do cume nem fica negativa', () => {
    expect(altitudeSimbolica(40)).toBe(8848);
    expect(altitudeSimbolica(-2)).toBe(0);
    expect(altitudeSimbolica(5, 0)).toBe(0);
  });

  it('METROS_POR_DIA: 295 para 30 dias', () => {
    expect(METROS_POR_DIA()).toBe(295);
    expect(METROS_POR_DIA(30)).toBe(295);
  });
});

import { agruparPorAltitude, fracaoDaEscalada } from '../regras/altitude';

describe('agruparPorAltitude (R23)', () => {
  it('agrupa por dias, do cume para a base, mantendo a ordem interna', () => {
    const itens = [
      { id: 'a', diasConcluidos: 10 },
      { id: 'b', diasConcluidos: 3 },
      { id: 'c', diasConcluidos: 10 },
      { id: 'd', diasConcluidos: 40 },
    ];
    const g = agruparPorAltitude(itens, 30);
    expect(g.map((x) => x.diasConcluidos)).toEqual([30, 10, 3]);
    expect(g[1]!.pessoas.map((p) => p.id)).toEqual(['a', 'c']);
    expect(g[0]!.fracao).toBe(1);
    expect(g[1]!.altitude).toBe(2949);
    expect(agruparPorAltitude([], 30)).toEqual([]);
  });
  it('fracaoDaEscalada limita entre 0 e 1', () => {
    expect(fracaoDaEscalada(15, 30)).toBe(0.5);
    expect(fracaoDaEscalada(-1, 30)).toBe(0);
    expect(fracaoDaEscalada(99, 30)).toBe(1);
    expect(fracaoDaEscalada(5, 0)).toBe(0);
  });
});
