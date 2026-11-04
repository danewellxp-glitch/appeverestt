/**
 * Escalas e eixos dos gráficos do painel (SVG próprio, sem biblioteca). Funções puras e testadas.
 */

/** Escala linear: mapeia o domínio [d0, d1] na faixa [r0, r1]. Domínio vazio cai no início da faixa. */
export function escalaLinear(
  [d0, d1]: readonly [number, number],
  [r0, r1]: readonly [number, number],
): (v: number) => number {
  const span = d1 - d0;
  if (span === 0) return () => r0;
  return (v) => r0 + ((v - d0) / span) * (r1 - r0);
}

/** Passo "bonito" (1, 2 ou 5 × 10^k) próximo de `bruto`. */
function passoBonito(bruto: number): number {
  const expoente = Math.floor(Math.log10(bruto));
  const base = 10 ** expoente;
  const fracao = bruto / base;
  const bonito = fracao <= 1 ? 1 : fracao <= 2 ? 2 : fracao <= 5 ? 5 : 10;
  return bonito * base;
}

/**
 * Marcas do eixo Y de 0 até um teto que cobre `maximo`, em passos de 1/2/5 × 10^k.
 * `inteiro`: contagens (passo mínimo 1). Ex.: 37 → [0, 10, 20, 30, 40]; 0 → [0, 1].
 */
export function ticksBonitos(maximo: number, alvo = 4, inteiro = true): number[] {
  const max = Number.isFinite(maximo) && maximo > 0 ? maximo : 0;
  if (max === 0) return [0, 1];
  let passo = passoBonito(max / Math.max(1, alvo));
  if (inteiro) passo = Math.max(1, Math.round(passo));
  const teto = Math.ceil(max / passo) * passo;
  const ticks: number[] = [];
  for (let v = 0; v <= teto + passo / 1000; v += passo) ticks.push(Number(v.toPrecision(12)));
  return ticks;
}

/**
 * Quais índices de um eixo de categorias recebem rótulo, sem colidir: no máximo `maxRotulos`,
 * em passo constante a partir do primeiro, e o último sempre aparece (no lugar do anterior, se
 * ficariam mais perto que um passo).
 */
export function indicesRotulos(total: number, maxRotulos: number): number[] {
  if (total <= 0) return [];
  const limite = Math.max(1, Math.floor(maxRotulos));
  if (total <= limite) return Array.from({ length: total }, (_, i) => i);
  const passo = Math.ceil(total / limite);
  const indices: number[] = [];
  for (let i = 0; i < total; i += passo) indices.push(i);
  const ultimo = total - 1;
  const penultimo = indices[indices.length - 1] ?? 0;
  if (penultimo !== ultimo) {
    // Último perto demais do anterior: troca um pelo outro (o mais recente importa mais).
    if (ultimo - penultimo < passo) indices[indices.length - 1] = ultimo;
    else indices.push(ultimo);
  }
  return indices;
}

/** Percentual 0–100 de `parte` em `total` (null quando não há total). */
export function percentual(parte: number, total: number): number | null {
  if (!Number.isFinite(total) || total <= 0) return null;
  return Math.max(0, Math.min(100, (parte / total) * 100));
}

/** Soma acumulada. */
export function acumular(valores: readonly number[]): number[] {
  let soma = 0;
  return valores.map((v) => (soma += v));
}

/** Índice do maior valor (o primeiro, em empate); -1 se vazio ou tudo zero. */
export function indiceDoMaior(valores: readonly number[]): number {
  let melhor = -1;
  let maior = 0;
  valores.forEach((v, i) => {
    if (v > maior) {
      maior = v;
      melhor = i;
    }
  });
  return melhor;
}

/**
 * Caminho SVG de uma coluna com o topo arredondado (4 px) e a base reta, apoiada em `base`.
 * Altura menor que o raio reduz o raio (nunca vira "pílula").
 */
export function caminhoColuna(
  x: number,
  largura: number,
  topo: number,
  base: number,
  raio = 4,
): string {
  const altura = Math.max(0, base - topo);
  if (altura === 0 || largura <= 0) return '';
  const r = Math.min(raio, altura, largura / 2);
  const f = (n: number) => Number(n.toFixed(2));
  return [
    `M${f(x)},${f(base)}`,
    `V${f(topo + r)}`,
    `Q${f(x)},${f(topo)} ${f(x + r)},${f(topo)}`,
    `H${f(x + largura - r)}`,
    `Q${f(x + largura)},${f(topo)} ${f(x + largura)},${f(topo + r)}`,
    `V${f(base)}`,
    'Z',
  ].join(' ');
}

/** Pontos → caminho de linha ("M x,y L x,y …"). */
export function caminhoLinha(pontos: readonly { x: number; y: number }[]): string {
  return pontos
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${Number(p.x.toFixed(2))},${Number(p.y.toFixed(2))}`)
    .join(' ');
}

/** Índice de categoria mais próximo de `x`, para N pontos espalhados de `inicio` a `fim`. */
export function indiceMaisProximo(x: number, total: number, inicio: number, fim: number): number {
  if (total <= 1) return 0;
  const passo = (fim - inicio) / (total - 1);
  return Math.max(0, Math.min(total - 1, Math.round((x - inicio) / passo)));
}

/** Índice da faixa (coluna) que contém `x`, para N faixas iguais de `inicio` a `fim`. */
export function indiceDaFaixa(x: number, total: number, inicio: number, fim: number): number {
  if (total <= 0) return 0;
  const largura = (fim - inicio) / total;
  return Math.max(0, Math.min(total - 1, Math.floor((x - inicio) / largura)));
}
