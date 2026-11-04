import { Table2 } from 'lucide-react';
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';

/**
 * Cores dos gráficos (skill dataviz, paleta validada contra as superfícies do app):
 * - destaque: vermelho da marca (#dc2626; ≥ 3:1 sobre superficie nos dois temas);
 * - alerta: âmbar para "aguardando" (claro #eda100 / escuro #c98500). Par vermelho↔âmbar:
 *   ΔE CVD 18,7 (claro) / 8,9 (escuro), visão normal 24,7 / 18,0. No claro fica abaixo de 3:1,
 *   então sempre vai com valor escrito e tabela;
 * - neutro: contexto (a série que não é a história), recessivo de propósito;
 * - grade/eixo: linhas finas, um passo fora da superfície.
 * Texto nunca usa a cor da série: valores e rótulos ficam em --texto / --texto-2.
 */
export const CLASSE_TOKENS_GRAFICO = [
  '[--g-destaque:var(--vermelho)]',
  '[--g-area:color-mix(in_srgb,var(--vermelho)_10%,transparent)]',
  '[--g-trilho:color-mix(in_srgb,var(--vermelho)_16%,transparent)]',
  '[--g-alerta:#eda100] escuro:[--g-alerta:#c98500]',
  '[--g-neutro:#b3aaaa] escuro:[--g-neutro:#5c5353]',
  '[--g-grade:var(--borda)]',
  '[--g-eixo:#cfc8c8] escuro:[--g-eixo:#3d3535]',
].join(' ');

export type CorSerie = 'destaque' | 'alerta' | 'neutro';

export const COR: Record<CorSerie, string> = {
  destaque: 'var(--g-destaque)',
  alerta: 'var(--g-alerta)',
  neutro: 'var(--g-neutro)',
};

/** Texto dentro de um preenchimento: branco no vermelho; quase preto no âmbar e no neutro. */
export const COR_TEXTO_SOBRE: Record<CorSerie, string> = {
  destaque: '#ffffff',
  alerta: '#141111',
  neutro: 'var(--texto)',
};

/** Largura do elemento em px (ResizeObserver). Sem medição (jsdom), fica no valor inicial. */
export function useLargura<T extends HTMLElement>(inicial = 320) {
  const ref = useRef<T>(null);
  const [largura, setLargura] = useState(inicial);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => {
      const w = Math.round(el.getBoundingClientRect().width);
      if (w > 0) setLargura(w);
    };
    medir();
    if (typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, []);
  return [ref, largura] as const;
}

/**
 * Hover, toque e teclado num gráfico: o ponteiro (ou o dedo arrastando) escolhe a categoria
 * mais próxima; com o foco, ← → Home End percorrem os valores e Esc fecha a dica.
 */
export function useCategoriaAtiva(total: number, indicePorX: (x: number) => number) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const atual = ativo !== null && ativo < total ? ativo : null;

  function porPonteiro(e: PointerEvent<HTMLElement>) {
    if (total === 0) return;
    const caixa = e.currentTarget.getBoundingClientRect();
    setAtivo(indicePorX(e.clientX - caixa.left));
  }

  const eventos = {
    onPointerMove: porPonteiro,
    onPointerDown: porPonteiro,
    onPointerLeave: (e: PointerEvent<HTMLElement>) => {
      // No toque a dica fica até o próximo toque (o dedo saiu, mas a pessoa ainda está lendo).
      if (e.pointerType !== 'touch') setAtivo(null);
    },
    onFocus: () => setAtivo((a) => a ?? (total > 0 ? total - 1 : null)),
    onBlur: () => setAtivo(null),
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (total === 0) return;
      const ir = (i: number) => {
        e.preventDefault();
        setAtivo(Math.max(0, Math.min(total - 1, i)));
      };
      const base = atual ?? total - 1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') ir(atual === null ? base : base + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') ir(atual === null ? base : base - 1);
      else if (e.key === 'Home') ir(0);
      else if (e.key === 'End') ir(total - 1);
      else if (e.key === 'Escape') setAtivo(null);
    },
  };
  return { ativo: atual, eventos };
}

export interface LinhaDica {
  nome: string;
  valor: string;
  cor: CorSerie;
  /** Linha (gráfico de linhas) ou bloco (colunas). */
  forma?: 'linha' | 'bloco';
}

/** Dica flutuante: o valor em destaque, o nome da série depois, com a chave da cor ao lado. */
export function Dica({
  x,
  largura,
  titulo,
  linhas,
}: {
  x: number;
  largura: number;
  titulo: string;
  linhas: readonly LinhaDica[];
}) {
  const ancora = x < largura * 0.3 ? '0%' : x > largura * 0.7 ? '-100%' : '-50%';
  const deslocamento = ancora === '0%' ? -10 : ancora === '-100%' ? 10 : 0;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute bottom-full z-10 mb-1.5 grid min-w-[128px] gap-1 rounded-2xl bg-superficie px-3 py-2 text-xs shadow-[0_10px_28px_-10px_rgb(0_0_0/0.45),inset_0_0_0_1px_var(--borda)]"
      style={{ left: x + deslocamento, transform: `translateX(${ancora})` }}
    >
      <p className="font-medium whitespace-nowrap text-texto-2">{titulo}</p>
      {linhas.map((l) => (
        <p key={l.nome} className="flex items-center gap-2 whitespace-nowrap">
          <span
            className={
              l.forma === 'bloco'
                ? 'size-2.5 shrink-0 rounded-[3px]'
                : 'h-[3px] w-3.5 shrink-0 rounded-full'
            }
            style={{ background: COR[l.cor] }}
          />
          <strong className="text-sm font-bold text-texto tabular-nums">{l.valor}</strong>
          <span className="text-texto-2">{l.nome}</span>
        </p>
      ))}
    </div>
  );
}

/** Texto da dica para leitores de tela (a dica visual é aria-hidden). */
export function textoDica(titulo: string, linhas: readonly LinhaDica[]): string {
  return `${titulo}: ${linhas.map((l) => `${l.nome} ${l.valor}`).join(', ')}`;
}

export interface ItemLegenda {
  nome: string;
  cor: CorSerie;
  forma?: 'linha' | 'bloco';
}

/** Legenda (duas ou mais séries): a chave imita a marca (linha para linhas, bloco para barras). */
export function Legenda({ itens }: { itens: readonly ItemLegenda[] }) {
  return (
    <ul aria-label="Legenda" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-texto-2">
      {itens.map((i) => (
        <li key={i.nome} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={i.forma === 'linha' ? 'h-[3px] w-4 rounded-full' : 'size-2.5 rounded-[3px]'}
            style={{ background: COR[i.cor] }}
          />
          {i.nome}
        </li>
      ))}
    </ul>
  );
}

export interface TabelaDados {
  colunas: readonly string[];
  linhas: readonly (readonly (string | number)[])[];
}

/**
 * Cartão de gráfico (figure): título, frase-resumo, legenda, o gráfico e a tabela equivalente
 * (botão "Ver tabela"), que deixa todo valor acessível sem depender de hover ou de cor.
 */
export function CartaoGrafico({
  titulo,
  descricao,
  acao,
  legenda,
  tabela,
  nota,
  className = '',
  children,
}: {
  titulo: string;
  descricao?: ReactNode;
  /** Conteúdo à direita do título (ex.: alternar "Por dia / Acumulado"). */
  acao?: ReactNode;
  legenda?: ReactNode;
  tabela?: TabelaDados;
  nota?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  const idTabela = `${id}-tabela`;
  const [comTabela, setComTabela] = useState(false);
  return (
    <figure
      aria-labelledby={`${id}-titulo`}
      className={`flex min-w-0 flex-col gap-3 rounded-3xl bg-superficie p-[18px] shadow-[inset_0_0_0_1px_var(--borda)] ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="grid min-w-0 flex-1 gap-0.5">
          <h3 id={`${id}-titulo`} className="text-[17px] leading-tight font-bold">
            {titulo}
          </h3>
          {descricao && <p className="text-sm text-texto-2">{descricao}</p>}
        </div>
        {acao}
      </div>
      {legenda}
      {children}
      {tabela && (
        <div className="grid gap-2">
          <button
            type="button"
            aria-expanded={comTabela}
            aria-controls={idTabela}
            onClick={() => setComTabela((v) => !v)}
            className="press inline-flex min-h-11 items-center gap-1.5 self-start rounded-full px-1 text-xs font-semibold text-texto-2 hover:text-texto"
          >
            <Table2 className="size-4" aria-hidden />
            {comTabela ? 'Ocultar tabela' : 'Ver tabela'}
          </button>
          <div id={idTabela} hidden={!comTabela}>
            {comTabela && <TabelaValores titulo={titulo} tabela={tabela} />}
          </div>
        </div>
      )}
      {nota && <figcaption className="text-xs text-texto-2">{nota}</figcaption>}
    </figure>
  );
}

function TabelaValores({ titulo, tabela }: { titulo: string; tabela: TabelaDados }) {
  return (
    <div className="overflow-hidden rounded-2xl shadow-[inset_0_0_0_1px_var(--borda)]">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{titulo}</caption>
        <thead className="bg-superficie-2 text-xs text-texto-2">
          <tr>
            {tabela.colunas.map((c, i) => (
              <th
                key={c}
                scope="col"
                className={`px-3 py-2 font-semibold ${i > 0 ? 'text-right' : ''}`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tabela.linhas.map((linha, i) => (
            <tr key={i} className="border-t border-borda">
              {linha.map((celula, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="px-3 py-1.5 font-medium">
                    {celula}
                  </th>
                ) : (
                  <td key={j} className="px-3 py-1.5 text-right tabular-nums">
                    {celula}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Estado vazio dentro de um cartão de gráfico. */
export function VazioGrafico({ children }: { children: ReactNode }) {
  return (
    <p className="grid min-h-28 place-items-center rounded-2xl bg-superficie-2 px-4 py-6 text-center text-sm text-texto-2">
      {children}
    </p>
  );
}

/** Largura estimada de um texto de 11 px (para não cortar rótulos nas bordas do SVG). */
export function larguraTexto(texto: string, px = 11): number {
  return texto.length * px * 0.58;
}
