// Fotos de prova dos VUs: JPEG pequeno com fundo colorido e o texto "VU 07 · DIA 1 · ÁGUA".
// O texto é desenhado com uma fonte bitmap 5x7 direto nos pixels: não depende de fontes do sistema
// (a imagem slim do Node não tem nenhuma, e o SVG do sharp sairia sem texto).
import sharp from 'sharp';
import type { TipoFoto } from '@everest/shared';

// prettier-ignore
const FONTE: Record<string, readonly string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '·': ['.....', '.....', '.....', '.##..', '.##..', '.....', '.....'],
  '/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
};
/** Acento agudo, desenhado nas 3 linhas acima da letra (a última fica em branco, separando). */
const AGUDO = ['...#.', '..#..', '.....'] as const;
const SEM_ACENTO = AGUDO.map(() => '');

const LARGURA_GLIFO = 5;
const ALTURA_GLIFO = 7;
/** Faixa do acento + 7 linhas da letra. */
const ALTURA_LINHA = ALTURA_GLIFO + AGUDO.length;

export type Cor = readonly [number, number, number];

export interface Quadro {
  largura: number;
  altura: number;
  /** RGB, 3 bytes por pixel. */
  pixels: Buffer;
}

interface Caractere {
  glifo: readonly string[];
  agudo: boolean;
}

/** Maiúsculas; acento agudo é desenhado, outros diacríticos são descartados (Ç → C). */
export function caracteres(texto: string): Caractere[] {
  return [...texto.normalize('NFC').toUpperCase()].map((c) => {
    const decomposto = c.normalize('NFD');
    const base = decomposto[0] ?? '?';
    return { glifo: FONTE[base] ?? FONTE[c] ?? FONTE['?']!, agudo: decomposto.includes('́') };
  });
}

/** Largura do texto em "pontos" da fonte (5 por letra + 1 de espaço entre letras). */
export function larguraEmPontos(texto: string): number {
  const n = [...texto.normalize('NFC')].length;
  return n === 0 ? 0 : n * (LARGURA_GLIFO + 1) - 1;
}

export function criarQuadro(largura: number, altura: number, topo: Cor, base: Cor): Quadro {
  const pixels = Buffer.alloc(largura * altura * 3);
  for (let y = 0; y < altura; y++) {
    const t = altura <= 1 ? 0 : y / (altura - 1);
    const r = Math.round(topo[0] + (base[0] - topo[0]) * t);
    const g = Math.round(topo[1] + (base[1] - topo[1]) * t);
    const b = Math.round(topo[2] + (base[2] - topo[2]) * t);
    for (let x = 0; x < largura; x++) {
      const i = (y * largura + x) * 3;
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
    }
  }
  return { largura, altura, pixels };
}

function pintarBloco(q: Quadro, x0: number, y0: number, tamanho: number, cor: Cor): void {
  for (let y = Math.max(0, y0); y < Math.min(q.altura, y0 + tamanho); y++) {
    for (let x = Math.max(0, x0); x < Math.min(q.largura, x0 + tamanho); x++) {
      const i = (y * q.largura + x) * 3;
      q.pixels[i] = cor[0];
      q.pixels[i + 1] = cor[1];
      q.pixels[i + 2] = cor[2];
    }
  }
}

/** Desenha `texto` com o canto superior esquerdo da linha (incluindo a faixa do acento) em (x, y). */
export function desenharTexto(
  q: Quadro,
  texto: string,
  x: number,
  y: number,
  escala: number,
  cor: Cor,
): void {
  let cursor = x;
  for (const { glifo, agudo } of caracteres(texto)) {
    const linhas = [...(agudo ? AGUDO : SEM_ACENTO), ...glifo];
    linhas.forEach((linha, ly) => {
      for (let lx = 0; lx < linha.length; lx++) {
        if (linha[lx] === '#') pintarBloco(q, cursor + lx * escala, y + ly * escala, escala, cor);
      }
    });
    cursor += (LARGURA_GLIFO + 1) * escala;
  }
}

const BRANCO: Cor = [255, 255, 255];
const SOMBRA: Cor = [20, 24, 32];

/** Linhas centralizadas, cada uma no maior tamanho que cabe (até `escalaMax`). */
export function desenharCartaz(q: Quadro, linhas: readonly string[], escalaMax = 16): void {
  const margem = Math.round(q.largura * 0.08);
  const escalas = linhas.map((l) =>
    Math.max(
      2,
      Math.min(escalaMax, Math.floor((q.largura - 2 * margem) / Math.max(1, larguraEmPontos(l)))),
    ),
  );
  const espaco = (i: number): number => Math.round((escalas[i] ?? 4) * 3);
  const alturaTotal = escalas.reduce(
    (s, e, i) => s + e * ALTURA_LINHA + (i > 0 ? espaco(i) : 0),
    0,
  );
  let y = Math.round((q.altura - alturaTotal) / 2);
  linhas.forEach((linha, i) => {
    const e = escalas[i]!;
    if (i > 0) y += espaco(i);
    const x = Math.round((q.largura - larguraEmPontos(linha) * e) / 2);
    const deslocamento = Math.max(1, Math.round(e / 3));
    desenharTexto(q, linha, x + deslocamento, y + deslocamento, e, SOMBRA);
    desenharTexto(q, linha, x, y, e, BRANCO);
    y += e * ALTURA_LINHA;
  });
}

const CORES: Record<TipoFoto, { topo: Cor; base: Cor; rotulo: string }> = {
  AGUA: { topo: [30, 136, 229], base: [13, 71, 161], rotulo: 'ÁGUA' },
  EXERCICIO: { topo: [251, 140, 0], base: [191, 54, 12], rotulo: 'EXERCÍCIO' },
  LEITURA: { topo: [67, 160, 71], base: [27, 94, 32], rotulo: 'LEITURA' },
};

export interface DadosFoto {
  /** "07" */
  rotuloVu: string;
  numeroDia: number;
  tipo: TipoFoto;
  /** Texto livre da última linha (ex.: "31/10 14:32"). */
  rodape: string;
}

export function linhasDaFoto(d: DadosFoto): string[] {
  return [`VU ${d.rotuloVu}`, `DIA ${d.numeroDia}`, CORES[d.tipo].rotulo, d.rodape];
}

/** Quadro (pixels crus) da foto; separado do JPEG para poder testar sem o sharp. */
export function quadroDaFoto(d: DadosFoto, largura = 720, altura = 960): Quadro {
  const cores = CORES[d.tipo];
  const q = criarQuadro(largura, altura, cores.topo, cores.base);
  desenharCartaz(q, linhasDaFoto(d));
  return q;
}

/** JPEG (~20–40 KB) pronto para o upload. */
export async function gerarFotoJpeg(d: DadosFoto): Promise<Buffer> {
  const q = quadroDaFoto(d);
  return sharp(q.pixels, { raw: { width: q.largura, height: q.altura, channels: 3 } })
    .jpeg({ quality: 82 })
    .toBuffer();
}
