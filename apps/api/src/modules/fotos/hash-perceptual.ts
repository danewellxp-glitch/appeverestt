import sharp from 'sharp';

/**
 * Hash perceptual das fotos de prova (dHash de 64 bits, X20). Só um SINAL para o embaixador: foto
 * igual ou quase igual a outra já enviada no desafio (pela mesma pessoa ou por outra). Nunca rejeita
 * nem invalida nada sozinho (X8).
 *
 * dHash: cinza, reduz para 9×8 (sem manter a proporção) e compara cada pixel com o vizinho da
 * direita (8 comparações × 8 linhas = 64 bits). Resiste a recompressão, redimensionamento e pequenos
 * ajustes de brilho; não resiste a recorte, espelhamento ou rotação (é sinal, não prova).
 */

const LARGURA = 9;
const ALTURA = 8;
const BITS = (LARGURA - 1) * ALTURA;

/** Distância de Hamming máxima (em 64 bits) para chamar duas fotos de "parecidas". */
export const DISTANCIA_MAX_PARECIDA = 5;

/**
 * Amplitude mínima (maior − menor tom de cinza dos 72 pixels) para a imagem ter hash. Imagem lisa
 * (cor sólida, tela preta, parede) daria 64 zeros ou só ruído e "casaria" com qualquer outra lisa,
 * mesmo de cor diferente. Nesses casos não há hash (null).
 */
export const AMPLITUDE_MINIMA = 8;

const FORMATO_HASH = /^[0-9a-f]{16}$/;

/**
 * dHash a partir dos pixels já em cinza e já reduzidos para 9×8 (ordem linha a linha). Com `canais`
 * > 1 usa só o primeiro canal de cada pixel. Devolve 16 caracteres hexadecimais ou null (imagem lisa).
 */
export function dHashDePixels(pixels: ArrayLike<number>, canais = 1): string | null {
  if (pixels.length !== LARGURA * ALTURA * canais) {
    throw new Error(
      `dHash espera ${LARGURA}×${ALTURA}×${canais} valores, recebeu ${pixels.length}`,
    );
  }
  const cinza = (x: number, y: number): number => pixels[(y * LARGURA + x) * canais] ?? 0;
  let menor = 255;
  let maior = 0;
  for (let y = 0; y < ALTURA; y++) {
    for (let x = 0; x < LARGURA; x++) {
      const v = cinza(x, y);
      if (v < menor) menor = v;
      if (v > maior) maior = v;
    }
  }
  if (maior - menor < AMPLITUDE_MINIMA) return null;

  // Duas metades de 32 bits (linhas 0–3 e 4–7) para não depender de BigInt.
  const metades = [0, 0];
  for (let y = 0; y < ALTURA; y++) {
    for (let x = 0; x < LARGURA - 1; x++) {
      const bit = cinza(x, y) > cinza(x + 1, y) ? 1 : 0;
      const metade = y < ALTURA / 2 ? 0 : 1;
      metades[metade] = (((metades[metade] ?? 0) << 1) | bit) >>> 0;
    }
  }
  return metades.map((m) => m.toString(16).padStart(8, '0')).join('');
}

/** dHash de uma imagem (qualquer formato que o sharp lê). Transparência vira branco. */
export async function hashPerceptual(imagem: Buffer): Promise<string | null> {
  const { data, info } = await sharp(imagem)
    .flatten({ background: '#ffffff' })
    .grayscale()
    .resize(LARGURA, ALTURA, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return dHashDePixels(data, info.channels);
}

function contarBits(x: number): number {
  let v = x >>> 0;
  v -= (v >>> 1) & 0x55555555;
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return (Math.imul((v + (v >>> 4)) & 0x0f0f0f0f, 0x01010101) >>> 24) & 0xff;
}

function validar(hash: string): void {
  if (!FORMATO_HASH.test(hash)) throw new Error(`Hash perceptual inválido: "${hash}"`);
}

/** Quantos dos 64 bits diferem entre dois hashes (0 = idênticos). */
export function distanciaHamming(a: string, b: string): number {
  validar(a);
  validar(b);
  let total = 0;
  for (const inicio of [0, 8]) {
    const x = Number.parseInt(a.slice(inicio, inicio + 8), 16);
    const y = Number.parseInt(b.slice(inicio, inicio + 8), 16);
    total += contarBits(x ^ y);
  }
  return total;
}

function emBits(hash: string): string {
  validar(hash);
  let bits = '';
  for (const c of hash) bits += Number.parseInt(c, 16).toString(2).padStart(4, '0');
  return bits;
}

export interface ItemComHash {
  id: string;
  hash: string;
}

export interface Parecida<T> {
  item: T;
  distancia: number;
}

/**
 * Índice para achar hashes a até `limite` bits de distância sem comparar todos com todos. Casa dos
 * pombos: os 64 bits são cortados em `limite + 1` blocos; se dois hashes diferem em ≤ `limite` bits,
 * pelo menos um bloco é idêntico. Só compara quem divide algum bloco.
 */
export class IndiceHashes<T extends ItemComHash> {
  private readonly blocos: { inicio: number; fim: number }[];
  private readonly baldes = new Map<string, number[]>();

  constructor(
    private readonly itens: readonly T[],
    private readonly limite = DISTANCIA_MAX_PARECIDA,
  ) {
    if (!Number.isInteger(limite) || limite < 0 || limite >= BITS) {
      throw new Error(`limite deve ser um inteiro de 0 a ${BITS - 1}`);
    }
    const n = limite + 1;
    this.blocos = Array.from({ length: n }, (_, i) => ({
      inicio: Math.floor((i * BITS) / n),
      fim: Math.floor(((i + 1) * BITS) / n),
    }));
    itens.forEach((item, indice) => {
      for (const chave of this.chaves(item.hash)) {
        const balde = this.baldes.get(chave);
        if (balde) balde.push(indice);
        else this.baldes.set(chave, [indice]);
      }
    });
  }

  private chaves(hash: string): string[] {
    const bits = emBits(hash);
    return this.blocos.map((b, i) => `${i}:${bits.slice(b.inicio, b.fim)}`);
  }

  /**
   * O item mais parecido com `hash` (distância ≤ limite) entre os que `aceitar` deixa passar. Empate:
   * o que veio primeiro na lista do construtor (ordene do mais antigo para o mais novo).
   */
  maisParecido(hash: string, aceitar: (item: T) => boolean = () => true): Parecida<T> | null {
    const vistos = new Set<number>();
    let melhor: { indice: number; distancia: number } | null = null;
    for (const chave of this.chaves(hash)) {
      for (const indice of this.baldes.get(chave) ?? []) {
        if (vistos.has(indice)) continue;
        vistos.add(indice);
        const item = this.itens[indice];
        if (!item || !aceitar(item)) continue;
        const distancia = distanciaHamming(hash, item.hash);
        if (distancia > this.limite) continue;
        if (
          !melhor ||
          distancia < melhor.distancia ||
          (distancia === melhor.distancia && indice < melhor.indice)
        ) {
          melhor = { indice, distancia };
        }
      }
    }
    const item = melhor ? this.itens[melhor.indice] : undefined;
    return melhor && item ? { item, distancia: melhor.distancia } : null;
  }
}
