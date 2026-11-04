// Sorteio com semente estável (mesma semente → mesma sequência), sem dependências.

export type Aleatorio = () => number;

/** FNV-1a de 32 bits. */
export function hash32(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: gerador rápido e bom o bastante para simulação. Devolve números em [0, 1). */
export function criarAleatorio(semente: number | string): Aleatorio {
  let a = (typeof semente === 'string' ? hash32(semente) : semente) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Inteiro em [min, max] (inclusive). */
export function inteiroEntre(rng: Aleatorio, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function chance(rng: Aleatorio, p: number): boolean {
  return rng() < p;
}

export function escolherUm<T>(rng: Aleatorio, itens: readonly T[]): T {
  if (itens.length === 0) throw new Error('Lista vazia');
  return itens[Math.floor(rng() * itens.length)] as T;
}

/** Sorteio ponderado: pesos não precisam somar 1. */
export function sortearPonderado<T>(rng: Aleatorio, opcoes: readonly (readonly [T, number])[]): T {
  const total = opcoes.reduce((s, [, p]) => s + p, 0);
  if (opcoes.length === 0 || total <= 0) throw new Error('Sem opções para sortear');
  let alvo = rng() * total;
  for (const [valor, peso] of opcoes) {
    alvo -= peso;
    if (alvo < 0) return valor;
  }
  return opcoes[opcoes.length - 1]![0];
}

/** Fisher–Yates (não altera a lista original). */
export function embaralhar<T>(rng: Aleatorio, itens: readonly T[]): T[] {
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copia[i], copia[j]] = [copia[j] as T, copia[i] as T];
  }
  return copia;
}

/** Até `k` itens distintos, em ordem aleatória. */
export function escolherVarios<T>(rng: Aleatorio, itens: readonly T[], k: number): T[] {
  return embaralhar(rng, itens).slice(0, Math.max(0, k));
}
