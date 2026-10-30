// Gera os arquivos da marca a partir da logo oficial (apps/web/design/logo-original.jpg,
// JPEG com fundo preto, montanha em traço branco e o nome "EVEREST" em vermelho embaixo):
//   apps/web/public/marca/montanha.png  máscara da montanha (alfa = brilho dos pixels brancos)
//   apps/web/public/marca/everest.png   máscara do nome (alfa = quanto o pixel é vermelho)
//   apps/web/public/marca/icone.png     montanha com traço engrossado, para ícones pequenos (28 px)
//   apps/web/public/logo.png            1024x1024, fundo preto, montanha branca + nome vermelho
//                                        (fonte dos ícones do PWA: pwa-assets.config.ts)
// Na UI as máscaras viram `mask-image` (utilitário mascara-marca) e a cor vem do background,
// então a montanha acompanha o tema. Uso, na raiz do repo:
//   node scripts/marca.cjs
//   pnpm --filter web generate-pwa-assets
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(
  require.resolve('sharp', { paths: [path.join(__dirname, '..', 'apps', 'api')] }),
);

const web = path.join(__dirname, '..', 'apps', 'web');
const ORIGEM = path.join(web, 'design', 'logo-original.jpg');
const PASTA_MARCA = path.join(web, 'public', 'marca');
const DESTINO_MONTANHA = path.join(PASTA_MARCA, 'montanha.png');
const DESTINO_EVEREST = path.join(PASTA_MARCA, 'everest.png');
const DESTINO_ICONE = path.join(PASTA_MARCA, 'icone.png');
const DESTINO_LOGO = path.join(web, 'public', 'logo.png');
const RAIO_ICONE = Number(process.env.RAIO_ICONE ?? 6); // px da origem
const LADO_ICONE = 128;
const MARGEM_ICONE = 0.02;

const LIMITE_BYTES = 40 * 1024;
const LADO_MAXIMO = 1024;
const LADO_LOGO = 1024;
const MARGEM_LOGO = 0.14; // folga em volta da marca no logo.png (cada lado)
const MARGEM_MONTANHA = 0.04;
const MARGEM_EVEREST = 0.06; // do lado menor (altura das letras)
const PISO_BBOX = 0.15; // alfa mínimo para um pixel contar no recorte
const LIMIAR_LINHA = 60; // brilho/vermelho mínimo para um pixel contar como "tinta" na linha
const MIN_PIXELS_LINHA = 2; // ignora pixels soltos de ruído do JPEG

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

function percentil(valores, p) {
  if (valores.length === 0) return 0;
  const ordenados = Float64Array.from(valores).sort();
  return ordenados[Math.min(ordenados.length - 1, Math.floor(p * ordenados.length))];
}

/** Bbox dos pixels com alfa > PISO_BBOX dentro das linhas [y0, y1). */
function caixa(alfa, largura, y0, y1) {
  let x0 = Infinity;
  let x1 = -1;
  let yMin = Infinity;
  let yMax = -1;
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < largura; x++) {
      if (alfa[y * largura + x] > PISO_BBOX) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < yMin) yMin = y;
        if (y > yMax) yMax = y;
      }
    }
  }
  if (x1 < 0) throw new Error(`nenhum pixel de marca entre as linhas ${y0} e ${y1}`);
  return { x: x0, y: yMin, w: x1 - x0 + 1, h: yMax - yMin + 1 };
}

/** Aumenta a caixa em `fracao` do lado de referência (maior ou menor), sem sair da imagem. */
function comMargem(c, fracao, largura, altura, lado = Math.max) {
  const m = Math.max(2, Math.round(lado(c.w, c.h) * fracao));
  const x = Math.max(0, c.x - m);
  const y = Math.max(0, c.y - m);
  return {
    x,
    y,
    w: Math.min(largura, c.x + c.w + m) - x,
    h: Math.min(altura, c.y + c.h + m) - y,
  };
}

/** Dilatação (máximo num quadrado de lado 2r+1), separável: engrossa o traço. */
function dilatar(alfa, largura, altura, r) {
  const tmp = new Float32Array(alfa.length);
  const out = new Float32Array(alfa.length);
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      let m = 0;
      for (let k = Math.max(0, x - r); k <= Math.min(largura - 1, x + r); k++) {
        const v = alfa[y * largura + k];
        if (v > m) m = v;
      }
      tmp[y * largura + x] = m;
    }
  }
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      let m = 0;
      for (let k = Math.max(0, y - r); k <= Math.min(altura - 1, y + r); k++) {
        const v = tmp[k * largura + x];
        if (v > m) m = v;
      }
      out[y * largura + x] = m;
    }
  }
  return out;
}

/** Recorta o alfa e monta um buffer cru com `canais` (4 = RGBA, 2 = cinza+alfa), cor branca. */
function bufferMascara(alfa, largura, c, canais) {
  const buf = Buffer.alloc(c.w * c.h * canais, 255);
  for (let y = 0; y < c.h; y++) {
    for (let x = 0; x < c.w; x++) {
      const a = alfa[(c.y + y) * largura + (c.x + x)];
      buf[(y * c.w + x) * canais + canais - 1] = Math.round(a * 255);
    }
  }
  return buf;
}

/** Grava a máscara cabendo em LIMITE_BYTES: RGBA → cinza+alfa → reduz a dimensão. */
async function gravarMascara(alfa, largura, c, destino, ladoMaximo = LADO_MAXIMO) {
  let lado = Math.min(ladoMaximo, Math.max(c.w, c.h));
  for (;;) {
    for (const canais of [4, 2]) {
      const escala = lado / Math.max(c.w, c.h);
      const png = await sharp(bufferMascara(alfa, largura, c, canais), {
        raw: { width: c.w, height: c.h, channels: canais },
      })
        .resize(Math.round(c.w * escala), Math.round(c.h * escala), { kernel: 'lanczos3' })
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer({ resolveWithObject: true });
      if (png.data.length <= LIMITE_BYTES) {
        fs.writeFileSync(destino, png.data);
        return { ...png.info, bytes: png.data.length, canais };
      }
    }
    if (lado < 256) throw new Error(`${path.basename(destino)} não coube em ${LIMITE_BYTES} bytes`);
    lado = Math.round(lado * 0.85);
  }
}

async function main() {
  const { data, info } = await sharp(ORIGEM)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;

  // Alfa de cada parte, pixel a pixel.
  const alfaBranco = new Float32Array(W * H);
  const vermelho = new Float32Array(W * H); // r − max(g, b), ainda sem normalizar
  const tintaPorLinha = new Uint32Array(H);
  for (let i = 0, p = 0; i < W * H; i++, p += C) {
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const ver = Math.max(0, r - Math.max(g, b));
    vermelho[i] = ver;
    // Só branco/cinza: pixel com cor forte de vermelho não entra na montanha.
    alfaBranco[i] = ver > 60 ? 0 : clamp01((lum - 40) / 160);
    if (lum > LIMIAR_LINHA || ver > LIMIAR_LINHA) tintaPorLinha[Math.floor(i / W)]++;
  }

  // Vão entre a montanha (em cima) e o nome (embaixo): maior sequência de linhas vazias
  // entre a primeira e a última linha com tinta.
  const temTinta = (y) => tintaPorLinha[y] >= MIN_PIXELS_LINHA;
  let primeira = 0;
  while (primeira < H && !temTinta(primeira)) primeira++;
  let ultima = H - 1;
  while (ultima > primeira && !temTinta(ultima)) ultima--;
  let melhor = { inicio: -1, tamanho: 0 };
  for (let y = primeira, inicio = -1; y <= ultima; y++) {
    if (!temTinta(y)) {
      if (inicio < 0) inicio = y;
      if (y - inicio + 1 > melhor.tamanho) melhor = { inicio, tamanho: y - inicio + 1 };
    } else {
      inicio = -1;
    }
  }
  if (melhor.tamanho === 0) throw new Error('não achei o vão entre a montanha e o nome');
  const corte = melhor.inicio + Math.floor(melhor.tamanho / 2);
  console.log(
    `origem ${W}x${H}; tinta nas linhas ${primeira}–${ultima}; vão ${melhor.inicio}–${
      melhor.inicio + melhor.tamanho - 1
    } (corte na ${corte})`,
  );

  // Montanha: só acima do corte.
  for (let y = corte; y < H; y++) alfaBranco.fill(0, y * W, (y + 1) * W);

  // Nome: só abaixo do corte, r − max(g,b) com piso de ruído e normalizado pelo percentil 99.
  const PISO_VERMELHO = 18;
  const amostras = [];
  for (let i = corte * W; i < W * H; i++)
    if (vermelho[i] > LIMIAR_LINHA) amostras.push(vermelho[i]);
  const teto = percentil(amostras, 0.99);
  const alfaVermelho = new Float32Array(W * H);
  for (let i = corte * W; i < W * H; i++) {
    alfaVermelho[i] = clamp01((vermelho[i] - PISO_VERMELHO) / (teto - PISO_VERMELHO));
  }

  // Cor original do nome (média dos pixels bem vermelhos), usada no logo.png.
  let soma = [0, 0, 0];
  let n = 0;
  for (let i = corte * W, p = corte * W * C; i < W * H; i++, p += C) {
    if (alfaVermelho[i] >= 0.95) {
      soma = [soma[0] + data[p], soma[1] + data[p + 1], soma[2] + data[p + 2]];
      n++;
    }
  }
  const corNome = soma.map((v) => Math.round(v / Math.max(1, n)));
  const hex = '#' + corNome.map((v) => v.toString(16).padStart(2, '0')).join('');

  const caixaMontanha = caixa(alfaBranco, W, 0, corte);
  const caixaNome = caixa(alfaVermelho, W, corte, H);
  const recorteMontanha = comMargem(caixaMontanha, MARGEM_MONTANHA, W, H);
  const recorteNome = comMargem(caixaNome, MARGEM_EVEREST, W, H, Math.min);

  fs.mkdirSync(PASTA_MARCA, { recursive: true });
  const montanha = await gravarMascara(alfaBranco, W, recorteMontanha, DESTINO_MONTANHA);
  const nome = await gravarMascara(alfaVermelho, W, recorteNome, DESTINO_EVEREST);

  // Ícone: o traço original (2–3 px em 854) some em 28 px. Engrossa a montanha (dilatação)
  // e grava pequeno, para o topo das telas.
  const alfaIcone = dilatar(alfaBranco, W, H, RAIO_ICONE);
  const recorteIcone = comMargem(caixa(alfaIcone, W, 0, corte), MARGEM_ICONE, W, H);
  const icone = await gravarMascara(alfaIcone, W, recorteIcone, DESTINO_ICONE, LADO_ICONE);

  // logo.png: montanha branca + nome na cor original sobre preto, na mesma posição relativa
  // da logo original, centralizados no quadrado com MARGEM_LOGO de folga.
  const uniao = {
    x: Math.min(caixaMontanha.x, caixaNome.x),
    y: caixaMontanha.y,
    w:
      Math.max(caixaMontanha.x + caixaMontanha.w, caixaNome.x + caixaNome.w) -
      Math.min(caixaMontanha.x, caixaNome.x),
    h: caixaNome.y + caixaNome.h - caixaMontanha.y,
  };
  const rgb = Buffer.alloc(uniao.w * uniao.h * 3, 0);
  for (let y = 0; y < uniao.h; y++) {
    for (let x = 0; x < uniao.w; x++) {
      const i = (uniao.y + y) * W + (uniao.x + x);
      const aB = alfaBranco[i];
      const aV = alfaVermelho[i];
      const o = (y * uniao.w + x) * 3;
      for (let k = 0; k < 3; k++) {
        rgb[o + k] = Math.round(Math.min(255, 255 * aB + corNome[k] * aV));
      }
    }
  }
  const interno = Math.round(LADO_LOGO * (1 - 2 * MARGEM_LOGO));
  const logoMeio = await sharp(rgb, { raw: { width: uniao.w, height: uniao.h, channels: 3 } })
    .resize(interno, interno, { fit: 'contain', background: '#000000', kernel: 'lanczos3' })
    .png()
    .toBuffer();
  const borda = (LADO_LOGO - interno) / 2;
  await sharp(logoMeio)
    .extend({
      top: Math.floor(borda),
      bottom: Math.ceil(borda),
      left: Math.floor(borda),
      right: Math.ceil(borda),
      background: '#000000',
    })
    .png({ compressionLevel: 9 })
    .toFile(DESTINO_LOGO);
  const bytesLogo = fs.statSync(DESTINO_LOGO).size;

  const kb = (b) => `${(b / 1024).toFixed(1)} KB`;
  const tipo = (c) => (c === 4 ? 'RGBA' : 'cinza+alfa');
  console.log(
    `marca/montanha.png ${montanha.width}x${montanha.height} (${tipo(montanha.canais)}), ${kb(montanha.bytes)}`,
  );
  console.log(
    `marca/everest.png  ${nome.width}x${nome.height} (${tipo(nome.canais)}), ${kb(nome.bytes)}`,
  );
  console.log(
    `marca/icone.png    ${icone.width}x${icone.height} (${tipo(icone.canais)}), ${kb(icone.bytes)}`,
  );
  console.log(`logo.png           ${LADO_LOGO}x${LADO_LOGO}, ${kb(bytesLogo)} (nome em ${hex})`);
  console.log(
    `proporções: montanha ${montanha.width}/${montanha.height} = ${(montanha.width / montanha.height).toFixed(3)}; ` +
      `everest ${nome.width}/${nome.height} = ${(nome.width / nome.height).toFixed(3)}`,
  );
}

main().catch((erro) => {
  console.error(erro);
  process.exitCode = 1;
});
