import type { CSSProperties, ReactNode } from 'react';
import { COR, COR_TEXTO_SOBRE, larguraTexto, useLargura, type CorSerie } from './base';
import { formatarInteiro, formatarPct } from './formato';
import { percentual } from './escalas';

export interface ItemBarra {
  chave: string;
  rotulo: string;
  /** Linha de apoio sob o rótulo (ex.: "75% da etapa anterior"). */
  detalhe?: ReactNode;
  valor: number;
  /** Texto na ponta da barra (já formatado). */
  texto: string;
  cor?: CorSerie;
}

/**
 * Barras horizontais em HTML (rótulos nunca escalam): uma linha de base, cada barra cresce da
 * esquerda com a ponta arredondada (4 px) e o valor escrito logo depois da ponta.
 * Uma série só: todas na mesma cor, ou ênfase (uma em destaque, o resto neutro).
 */
export function BarrasHorizontais({
  itens,
  rotulo,
  maximo,
  larguraRotulo = 'minmax(0,8.5rem)',
  empilharNoCelular = false,
}: {
  itens: readonly ItemBarra[];
  /** Nome da lista para leitores de tela. */
  rotulo: string;
  maximo?: number;
  larguraRotulo?: string;
  /** Rótulo em cima da barra no celular (rótulos longos): a barra ganha a largura toda. */
  empilharNoCelular?: boolean;
}) {
  const teto = maximo ?? Math.max(0, ...itens.map((i) => i.valor));
  return (
    <ul
      aria-label={rotulo}
      className={`grid ${empilharNoCelular ? 'gap-3 sm:gap-2.5' : 'gap-2.5'}`}
    >
      {itens.map((i) => {
        const pct = teto > 0 ? Math.max(0, Math.min(1, i.valor / teto)) : 0;
        return (
          <li
            key={i.chave}
            className={
              empilharNoCelular
                ? 'grid gap-1 sm:grid-cols-[var(--rotulo)_minmax(0,1fr)] sm:items-center sm:gap-x-3 sm:gap-y-0'
                : 'grid grid-cols-[var(--rotulo)_minmax(0,1fr)] items-center gap-x-3'
            }
            style={{ '--rotulo': larguraRotulo } as CSSProperties}
          >
            <span
              className={`min-w-0 leading-tight ${empilharNoCelular ? 'flex flex-wrap items-baseline gap-x-2 sm:grid sm:gap-x-0' : 'grid'}`}
            >
              <span className="truncate text-sm font-medium" title={i.rotulo}>
                {i.rotulo}
              </span>
              {i.detalhe && <span className="text-[11px] text-texto-2">{i.detalhe}</span>}
            </span>
            <span className="flex min-w-0 items-center gap-2 border-l border-[var(--g-eixo)]">
              <span
                aria-hidden
                className="h-3.5 shrink-0 rounded-r-[4px]"
                style={{
                  width: `calc((100% - 4.5rem) * ${pct})`,
                  background: COR[i.cor ?? 'destaque'],
                }}
              />
              <span className="shrink-0 text-sm font-bold tabular-nums">{i.texto}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export interface ParteSegmento {
  chave: string;
  nome: string;
  valor: number;
  cor: CorSerie;
}

/**
 * Barra segmentada alta (28 px): um todo dividido em partes, cada parte com a fatia escrita
 * dentro quando cabe, 2 px de superfície entre elas e a legenda com os nomes na mesma ordem.
 */
export function BarraSegmentada({
  partes,
  rotulo,
  descrever = formatarInteiro,
}: {
  partes: readonly ParteSegmento[];
  rotulo: string;
  /** Valor por extenso no nome acessível (ex.: "12 dias"). */
  descrever?: (v: number) => string;
}) {
  const [ref, largura] = useLargura<HTMLDivElement>();
  const total = partes.reduce((s, p) => s + p.valor, 0);
  const visiveis = partes.filter((p) => p.valor > 0);
  const descricao = partes
    .map((p) => `${p.nome}: ${descrever(p.valor)} (${formatarPct(percentual(p.valor, total))})`)
    .join('; ');
  return (
    <div className="grid gap-2">
      <div
        ref={ref}
        role="img"
        aria-label={`${rotulo}. ${descricao}.`}
        className="flex h-7 w-full gap-[2px] overflow-hidden rounded-[4px]"
      >
        {total === 0 ? (
          <span className="h-full w-full rounded-[4px] bg-superficie-2" />
        ) : (
          visiveis.map((p) => {
            const fatia = p.valor / total;
            const texto = formatarPct(fatia * 100);
            const cabe = fatia * largura - 12 >= larguraTexto(texto, 12);
            return (
              <span
                key={p.chave}
                title={`${p.nome}: ${descrever(p.valor)} (${texto})`}
                className="flex h-full min-w-[3px] items-center rounded-[4px] px-1.5 text-xs font-bold tabular-nums"
                style={{
                  flexGrow: p.valor,
                  flexBasis: 0,
                  background: COR[p.cor],
                  color: COR_TEXTO_SOBRE[p.cor],
                }}
              >
                {cabe ? texto : null}
              </span>
            );
          })
        )}
      </div>
      <ul aria-label="Legenda" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-texto-2">
        {partes.map((p) => (
          <li key={p.chave} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2.5 rounded-[3px]"
              style={{ background: COR[p.cor] }}
            />
            {p.nome}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Medidor fino (uma razão contra um limite): trilho num tom claro do próprio vermelho. */
export function Medidor({
  valor,
  maximo,
  rotulo,
  className = '',
}: {
  valor: number;
  maximo: number;
  rotulo: string;
  className?: string;
}) {
  const pct = maximo > 0 ? Math.max(0, Math.min(100, (valor / maximo) * 100)) : 0;
  return (
    <div
      role="meter"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={maximo}
      aria-valuenow={Math.min(valor, maximo)}
      className={`h-2 w-full overflow-hidden rounded-full bg-[var(--g-trilho)] ${className}`}
    >
      <div className="h-full rounded-full bg-[var(--g-destaque)]" style={{ width: `${pct}%` }} />
    </div>
  );
}
