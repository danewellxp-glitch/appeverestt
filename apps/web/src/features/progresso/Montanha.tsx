import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { reduzirMovimento } from '../../lib/transicoes';

const CRISTA = 'M10 200 L50 168 L78 178 L118 128 L146 140 L186 94 L210 104 L244 58 L266 70 L300 20';
// Área sob a crista: mesma linha, sem o "M10 200" inicial (senão abre um subcaminho novo).
const AREA = `M0 222 L0 206 L10 200 ${CRISTA.slice('M10 200 '.length)} L320 66 L320 222Z`;
const ACAMPAMENTOS: [number, string][] = [
  [0, 'Base'],
  [0.25, 'C1'],
  [0.5, 'C2'],
  [0.75, 'C3'],
  [1, 'Cume'],
];
const DURACAO_MS = 1200;
const ATRASO_MS = 200;
/** viewBox do desenho (as bolhas da turma são posicionadas em % destas medidas). */
export const LARGURA = 320;
export const ALTURA = 222;

/** Ponto da crista numa fração do caminho (0–1), calculado pela geometria do SVG. */
export function pontoNa(trilha: SVGPathElement, fracao: number): { x: number; y: number } {
  const p = trilha.getPointAtLength(trilha.getTotalLength() * fracao);
  return { x: p.x, y: p.y };
}

/** Os vértices da crista (só segmentos retos), para calcular pontos sem o SVG (jsdom). */
const VERTICES = [...CRISTA.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((m) => ({
  x: Number(m[1]),
  y: Number(m[2]),
}));

/** Mesmo ponto de `pontoNa`, calculado à mão sobre a linha poligonal da crista. */
export function pontoNaCrista(fracao: number): { x: number; y: number } {
  const trechos = VERTICES.slice(1).map((b, i) => {
    const a = VERTICES[i] ?? b;
    return { a, b, comprimento: Math.hypot(b.x - a.x, b.y - a.y) };
  });
  const total = trechos.reduce((s, t) => s + t.comprimento, 0);
  let resto = Math.max(0, Math.min(1, fracao)) * total;
  for (const t of trechos) {
    if (resto <= t.comprimento || t === trechos[trechos.length - 1]) {
      const k = t.comprimento > 0 ? Math.min(1, resto / t.comprimento) : 0;
      return { x: t.a.x + (t.b.x - t.a.x) * k, y: t.a.y + (t.b.y - t.a.y) * k };
    }
    resto -= t.comprimento;
  }
  return VERTICES[0] ?? { x: 0, y: 0 };
}

/** Algo desenhado sobre a crista (ex.: bolha de um grupo da turma) numa fração da escalada. */
export interface ItemSobreMontanha {
  chave: string;
  fracao: number;
  conteudo: ReactNode;
  /** Maior primeiro na disputa por espaço (padrão 0). */
  prioridade?: number;
  /** Pode ficar de fora (só o ponto na crista) se não couber sem encostar em outra bolha. */
  descartavel?: boolean;
}

/** Distância mínima (em unidades do viewBox) entre centros de bolhas: ~ o diâmetro de um avatar sm. */
const RAIO_COLISAO = 36;
/** Deslocamentos verticais tentados em ordem: na crista, acima, abaixo. */
const DESLOCAMENTOS = [0, -34, 34];

type Ponto = { x: number; y: number };

/**
 * Posições das bolhas, na ordem de entrada. Disputam espaço por prioridade: cada uma vai no ponto
 * da crista ou, se encostar numa já colocada, acima/abaixo (zigue-zague). Sem lugar livre, a
 * descartável fica de fora (null) e a obrigatória vai mesmo assim no primeiro candidato.
 */
export function posicionarItens(
  itens: readonly { fracao: number; prioridade?: number; descartavel?: boolean }[],
  ponto: (fracao: number) => Ponto = pontoNaCrista,
): (Ponto | null)[] {
  const ordem = itens.map((_, i) => i).sort((a, b) => (itens[b]?.prioridade ?? 0) - (itens[a]?.prioridade ?? 0));
  const resultado: (Ponto | null)[] = itens.map(() => null);
  const colocados: Ponto[] = [];
  for (const i of ordem) {
    const item = itens[i];
    if (!item) continue;
    const base = ponto(item.fracao);
    const candidatos = DESLOCAMENTOS.map((d) => ({ x: base.x, y: base.y + d })).filter(
      (c) => c.y >= 16 && c.y <= ALTURA - 16,
    );
    const livre = candidatos.find((c) => colocados.every((o) => Math.hypot(o.x - c.x, o.y - c.y) >= RAIO_COLISAO));
    const escolhido = livre ?? (item.descartavel ? null : (candidatos[0] ?? base));
    if (escolhido) colocados.push(escolhido);
    resultado[i] = escolhido;
  }
  return resultado;
}

/**
 * Montanha da escalada simbólica (docs/FRONTEND.md §8.3): crista tracejada, trecho percorrido em
 * vermelho e marcador com halo, animados de 0 até `dias/total` (1,2 s, ease-out). Reduced motion: direto.
 */
export function Montanha({
  diasConcluidos,
  totalDias,
  altitude,
  outros,
  marcador: comMarcador = true,
}: {
  diasConcluidos: number;
  totalDias: number;
  altitude: number;
  /** Camada HTML sobre o SVG (montanha da turma): cada item no seu ponto da crista. */
  outros?: readonly ItemSobreMontanha[];
  /** Marcador vermelho de quem está vendo (a montanha da turma usa a própria bolha). */
  marcador?: boolean;
}) {
  const trilha = useRef<SVGPathElement>(null);
  const percorrido = useRef<SVGPathElement>(null);
  const marcador = useRef<SVGGElement>(null);
  const acampamentos = useRef<SVGGElement>(null);
  const fracao = totalDias > 0 ? Math.max(0, Math.min(1, diasConcluidos / totalDias)) : 0;
  const chaveOutros = outros?.map((o) => `${o.chave}:${o.fracao}:${o.prioridade ?? 0}`).join('|') ?? '';
  const [posicoes, setPosicoes] = useState<(Ponto | null)[]>(() => posicionarItens(outros ?? []));
  const [pontos, setPontos] = useState<Ponto[]>(() => (outros ?? []).map((o) => pontoNaCrista(o.fracao)));

  // Com o SVG de verdade, usa a geometria do navegador (igual à do marcador); no jsdom fica o cálculo.
  useLayoutEffect(() => {
    if (!outros) return;
    const t = trilha.current;
    const ponto =
      t && typeof t.getTotalLength === 'function' && typeof t.getPointAtLength === 'function'
        ? (fr: number) => pontoNa(t, fr)
        : pontoNaCrista;
    setPosicoes(posicionarItens(outros, ponto));
    setPontos(outros.map((o) => ponto(o.fracao)));
  }, [chaveOutros]);

  useEffect(() => {
    const t = trilha.current;
    const linha = percorrido.current;
    const mk = marcador.current;
    if (!t || !linha || typeof t.getTotalLength !== 'function') return;
    const total = t.getTotalLength();

    // Acampamentos (Base, C1, C2, C3, Cume) sobre a crista.
    const grupo = acampamentos.current;
    if (grupo && grupo.childElementCount === 0) {
      for (const [fr, nome] of ACAMPAMENTOS) {
        const p = pontoNa(t, fr);
        const ns = 'http://www.w3.org/2000/svg';
        const c = document.createElementNS(ns, 'circle');
        c.setAttribute('cx', String(p.x));
        c.setAttribute('cy', String(p.y));
        c.setAttribute('r', '3.5');
        c.setAttribute('class', 'fill-superficie stroke-texto-2');
        c.setAttribute('stroke-width', '1.5');
        const txt = document.createElementNS(ns, 'text');
        txt.setAttribute('x', String(p.x + (fr === 1 ? -36 : 6)));
        txt.setAttribute('y', String(p.y + 16));
        txt.setAttribute('class', 'fill-texto-2 text-[10px] font-semibold');
        txt.textContent = nome;
        grupo.append(c, txt);
      }
    }

    const posicionar = (k: number) => {
      linha.style.strokeDasharray = `${total * k} ${total}`;
      if (!mk) return;
      const p = pontoNa(t, k);
      mk.setAttribute('transform', `translate(${p.x} ${p.y})`);
    };

    if (reduzirMovimento()) {
      posicionar(fracao);
      return;
    }
    posicionar(0);
    let quadro = 0;
    const inicio = performance.now();
    const passo = (agora: number) => {
      const k = Math.min(1, Math.max(0, (agora - inicio - ATRASO_MS) / DURACAO_MS));
      posicionar(fracao * (1 - (1 - k) ** 3));
      if (k < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [fracao]);

  const svg = (
    <svg
      viewBox={`0 0 ${LARGURA} ${ALTURA}`}
      role="img"
      aria-label={`Você está a ${new Intl.NumberFormat('pt-BR').format(altitude)} metros, ${diasConcluidos} de ${totalDias} dias concluídos`}
      className="h-auto w-full"
    >
      <path d={AREA} className="fill-superficie-2" />
      <path
        ref={trilha}
        d={CRISTA}
        fill="none"
        className="stroke-borda"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="2 6"
      />
      <path
        ref={percorrido}
        d={CRISTA}
        fill="none"
        className="stroke-vermelho"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="0 1000"
      />
      <g ref={acampamentos} />
      <line x1="300" y1="20" x2="300" y2="2" className="stroke-texto" strokeWidth={1.5} />
      <path d="M300 2 L314 6 L300 10Z" className="fill-vermelho" />
      {comMarcador && (
        <g ref={marcador} transform="translate(10 200)">
          <circle r={14} className="fill-vermelho opacity-[0.22]" />
          <circle r={8} className="fill-vermelho" />
          <circle r={3.2} className="fill-sobre-vermelho" />
        </g>
      )}
    </svg>
  );

  if (!outros) return svg;
  return (
    <div className="relative">
      {svg}
      {/* Um ponto na crista para cada item (inclusive os que ficaram sem bolha). */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {outros.map((o, i) => {
          const p = pontos[i] ?? pontoNaCrista(o.fracao);
          return (
            <span
              key={o.chave}
              className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-texto-2 ring-2 ring-superficie"
              style={{ left: `${(p.x / LARGURA) * 100}%`, top: `${(p.y / ALTURA) * 100}%` }}
            />
          );
        })}
      </div>
      <ul className="pointer-events-none absolute inset-0" aria-label="Turma na montanha">
        {outros.map((o, i) => {
          const p = posicoes[i];
          if (!p) return null;
          return (
            <li
              key={o.chave}
              className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${(p.x / LARGURA) * 100}%`, top: `${(p.y / ALTURA) * 100}%`, zIndex: Math.round(o.prioridade ?? 0) }}
            >
              {o.conteudo}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
