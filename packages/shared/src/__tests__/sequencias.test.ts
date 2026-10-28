import { describe, expect, it } from 'vitest';
import { calcularMelhorSequencia, calcularSequenciaAtual } from '../regras/sequencias';
import { calcularEvolucao } from '../regras/evolucao';

const T = true;
const F = false;

describe('calcularMelhorSequencia', () => {
  it('[T,T,F,T,T,T] → 3', () => {
    expect(calcularMelhorSequencia([T, T, F, T, T, T])).toBe(3);
  });
  it('[] → 0', () => {
    expect(calcularMelhorSequencia([])).toBe(0);
  });
  it('tudo F → 0', () => {
    expect(calcularMelhorSequencia([F, F, F, F])).toBe(0);
  });
});

describe('calcularSequenciaAtual', () => {
  it('dia atual não concluído com os 2 anteriores concluídos → 2', () => {
    expect(calcularSequenciaAtual([F, T, T, F], 4)).toBe(2);
  });
  it('dia atual concluído conta junto', () => {
    expect(calcularSequenciaAtual([F, T, T, T], 4)).toBe(3);
  });
  it('ontem não concluído zera a sequência', () => {
    expect(calcularSequenciaAtual([T, T, F, F], 4)).toBe(0);
  });
  it('dia 1 sem conclusão → 0', () => {
    expect(calcularSequenciaAtual([F], 1)).toBe(0);
  });
  it('array menor que o dia atual (dias sem registro) → conta só o que existe', () => {
    expect(calcularSequenciaAtual([T, T], 3)).toBe(2);
  });
  it('diaAtual 0 → 0', () => {
    expect(calcularSequenciaAtual([T, T], 0)).toBe(0);
  });
});

describe('calcularEvolucao', () => {
  it('arredonda para inteiro', () => {
    expect(calcularEvolucao(0)).toBe(0);
    expect(calcularEvolucao(1)).toBe(3);
    expect(calcularEvolucao(15)).toBe(50);
    expect(calcularEvolucao(30)).toBe(100);
    expect(calcularEvolucao(10, 30)).toBe(33);
  });
  it('limita entre 0 e 100', () => {
    expect(calcularEvolucao(40, 30)).toBe(100);
    expect(calcularEvolucao(5, 0)).toBe(0);
  });
});
