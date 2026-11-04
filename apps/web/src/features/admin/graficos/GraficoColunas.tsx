import { useId } from 'react';
import {
  caminhoColuna,
  escalaLinear,
  indiceDaFaixa,
  indiceDoMaior,
  indicesRotulos,
  ticksBonitos,
} from './escalas';
import { formatarInteiro } from './formato';
import {
  COR,
  Dica,
  larguraTexto,
  textoDica,
  useCategoriaAtiva,
  useLargura,
  type CorSerie,
  type LinhaDica,
} from './base';

export interface Categoria {
  /** Rótulo do eixo (ex.: "30/10", "21h"). */
  curto: string;
  /** Rótulo da dica e da tabela (ex.: "qui, 30/10"). */
  longo: string;
}

export interface SerieColunas {
  nome: string;
  cor: CorSerie;
  valores: readonly number[];
}

const ALTURA_PADRAO = 168;
const BARRA_MAX = 24;
const ESPACO = 2;

/**
 * Colunas (uma ou duas séries lado a lado) em SVG: 4 px arredondados no topo, base reta,
 * no máximo 24 px de espessura, grade fina e rótulo direto só no maior valor.
 * `corDaColuna` faz o gráfico de ênfase (ex.: o horário de pico em vermelho, o resto neutro).
 */
export function GraficoColunas({
  rotulo,
  categorias,
  series,
  formatar = formatarInteiro,
  altura = ALTURA_PADRAO,
  indicesRotulo,
  corDaColuna,
  rotularMaior = true,
}: {
  /** Resumo para leitores de tela (o que o gráfico mostra e o destaque). */
  rotulo: string;
  categorias: readonly Categoria[];
  series: readonly SerieColunas[];
  formatar?: (v: number) => string;
  altura?: number;
  indicesRotulo?: readonly number[];
  corDaColuna?: (indice: number) => CorSerie;
  rotularMaior?: boolean;
}) {
  const idDica = useId();
  const [ref, largura] = useLargura<HTMLDivElement>();
  const n = categorias.length;
  const maximo = Math.max(0, ...series.flatMap((s) => s.valores));
  const ticks = ticksBonitos(maximo);
  const teto = ticks[ticks.length - 1] ?? 1;

  const margem = {
    topo: 18,
    direita: 4,
    base: 22,
    esquerda: Math.ceil(Math.max(...ticks.map((t) => larguraTexto(formatar(t))))) + 8,
  };
  const x0 = margem.esquerda;
  const x1 = Math.max(x0 + 1, largura - margem.direita);
  const yBase = margem.topo + altura;
  const y = escalaLinear([0, teto], [yBase, margem.topo]);
  const faixa = (x1 - x0) / Math.max(1, n);
  const nSeries = Math.max(1, series.length);
  const larguraGrupo = Math.min(faixa * 0.72, BARRA_MAX * nSeries + ESPACO * (nSeries - 1));
  const larguraBarra = Math.max(1, (larguraGrupo - ESPACO * (nSeries - 1)) / nSeries);
  const centro = (i: number) => x0 + faixa * i + faixa / 2;

  const { ativo, eventos } = useCategoriaAtiva(n, (x) => indiceDaFaixa(x, n, x0, x1));
  const rotulos =
    indicesRotulo ??
    indicesRotulos(
      n,
      Math.max(2, Math.floor((x1 - x0) / (larguraTexto(categorias[0]?.curto ?? '00/00') + 14))),
    );
  const principal = series[series.length - 1];
  const maior = rotularMaior && principal ? indiceDoMaior(principal.valores) : -1;

  const linhasDica = (i: number): LinhaDica[] =>
    [...series].reverse().map((s) => ({
      nome: s.nome,
      valor: formatar(s.valores[i] ?? 0),
      cor: series.length === 1 && corDaColuna ? corDaColuna(i) : s.cor,
      forma: 'bloco',
    }));
  const categoriaAtiva = ativo !== null ? categorias[ativo] : undefined;

  return (
    <div className="relative min-w-0">
      <div
        ref={ref}
        tabIndex={n > 0 ? 0 : -1}
        role="group"
        aria-label={`${rotulo} Use as setas para percorrer os valores.`}
        aria-describedby={idDica}
        className="relative min-w-0 touch-pan-y rounded-xl select-none focus-visible:outline-offset-4"
        {...eventos}
      >
        <svg
          width={largura}
          height={yBase + margem.base}
          role="img"
          aria-label={rotulo}
          className="block overflow-visible"
        >
          {ticks.map((t) => (
            <g key={t}>
              {t > 0 && (
                <line x1={x0} x2={x1} y1={y(t)} y2={y(t)} stroke="var(--g-grade)" strokeWidth={1} />
              )}
              <text
                x={x0 - 8}
                y={y(t)}
                dy="0.32em"
                textAnchor="end"
                className="fill-texto-2 text-[11px] tabular-nums"
              >
                {formatar(t)}
              </text>
            </g>
          ))}
          {ativo !== null && (
            <rect
              x={x0 + faixa * ativo}
              y={margem.topo - 6}
              width={faixa}
              height={altura + 6}
              rx={6}
              fill="var(--superficie-2)"
            />
          )}
          {categorias.map((c, i) =>
            series.map((s, k) => {
              const v = s.valores[i] ?? 0;
              const x = centro(i) - larguraGrupo / 2 + k * (larguraBarra + ESPACO);
              const cor = series.length === 1 && corDaColuna ? corDaColuna(i) : s.cor;
              const d = caminhoColuna(x, larguraBarra, y(v), yBase);
              return d ? (
                <path
                  key={`${c.longo}-${s.nome}`}
                  d={d}
                  fill={COR[cor]}
                  opacity={ativo !== null && ativo !== i ? 0.55 : 1}
                />
              ) : null;
            }),
          )}
          <line x1={x0} x2={x1} y1={yBase} y2={yBase} stroke="var(--g-eixo)" strokeWidth={1} />
          {maior >= 0 && ativo === null && principal && (
            <text
              x={Math.min(x1 - 4, Math.max(x0 + 4, centro(maior)))}
              y={y(principal.valores[maior] ?? 0) - 6}
              textAnchor="middle"
              className="fill-texto text-[11px] font-bold tabular-nums"
            >
              {formatar(principal.valores[maior] ?? 0)}
            </text>
          )}
          {rotulos.map((i) => {
            const c = categorias[i];
            if (!c) return null;
            const meia = larguraTexto(c.curto) / 2;
            const x = Math.min(x1 - meia, Math.max(x0 + meia, centro(i)));
            return (
              <text
                key={i}
                x={x}
                y={yBase + 15}
                textAnchor="middle"
                className={`text-[11px] tabular-nums ${ativo === i ? 'fill-texto font-semibold' : 'fill-texto-2'}`}
              >
                {c.curto}
              </text>
            );
          })}
        </svg>
        {ativo !== null && categoriaAtiva && (
          <Dica
            x={centro(ativo)}
            largura={largura}
            titulo={categoriaAtiva.longo}
            linhas={linhasDica(ativo)}
          />
        )}
      </div>
      <p id={idDica} aria-live="polite" className="sr-only">
        {ativo !== null && categoriaAtiva ? textoDica(categoriaAtiva.longo, linhasDica(ativo)) : ''}
      </p>
    </div>
  );
}
