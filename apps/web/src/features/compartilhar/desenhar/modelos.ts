import type { DadosStory } from '../dadosStory';
import {
  ALTURA,
  LARGURA,
  MARGEM,
  cabecalho,
  comSombra,
  escrever,
  estatistica,
  fonteDisplay,
  fonteTexto,
  formatar,
  linhaHorizontal,
  linhaVertical,
  paletaDe,
  pintarFundo,
  rodape,
  selo,
  type Fundo,
  type ImagemFonte,
  type Paleta,
} from './base';

export const MODELOS = ['escalada', 'dia', 'sequencia'] as const;
export type Modelo = (typeof MODELOS)[number];

export const ROTULO_MODELO: Record<Modelo, string> = {
  escalada: 'Escalada',
  dia: 'Dia de hoje',
  sequencia: 'Sequência',
};

type Ponto = readonly [number, number];

// Silhueta e rota da subida em coordenadas 0..1 (x da esquerda, y de cima). A rota corre logo abaixo da crista.
const SILHUETA: Ponto[] = [
  [0, 1],
  [0.12, 0.8],
  [0.2, 0.84],
  [0.36, 0.5],
  [0.44, 0.58],
  [0.6, 0.24],
  [0.66, 0.3],
  [0.76, 0],
  [0.86, 0.2],
  [0.92, 0.16],
  [1, 0.42],
  [1, 1],
];
const ROTA: Ponto[] = [
  [0.04, 0.98],
  [0.13, 0.85],
  [0.21, 0.9],
  [0.36, 0.56],
  [0.44, 0.64],
  [0.6, 0.3],
  [0.67, 0.37],
  [0.76, 0.03],
];

/** Ponto a uma fração do comprimento total de uma polilinha. */
export function pontoNaRota(
  pontos: readonly Ponto[],
  fracao: number,
): { x: number; y: number; indice: number } {
  const f = Math.max(0, Math.min(1, fracao));
  const trechos = pontos
    .slice(1)
    .map((p, i) => Math.hypot(p[0] - pontos[i]![0], p[1] - pontos[i]![1]));
  const total = trechos.reduce((a, b) => a + b, 0);
  let alvo = total * f;
  for (let i = 0; i < trechos.length; i++) {
    const t = trechos[i]!;
    if (alvo <= t || i === trechos.length - 1) {
      const k = t === 0 ? 0 : Math.min(1, alvo / t);
      const a = pontos[i]!;
      const b = pontos[i + 1]!;
      return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, indice: i };
    }
    alvo -= t;
  }
  const ultimo = pontos[pontos.length - 1]!;
  return { x: ultimo[0], y: ultimo[1], indice: pontos.length - 2 };
}

function montanha(ctx: CanvasRenderingContext2D, d: DadosStory, p: Paleta, fundo: Fundo): void {
  const x0 = MARGEM;
  const y0 = 450;
  const w = LARGURA - MARGEM * 2;
  const h = 590;
  const px = (pt: Ponto | { x: number; y: number }): [number, number] =>
    'x' in pt ? [x0 + pt.x * w, y0 + pt.y * h] : [x0 + pt[0] * w, y0 + pt[1] * h];

  ctx.save();
  // Silhueta
  ctx.beginPath();
  SILHUETA.forEach((pt, i) => (i ? ctx.lineTo(...px(pt)) : ctx.moveTo(...px(pt))));
  ctx.closePath();
  ctx.fillStyle = fundo.tipo === 'marca' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.12)';
  ctx.fill();
  ctx.strokeStyle = fundo.tipo === 'marca' ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Rota inteira em pontilhado
  ctx.beginPath();
  ROTA.forEach((pt, i) => (i ? ctx.lineTo(...px(pt)) : ctx.moveTo(...px(pt))));
  ctx.setLineDash([2, 22]);
  ctx.lineCap = 'round';
  ctx.lineWidth = 10;
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.stroke();
  ctx.setLineDash([]);

  // Trecho já subido
  const atual = pontoNaRota(ROTA, d.fracao);
  if (d.fracao > 0) {
    ctx.beginPath();
    ctx.moveTo(...px(ROTA[0]!));
    for (let i = 1; i <= atual.indice; i++) ctx.lineTo(...px(ROTA[i]!));
    ctx.lineTo(...px(atual));
    ctx.lineJoin = 'round';
    ctx.lineWidth = 16;
    ctx.strokeStyle = p.destaque;
    if (p.sombra) {
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 14;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Bandeira no cume
  const [cx, cy] = px(ROTA[ROTA.length - 1]!);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy - 86);
  ctx.stroke();
  ctx.fillStyle = p.destaque;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 86);
  ctx.lineTo(cx + 58, cy - 68);
  ctx.lineTo(cx, cy - 50);
  ctx.closePath();
  ctx.fill();

  // Onde a pessoa está
  const [ax, ay] = px(atual);
  ctx.beginPath();
  ctx.arc(ax, ay, 28, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ax, ay, 18, 0, Math.PI * 2);
  ctx.fillStyle = fundo.tipo === 'marca' ? '#dc2626' : '#f97316';
  ctx.fill();
  ctx.restore();

  comSombra(ctx, p, () => {
    escrever(ctx, `${formatar(d.altitudeCume)} M`, cx - 22, cy - 40, {
      fonte: fonteDisplay(44, 800),
      cor: p.texto,
      alinhar: 'right',
    });
  });
}

function escalada(ctx: CanvasRenderingContext2D, d: DadosStory, p: Paleta, fundo: Fundo): void {
  montanha(ctx, d, p, fundo);
  comSombra(ctx, p, () => {
    escrever(
      ctx,
      d.altitude >= d.altitudeCume ? 'CHEGUEI NO CUME' : 'MINHA ESCALADA',
      MARGEM,
      1130,
      {
        fonte: fonteTexto(30, 700),
        cor: p.suave,
        espacamento: 6,
      },
    );
    escrever(ctx, `${formatar(d.altitude)} M`, MARGEM, 1350, {
      fonte: fonteDisplay(240),
      cor: p.texto,
      larguraMax: LARGURA - MARGEM * 2,
    });
    escrever(ctx, `de ${formatar(d.altitudeCume)} m até o cume do Everest`, MARGEM, 1420, {
      fonte: fonteTexto(38, 500),
      cor: p.suave,
      larguraMax: LARGURA - MARGEM * 2,
    });
    linhaHorizontal(ctx, 1470, p.linha);
    const meio = LARGURA / 2;
    const larguraColuna = meio - MARGEM - 30;
    estatistica(
      ctx,
      'DIAS CONCLUÍDOS',
      `${d.diasConcluidos} DE ${d.totalDias}`,
      MARGEM,
      1530,
      larguraColuna,
      p,
    );
    linhaVertical(ctx, meio, 1500, 1630, p.linha);
    const seq = d.sequenciaAtual === 1 ? '1 DIA' : `${d.sequenciaAtual} DIAS`;
    estatistica(ctx, 'SEQUÊNCIA', seq, meio + 40, 1530, larguraColuna, p);
  });
}

const ROTULO_DIA = { true: 'TODOS OS HÁBITOS EM DIA', false: 'HÁBITOS DE HOJE' } as const;

function diaDeHoje(ctx: CanvasRenderingContext2D, d: DadosStory, p: Paleta): void {
  comSombra(ctx, p, () => {
    escrever(ctx, ROTULO_DIA[String(d.habitosOk === 3) as 'true' | 'false'], MARGEM, 430, {
      fonte: fonteTexto(30, 700),
      cor: p.suave,
      espacamento: 6,
    });
    escrever(ctx, `DIA ${d.numeroDia}`, MARGEM - 6, 720, {
      fonte: fonteDisplay(300),
      cor: p.texto,
    });
    escrever(
      ctx,
      `${d.habitosOk} de 3 hábitos · ${formatar(d.altitude)} m de altitude`,
      MARGEM,
      800,
      {
        fonte: fonteTexto(40, 600),
        cor: p.suave,
        larguraMax: LARGURA - MARGEM * 2,
      },
    );

    const linhas: { rotulo: string; valor: string; feito: boolean }[] = [
      { rotulo: 'ÁGUA', valor: `${formatar(d.aguaMl)} ML`, feito: d.aguaOk },
      { rotulo: 'TREINO', valor: d.exercicio ? 'FEITO' : '—', feito: d.exercicio },
      {
        rotulo: 'LEITURA',
        valor: d.paginasLidas === 1 ? '1 PÁG' : `${d.paginasLidas} PÁGS`,
        feito: d.leituraOk,
      },
    ];
    const topo = 940;
    const altura = 200;
    linhas.forEach((l, i) => {
      const y = topo + i * altura;
      linhaHorizontal(ctx, y, p.linha);
      const centro = y + altura / 2;
      selo(ctx, MARGEM + 46, centro, 46, l.feito, p);
      escrever(ctx, l.rotulo, MARGEM + 130, centro + 24, {
        fonte: fonteDisplay(68, 800),
        cor: p.texto,
      });
      escrever(ctx, l.valor, LARGURA - MARGEM, centro + 36, {
        fonte: fonteDisplay(104),
        cor: l.feito ? p.destaque : p.suave,
        alinhar: 'right',
        larguraMax: 440,
      });
    });
    linhaHorizontal(ctx, topo + linhas.length * altura, p.linha);
  });
}

function sequencia(ctx: CanvasRenderingContext2D, d: DadosStory, p: Paleta): void {
  const temSequencia = d.sequenciaAtual > 0;
  const numero = temSequencia ? d.sequenciaAtual : d.diasConcluidos;
  const legenda = temSequencia
    ? numero === 1
      ? 'DIA SEGUIDO'
      : 'DIAS SEGUIDOS'
    : numero === 1
      ? 'DIA CONCLUÍDO'
      : 'DIAS CONCLUÍDOS';

  comSombra(ctx, p, () => {
    escrever(ctx, 'SEM QUEBRAR A CORRENTE', MARGEM, 430, {
      fonte: fonteTexto(30, 700),
      cor: p.suave,
      espacamento: 6,
    });
    escrever(ctx, String(numero), MARGEM - 14, 960, {
      fonte: fonteDisplay(600),
      cor: p.texto,
      larguraMax: 920,
    });
    escrever(ctx, legenda, MARGEM, 1100, {
      fonte: fonteDisplay(130),
      cor: p.destaque,
      larguraMax: 920,
    });
  });

  // Uma barrinha por dia do desafio
  const n = d.trilha.length;
  const vao = n > 40 ? 4 : 8;
  const largura = (LARGURA - MARGEM * 2 - vao * (n - 1)) / n;
  ctx.save();
  d.trilha.forEach((feito, i) => {
    ctx.fillStyle = feito ? p.destaque : 'rgba(255,255,255,0.26)';
    ctx.beginPath();
    const x = MARGEM + i * (largura + vao);
    if (typeof ctx.roundRect === 'function')
      ctx.roundRect(x, 1170, largura, 70, Math.min(8, largura / 2));
    else ctx.rect(x, 1170, largura, 70);
    ctx.fill();
  });
  ctx.restore();

  comSombra(ctx, p, () => {
    linhaHorizontal(ctx, 1320, p.linha);
    const col = (LARGURA - MARGEM * 2) / 3;
    const itens: [string, string][] = [
      ['DIAS', `${d.diasConcluidos}/${d.totalDias}`],
      ['RANKING', d.posicao ? `${d.posicao}º` : '—'],
      ['RECORDE', `${d.melhorSequencia}`],
    ];
    itens.forEach(([rotulo, valor], i) => {
      const x = MARGEM + i * col;
      if (i > 0) linhaVertical(ctx, x - 20, 1350, 1500, p.linha);
      estatistica(ctx, rotulo, valor, x + (i > 0 ? 20 : 0), 1400, col - 50, p, 96);
    });
  });
}

export interface OpcoesDesenho {
  modelo: Modelo;
  fundo: Fundo;
  logo: ImagemFonte | null;
}

/** Desenha o story inteiro (1080x1920) no canvas. */
export function desenharStory(canvas: HTMLCanvasElement, d: DadosStory, o: OpcoesDesenho): void {
  canvas.width = LARGURA;
  canvas.height = ALTURA;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const p = paletaDe(o.fundo);
  pintarFundo(ctx, o.fundo);
  cabecalho(ctx, d, o.logo, p);
  if (o.modelo === 'escalada') escalada(ctx, d, p, o.fundo);
  else if (o.modelo === 'dia') diaDeHoje(ctx, d, p);
  else sequencia(ctx, d, p);
  rodape(ctx, d, p);
}
