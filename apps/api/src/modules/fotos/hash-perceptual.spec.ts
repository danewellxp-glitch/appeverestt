import sharp from 'sharp';
import {
  AMPLITUDE_MINIMA,
  DISTANCIA_MAX_PARECIDA,
  IndiceHashes,
  dHashDePixels,
  distanciaHamming,
  hashPerceptual,
} from './hash-perceptual';

/** 9×8 em cinza, linha a linha. */
function grade(valor: (x: number, y: number) => number): number[] {
  const px: number[] = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 9; x++) px.push(valor(x, y));
  return px;
}

/** Gerador pseudoaleatório determinístico (mulberry32). */
function aleatorio(semente: number): () => number {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** JPEG com blocos de cores aleatórias (textura), como uma foto qualquer. */
async function jpegComTextura(semente: number, largura = 1200, altura = 900): Promise<Buffer> {
  const r = aleatorio(semente);
  const [colunas, linhas] = [12, 9];
  const blocos = Buffer.from(
    Array.from({ length: colunas * linhas * 3 }, () => Math.floor(r() * 256)),
  );
  return sharp(blocos, { raw: { width: colunas, height: linhas, channels: 3 } })
    .resize(largura, altura, { kernel: 'nearest' })
    .jpeg({ quality: 85 })
    .toBuffer();
}

/** O mesmo que o worker faz antes de calcular o hash (gira pelo EXIF, reduz, webp). */
function processarComoOWorker(imagem: Buffer): Promise<Buffer> {
  return sharp(imagem)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}

const hashProcessado = async (imagem: Buffer) => hashPerceptual(await processarComoOWorker(imagem));

function hashAleatorio(r: () => number): string {
  let h = '';
  for (let i = 0; i < 16; i++) h += Math.floor(r() * 16).toString(16);
  return h;
}

/** Inverte `n` bits distintos (escolhidos por `r`). */
function inverterBits(hash: string, n: number, r: () => number): string {
  const bits = [...hash]
    .map((c) => Number.parseInt(c, 16).toString(2).padStart(4, '0'))
    .join('')
    .split('');
  const posicoes = new Set<number>();
  while (posicoes.size < n) posicoes.add(Math.floor(r() * 64));
  for (const p of posicoes) bits[p] = bits[p] === '1' ? '0' : '1';
  let hex = '';
  for (let i = 0; i < 64; i += 4)
    hex += Number.parseInt(bits.slice(i, i + 4).join(''), 2).toString(16);
  return hex;
}

describe('dHashDePixels', () => {
  it('escurecendo para a direita → todos os bits 1; clareando → todos 0', () => {
    expect(dHashDePixels(grade((x) => 250 - x * 25))).toBe('ffffffffffffffff');
    expect(dHashDePixels(grade((x) => x * 25))).toBe('0000000000000000');
  });

  it('ordem dos bits: linha a linha, o 1º bit é o mais significativo', () => {
    // só o pixel (0,0) é mais claro que o vizinho da direita → só o 1º bit
    expect(dHashDePixels(grade((x, y) => (x === 0 && y === 0 ? 200 : 100)))).toBe(
      '8000000000000000',
    );
    // só o (7,7) é mais claro que o (8,7) → só o último bit
    expect(dHashDePixels(grade((x, y) => (x === 7 && y === 7 ? 200 : 100)))).toBe(
      '0000000000000001',
    );
    // linha 4 (1ª da 2ª metade), 1ª comparação
    expect(dHashDePixels(grade((x, y) => (x === 0 && y === 4 ? 200 : 100)))).toBe(
      '0000000080000000',
    );
  });

  it('imagem lisa (amplitude abaixo do mínimo) não tem hash', () => {
    expect(dHashDePixels(grade(() => 128))).toBeNull();
    const quaseLisa = (amplitude: number) => grade((x, y) => 100 + ((x + y) % 2) * amplitude);
    expect(dHashDePixels(quaseLisa(AMPLITUDE_MINIMA - 1))).toBeNull();
    expect(dHashDePixels(quaseLisa(AMPLITUDE_MINIMA))).toMatch(/^[0-9a-f]{16}$/);
  });

  it('com vários canais usa só o primeiro', () => {
    const cinza = grade((x) => 250 - x * 25);
    const rgb = cinza.flatMap((v) => [v, 0, 255]);
    expect(dHashDePixels(rgb, 3)).toBe(dHashDePixels(cinza));
  });

  it('tamanho errado é erro de programação', () => {
    expect(() => dHashDePixels(new Array<number>(71).fill(0))).toThrow('9×8');
  });
});

describe('distanciaHamming', () => {
  it('conta os bits diferentes', () => {
    expect(distanciaHamming('0123456789abcdef', '0123456789abcdef')).toBe(0);
    expect(distanciaHamming('0000000000000000', 'ffffffffffffffff')).toBe(64);
    expect(distanciaHamming('8000000000000000', '0000000000000000')).toBe(1);
    expect(distanciaHamming('0000000000000001', '0000000000000000')).toBe(1);
    expect(distanciaHamming('00000000ffffffff', '0000000000000000')).toBe(32);
    expect(distanciaHamming('f0f0f0f0f0f0f0f0', '0f0f0f0f0f0f0f0f')).toBe(64);
  });

  it('é simétrica e bate com a contagem bit a bit', () => {
    const r = aleatorio(7);
    for (let i = 0; i < 200; i++) {
      const a = hashAleatorio(r);
      const b = hashAleatorio(r);
      const ba = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
      const esperado = [...ba.toString(2)].filter((c) => c === '1').length;
      expect(distanciaHamming(a, b)).toBe(esperado);
      expect(distanciaHamming(b, a)).toBe(esperado);
    }
  });

  it('recusa hash fora do formato', () => {
    expect(() => distanciaHamming('abc', '0000000000000000')).toThrow('inválido');
    expect(() => distanciaHamming('ABCDEF0123456789', '0000000000000000')).toThrow('inválido');
  });
});

describe('hashPerceptual (sharp)', () => {
  it('a mesma foto recomprimida, reduzida ou mais clara continua parecida; outra foto não', async () => {
    const original = await jpegComTextura(1);
    const copias = await Promise.all([
      sharp(original).resize({ width: 640 }).webp({ quality: 50 }).toBuffer(),
      sharp(original).resize({ width: 1000 }).jpeg({ quality: 70 }).toBuffer(),
      sharp(original).modulate({ brightness: 1.1 }).jpeg({ quality: 80 }).toBuffer(),
    ]);
    const h = await hashProcessado(original);
    expect(h).toMatch(/^[0-9a-f]{16}$/);
    for (const copia of copias) {
      expect(distanciaHamming(h ?? '', (await hashProcessado(copia)) ?? '')).toBeLessThanOrEqual(
        DISTANCIA_MAX_PARECIDA,
      );
    }
    for (const semente of [2, 3, 4]) {
      const outra = (await hashProcessado(await jpegComTextura(semente))) ?? '';
      expect(distanciaHamming(h ?? '', outra)).toBeGreaterThan(DISTANCIA_MAX_PARECIDA);
    }
  });

  it('foto deitada com orientação no EXIF: a versão processada (já girada) fica parecida com a em pé', async () => {
    const emPe = await jpegComTextura(5);
    const deitada = await sharp(emPe)
      .rotate(-90)
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    const [h1, h2] = await Promise.all([emPe, deitada].map(hashProcessado));
    expect(distanciaHamming(h1 ?? '', h2 ?? '')).toBeLessThanOrEqual(DISTANCIA_MAX_PARECIDA);
  });

  it('cor sólida não tem hash (vermelho e azul não viram "parecidas")', async () => {
    for (const cor of ['#b91c1c', '#1d4ed8']) {
      const img = await sharp({ create: { width: 400, height: 300, channels: 3, background: cor } })
        .jpeg()
        .toBuffer();
      expect(await hashPerceptual(img)).toBeNull();
    }
  });

  it('PNG transparente é achatado em branco', async () => {
    const png = await sharp({
      create: { width: 90, height: 80, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([
        {
          input: await sharp({
            create: { width: 45, height: 80, channels: 4, background: '#000000' },
          })
            .png()
            .toBuffer(),
          left: 45,
          top: 0,
        },
      ])
      .png()
      .toBuffer();
    // metade esquerda branca, direita preta → cada linha "escurece" na divisa
    expect(await hashPerceptual(png)).toMatch(/^[0-9a-f]{16}$/);
    expect(await hashPerceptual(png)).not.toBe('0000000000000000');
  });
});

describe('IndiceHashes', () => {
  const itens = [
    { id: 'a', hash: '0000000000000000' },
    { id: 'b', hash: '000000000000001f' }, // 5 bits de distância de "a"
    { id: 'c', hash: '000000000000003f' }, // 6 de "a", 1 de "b"
    { id: 'd', hash: 'ffffffffffffffff' },
    { id: 'e', hash: '0000000000000000' }, // igual a "a"
  ];

  it('acha o mais próximo dentro do limite e ignora quem `aceitar` recusa', () => {
    const indice = new IndiceHashes(itens);
    expect(indice.maisParecido('0000000000000000', (i) => i.id !== 'a')).toEqual({
      item: itens[4],
      distancia: 0,
    });
    expect(indice.maisParecido('000000000000003f', (i) => i.id !== 'c')).toEqual({
      item: itens[1],
      distancia: 1,
    });
    expect(indice.maisParecido('ffffffffffffffff', (i) => i.id !== 'd')).toBeNull();
    // "c" está a 6 de "a" e "e": fora do limite; "b" (5) entra
    expect(
      indice.maisParecido('0000000000000000', (i) => i.id === 'c' || i.id === 'b')?.item.id,
    ).toBe('b');
    expect(indice.maisParecido('0000000000000000', (i) => i.id === 'c')).toBeNull();
  });

  it('empate fica com o primeiro da lista (o mais antigo)', () => {
    const indice = new IndiceHashes(itens);
    expect(indice.maisParecido('0000000000000000')?.item.id).toBe('a');
  });

  it('bate com a comparação de todos com todos', () => {
    const r = aleatorio(42);
    const base = Array.from({ length: 300 }, (_, i) => ({ id: `r${i}`, hash: hashAleatorio(r) }));
    // cópias com 0 a 8 bits trocados: metade dentro do limite, metade fora
    const copias = base
      .slice(0, 120)
      .map((b, i) => ({ id: `c${i}`, hash: inverterBits(b.hash, i % 9, r) }));
    const todos = [...base, ...copias];
    const indice = new IndiceHashes(todos);
    for (const alvo of todos) {
      let esperado: { id: string; distancia: number } | null = null;
      for (const outro of todos) {
        if (outro.id === alvo.id) continue;
        const d = distanciaHamming(alvo.hash, outro.hash);
        if (d <= DISTANCIA_MAX_PARECIDA && (!esperado || d < esperado.distancia)) {
          esperado = { id: outro.id, distancia: d };
        }
      }
      const achado = indice.maisParecido(alvo.hash, (i) => i.id !== alvo.id);
      expect(achado ? { id: achado.item.id, distancia: achado.distancia } : null).toEqual(esperado);
    }
  });

  it('limite fora da faixa é erro', () => {
    expect(() => new IndiceHashes(itens, -1)).toThrow();
    expect(() => new IndiceHashes(itens, 64)).toThrow();
  });
});
