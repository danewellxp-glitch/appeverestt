import { useEffect, useRef } from 'react';
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

/** Ponto da crista numa fração do caminho (0–1), calculado pela geometria do SVG. */
function pontoNa(trilha: SVGPathElement, fracao: number): { x: number; y: number } {
  const p = trilha.getPointAtLength(trilha.getTotalLength() * fracao);
  return { x: p.x, y: p.y };
}

/**
 * Montanha da escalada simbólica (docs/FRONTEND.md §8.3): crista tracejada, trecho percorrido em
 * vermelho e marcador com halo, animados de 0 até `dias/total` (1,2 s, ease-out). Reduced motion: direto.
 */
export function Montanha({
  diasConcluidos,
  totalDias,
  altitude,
}: {
  diasConcluidos: number;
  totalDias: number;
  altitude: number;
}) {
  const trilha = useRef<SVGPathElement>(null);
  const percorrido = useRef<SVGPathElement>(null);
  const marcador = useRef<SVGGElement>(null);
  const acampamentos = useRef<SVGGElement>(null);
  const fracao = totalDias > 0 ? Math.max(0, Math.min(1, diasConcluidos / totalDias)) : 0;

  useEffect(() => {
    const t = trilha.current;
    const linha = percorrido.current;
    const mk = marcador.current;
    if (!t || !linha || !mk || typeof t.getTotalLength !== 'function') return;
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

  return (
    <svg
      viewBox="0 0 320 222"
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
      <g ref={marcador} transform="translate(10 200)">
        <circle r={14} className="fill-vermelho opacity-[0.22]" />
        <circle r={8} className="fill-vermelho" />
        <circle r={3.2} className="fill-sobre-vermelho" />
      </g>
    </svg>
  );
}
