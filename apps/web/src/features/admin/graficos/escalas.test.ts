import { describe, expect, it } from 'vitest';
import {
  acumular,
  caminhoColuna,
  escalaLinear,
  indiceDaFaixa,
  indiceDoMaior,
  indiceMaisProximo,
  indicesRotulos,
  percentual,
  ticksBonitos,
} from './escalas';

describe('escalaLinear', () => {
  it('mapeia o domínio na faixa (inclusive invertida, como no eixo Y do SVG)', () => {
    const y = escalaLinear([0, 100], [200, 0]);
    expect(y(0)).toBe(200);
    expect(y(50)).toBe(100);
    expect(y(100)).toBe(0);
  });

  it('domínio de largura zero cai no início da faixa', () => {
    expect(escalaLinear([5, 5], [10, 90])(5)).toBe(10);
  });
});

describe('ticksBonitos', () => {
  it('usa passos de 1, 2 ou 5 × 10^k e cobre o máximo', () => {
    expect(ticksBonitos(37)).toEqual([0, 10, 20, 30, 40]);
    expect(ticksBonitos(100)).toEqual([0, 50, 100]);
    expect(ticksBonitos(8)).toEqual([0, 2, 4, 6, 8]);
    expect(ticksBonitos(1234)).toEqual([0, 500, 1000, 1500]);
  });

  it('contagens pequenas não têm passo fracionado', () => {
    expect(ticksBonitos(1)).toEqual([0, 1]);
    expect(ticksBonitos(3)).toEqual([0, 1, 2, 3]);
  });

  it('sem dados devolve um eixo 0–1', () => {
    expect(ticksBonitos(0)).toEqual([0, 1]);
    expect(ticksBonitos(Number.NaN)).toEqual([0, 1]);
  });

  it('aceita passos decimais quando não é contagem', () => {
    expect(ticksBonitos(0.8, 4, false)).toEqual([0, 0.2, 0.4, 0.6, 0.8]);
  });
});

describe('indicesRotulos', () => {
  it('rotula tudo quando cabe', () => {
    expect(indicesRotulos(5, 8)).toEqual([0, 1, 2, 3, 4]);
  });

  it('pula em passo constante e sempre mostra o último', () => {
    expect(indicesRotulos(31, 6)).toEqual([0, 6, 12, 18, 24, 30]);
    expect(indicesRotulos(13, 4)).toEqual([0, 4, 8, 12]);
  });

  it('troca o penúltimo pelo último quando ficariam colados (nunca passa do máximo)', () => {
    expect(indicesRotulos(11, 5)).toEqual([0, 3, 6, 10]);
    expect(indicesRotulos(30, 6)).toEqual([0, 5, 10, 15, 20, 29]);
    expect(indicesRotulos(24, 8)).toEqual([0, 3, 6, 9, 12, 15, 18, 23]);
  });

  it('vazio', () => {
    expect(indicesRotulos(0, 5)).toEqual([]);
  });
});

describe('percentual', () => {
  it('limita a 0–100 e devolve null sem total', () => {
    expect(percentual(1, 4)).toBe(25);
    expect(percentual(5, 4)).toBe(100);
    expect(percentual(3, 0)).toBeNull();
  });
});

describe('acumular e indiceDoMaior', () => {
  it('soma corrida', () => {
    expect(acumular([1, 0, 3, 2])).toEqual([1, 1, 4, 6]);
  });

  it('primeiro maior; -1 quando tudo é zero', () => {
    expect(indiceDoMaior([1, 4, 4, 2])).toBe(1);
    expect(indiceDoMaior([0, 0])).toBe(-1);
    expect(indiceDoMaior([])).toBe(-1);
  });
});

describe('caminhoColuna', () => {
  it('topo arredondado e base reta', () => {
    expect(caminhoColuna(10, 12, 20, 100)).toBe('M10,100 V24 Q10,20 14,20 H18 Q22,20 22,24 V100 Z');
  });

  it('coluna baixa reduz o raio; altura zero não desenha', () => {
    expect(caminhoColuna(0, 10, 98, 100)).toBe('M0,100 V100 Q0,98 2,98 H8 Q10,98 10,100 V100 Z');
    expect(caminhoColuna(0, 10, 100, 100)).toBe('');
  });
});

describe('índices pelo ponteiro', () => {
  it('ponto mais próximo numa linha', () => {
    expect(indiceMaisProximo(0, 5, 0, 100)).toBe(0);
    expect(indiceMaisProximo(60, 5, 0, 100)).toBe(2);
    expect(indiceMaisProximo(140, 5, 0, 100)).toBe(4);
    expect(indiceMaisProximo(50, 1, 0, 100)).toBe(0);
  });

  it('faixa que contém o x em colunas', () => {
    expect(indiceDaFaixa(0, 4, 0, 100)).toBe(0);
    expect(indiceDaFaixa(26, 4, 0, 100)).toBe(1);
    expect(indiceDaFaixa(100, 4, 0, 100)).toBe(3);
    expect(indiceDaFaixa(-5, 4, 0, 100)).toBe(0);
  });
});
