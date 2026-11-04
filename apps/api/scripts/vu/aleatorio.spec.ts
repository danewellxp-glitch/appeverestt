import {
  criarAleatorio,
  embaralhar,
  escolherVarios,
  hash32,
  inteiroEntre,
  sortearPonderado,
} from './aleatorio';

describe('aleatorio', () => {
  it('mesma semente → mesma sequência; sementes diferentes → sequências diferentes', () => {
    const a = criarAleatorio('vu-01@vu.everestt.app.br');
    const b = criarAleatorio('vu-01@vu.everestt.app.br');
    const c = criarAleatorio('vu-02@vu.everestt.app.br');
    const sa = Array.from({ length: 10 }, a);
    expect(Array.from({ length: 10 }, b)).toEqual(sa);
    expect(Array.from({ length: 10 }, c)).not.toEqual(sa);
    expect(hash32('abc')).toBe(hash32('abc'));
  });

  it('gera números em [0, 1) bem espalhados', () => {
    const rng = criarAleatorio(42);
    const valores = Array.from({ length: 10_000 }, rng);
    expect(Math.min(...valores)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...valores)).toBeLessThan(1);
    const media = valores.reduce((s, v) => s + v, 0) / valores.length;
    expect(Math.abs(media - 0.5)).toBeLessThan(0.02);
  });

  it('inteiroEntre cobre os extremos (inclusive)', () => {
    const rng = criarAleatorio(7);
    const vistos = new Set(Array.from({ length: 2_000 }, () => inteiroEntre(rng, 3, 10)));
    expect([...vistos].sort((x, y) => x - y)).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('sortearPonderado respeita os pesos', () => {
    const rng = criarAleatorio(9);
    const opcoes = [
      ['a', 3],
      ['b', 1],
    ] as const;
    let a = 0;
    for (let i = 0; i < 10_000; i++) {
      if (sortearPonderado(rng, opcoes) === 'a') a++;
    }
    expect(a / 10_000).toBeGreaterThan(0.72);
    expect(a / 10_000).toBeLessThan(0.78);
  });

  it('embaralhar é uma permutação e escolherVarios não repete', () => {
    const rng = criarAleatorio(1);
    const itens = [1, 2, 3, 4, 5, 6];
    expect(embaralhar(rng, itens).sort()).toEqual(itens);
    const escolhidos = escolherVarios(rng, itens, 3);
    expect(escolhidos).toHaveLength(3);
    expect(new Set(escolhidos).size).toBe(3);
    expect(escolherVarios(rng, itens, 10)).toHaveLength(6);
  });
});
