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
