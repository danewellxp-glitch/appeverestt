import type { DadosStory } from '../dadosStory';
import { textoMarcacao } from '../dadosStory';

/** Tamanho do story do Instagram. */
export const LARGURA = 1080;
export const ALTURA = 1920;
export const MARGEM = 80;

export type ImagemFonte = HTMLImageElement | ImageBitmap;

/**
 * foto: foto do treino ou da galeria, com escurecido para ler o texto.
 * marca: fundo vermelho do Everest.
 * adesivo: fundo transparente, para colar em cima de uma foto dentro do Instagram.
 */
export type Fundo = { tipo: 'foto'; imagem: ImagemFonte } | { tipo: 'marca' } | { tipo: 'adesivo' };

export interface Paleta {
  texto: string;
  suave: string;
  linha: string;
  destaque: string;
  /** Cor do símbolo dentro de um círculo pintado com `destaque`. */
  sobreDestaque: string;
  sombra: boolean;
}

export function paletaDe(fundo: Fundo): Paleta {
  if (fundo.tipo === 'marca') {
    return {
      texto: '#ffffff',
      suave: 'rgba(255,255,255,0.82)',
      linha: 'rgba(255,255,255,0.35)',
      destaque: '#ffffff',
      sobreDestaque: '#dc2626',
      sombra: false,
    };
  }
  return {
    texto: '#ffffff',
    suave: 'rgba(255,255,255,0.86)',
    linha: 'rgba(255,255,255,0.4)',
    destaque: '#f97316',
    sobreDestaque: '#ffffff',
    sombra: true,
  };
}

export const fonteDisplay = (px: number, peso = 900) =>
  `${peso} ${px}px "Big Shoulders Display", Impact, sans-serif`;
export const fonteTexto = (px: number, peso = 600) =>
  `${peso} ${px}px "Onest Variable", system-ui, sans-serif`;

const FORMATO = new Intl.NumberFormat('pt-BR');
export const formatar = (n: number) => FORMATO.format(n);

function tamanho(img: ImagemFonte): { w: number; h: number } {
  if ('naturalWidth' in img)
    return { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height };
  return { w: img.width, h: img.height };
}

/** Desenha a imagem cobrindo a área toda (como object-fit: cover). */
export function desenharCover(
  ctx: CanvasRenderingContext2D,
  img: ImagemFonte,
  w: number,
  h: number,
): void {
  const { w: iw, h: ih } = tamanho(img);
  if (!iw || !ih) return;
  const escala = Math.max(w / iw, h / ih);
  const dw = iw * escala;
  const dh = ih * escala;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

export function pintarFundo(ctx: CanvasRenderingContext2D, fundo: Fundo): void {
  ctx.clearRect(0, 0, LARGURA, ALTURA);
  if (fundo.tipo === 'adesivo') return;
  if (fundo.tipo === 'marca') {
    const g = ctx.createLinearGradient(0, 0, 0, ALTURA);
    g.addColorStop(0, '#e1302e');
    g.addColorStop(1, '#8f1414');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, LARGURA, ALTURA);
    const brilho = ctx.createRadialGradient(LARGURA, 0, 0, LARGURA, 0, 1100);
    brilho.addColorStop(0, 'rgba(249,115,22,0.55)');
    brilho.addColorStop(1, 'rgba(249,115,22,0)');
    ctx.fillStyle = brilho;
    ctx.fillRect(0, 0, LARGURA, ALTURA);
    return;
  }
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, LARGURA, ALTURA);
  desenharCover(ctx, fundo.imagem, LARGURA, ALTURA);
  // Escurece em cima (logo) e embaixo (números) para o texto ficar legível em qualquer foto.
  const topo = ctx.createLinearGradient(0, 0, 0, 620);
  topo.addColorStop(0, 'rgba(0,0,0,0.6)');
  topo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = topo;
  ctx.fillRect(0, 0, LARGURA, 620);
  const base = ctx.createLinearGradient(0, 760, 0, ALTURA);
  base.addColorStop(0, 'rgba(0,0,0,0)');
  base.addColorStop(0.45, 'rgba(0,0,0,0.62)');
  base.addColorStop(1, 'rgba(0,0,0,0.88)');
  ctx.fillStyle = base;
  ctx.fillRect(0, 760, LARGURA, ALTURA - 760);
}

/** Liga a sombra leve do texto (fundo com foto ou adesivo) durante `desenho`. */
export function comSombra(ctx: CanvasRenderingContext2D, p: Paleta, desenho: () => void): void {
  ctx.save();
  if (p.sombra) {
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 2;
  }
  desenho();
  ctx.restore();
}

export interface OpcoesTexto {
  fonte: string;
  cor: string;
  alinhar?: CanvasTextAlign;
  espacamento?: number;
  /** Reduz a fonte até caber nesta largura. */
  larguraMax?: number;
}

function definirEspacamento(ctx: CanvasRenderingContext2D, px: number): void {
  if ('letterSpacing' in ctx)
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
}

/** Texto com baseline alfabética em (x, y). */
export function escrever(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  o: OpcoesTexto,
): void {
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = o.alinhar ?? 'left';
  ctx.fillStyle = o.cor;
  definirEspacamento(ctx, o.espacamento ?? 0);
  ctx.font = o.fonte;
  if (o.larguraMax) {
    const m = /(\d+(?:\.\d+)?)px/.exec(o.fonte);
    let px = m ? Number(m[1]) : 0;
    while (px > 12 && ctx.measureText(s).width > o.larguraMax) {
      px -= 4;
      ctx.font = o.fonte.replace(/\d+(?:\.\d+)?px/, `${px}px`);
    }
  }
  ctx.fillText(s, x, y);
  ctx.restore();
}

export function linhaHorizontal(
  ctx: CanvasRenderingContext2D,
  y: number,
  cor: string,
  x0 = MARGEM,
  x1 = LARGURA - MARGEM,
): void {
  ctx.save();
  ctx.strokeStyle = cor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
  ctx.restore();
}

export function linhaVertical(
  ctx: CanvasRenderingContext2D,
  x: number,
  y0: number,
  y1: number,
  cor: string,
): void {
  ctx.save();
  ctx.strokeStyle = cor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y0);
  ctx.lineTo(x, y1);
  ctx.stroke();
  ctx.restore();
}

/** Círculo com check (feito) ou só o contorno (pendente). */
export function selo(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  feito: boolean,
  p: Paleta,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  if (feito) {
    ctx.fillStyle = p.destaque;
    ctx.fill();
    ctx.strokeStyle = p.sobreDestaque;
    ctx.lineWidth = r * 0.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.42, cy + r * 0.02);
    ctx.lineTo(cx - r * 0.12, cy + r * 0.32);
    ctx.lineTo(cx + r * 0.44, cy - r * 0.3);
    ctx.stroke();
  } else {
    ctx.strokeStyle = p.suave;
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  ctx.restore();
}

/** Coluna "RÓTULO / VALOR" usada nas linhas de números. */
export function estatistica(
  ctx: CanvasRenderingContext2D,
  rotulo: string,
  valor: string,
  x: number,
  y: number,
  largura: number,
  p: Paleta,
  tamanhoValor = 84,
): void {
  escrever(ctx, rotulo, x, y, {
    fonte: fonteTexto(26, 700),
    cor: p.suave,
    espacamento: 4,
    larguraMax: largura,
  });
  escrever(ctx, valor, x, y + tamanhoValor + 6, {
    fonte: fonteDisplay(tamanhoValor, 800),
    cor: p.texto,
    larguraMax: largura,
  });
}

/** Logo no topo à esquerda e "DIA N/30" à direita. Fica abaixo da faixa onde o Instagram põe a barra. */
export function cabecalho(
  ctx: CanvasRenderingContext2D,
  d: DadosStory,
  logo: ImagemFonte | null,
  p: Paleta,
): void {
  comSombra(ctx, p, () => {
    if (logo) {
      const { w, h } = tamanho(logo);
      const largura = 380;
      ctx.drawImage(logo, MARGEM, 236, largura, (largura * h) / Math.max(1, w));
    } else {
      escrever(ctx, 'EVEREST', MARGEM, 272, {
        fonte: fonteDisplay(56),
        cor: p.texto,
        espacamento: 6,
      });
    }
    escrever(ctx, `DIA ${d.numeroDia}/${d.totalDias}`, LARGURA - MARGEM, 272, {
      fonte: fonteDisplay(52, 800),
      cor: p.texto,
      alinhar: 'right',
    });
  });
}

/** "@handle #hashtag" centralizado no rodapé. */
export function rodape(ctx: CanvasRenderingContext2D, d: DadosStory, p: Paleta): void {
  const texto = textoMarcacao(d);
  if (!texto) return;
  comSombra(ctx, p, () =>
    escrever(ctx, texto, LARGURA / 2, 1760, {
      fonte: fonteTexto(34, 600),
      cor: p.suave,
      alinhar: 'center',
      larguraMax: LARGURA - MARGEM * 2,
    }),
  );
}
