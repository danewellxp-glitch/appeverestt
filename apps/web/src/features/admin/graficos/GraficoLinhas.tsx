import { useId } from 'react';
import {
  caminhoLinha,
  escalaLinear,
  indiceMaisProximo,
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
import type { Categoria } from './GraficoColunas';

export interface SerieLinha {
  nome: string;
  cor: CorSerie;
  valores: readonly number[];
  /** Lavagem de 10% sob a linha (só para uma série). */
  area?: boolean;
  /** Ponto e valor no fim da linha (só na série que é a história). */
  rotuloFinal?: boolean;
}

const ALTURA_PADRAO = 168;

/**
 * Linhas de 2 px num eixo só, com a mira vertical que encontra o dia mais próximo e uma dica
 * com todas as séries. `referencia` desenha uma linha fina de meta (ex.: total de vagas).
 */
export function GraficoLinhas({
  rotulo,
  categorias,
  series,
  formatar = formatarInteiro,
  formatarEixo = formatar,
  ticksY,
  referencia,
  altura = ALTURA_PADRAO,
}: {
  rotulo: string;
  categorias: readonly Categoria[];
  series: readonly SerieLinha[];
  formatar?: (v: number) => string;
  formatarEixo?: (v: number) => string;
  /** Marcas fixas do eixo Y (ex.: 0–100% em quartos). Sem elas, passos "bonitos" até o maior valor. */
  ticksY?: readonly number[];
  referencia?: { valor: number; rotulo: string };
  altura?: number;
}) {
  const idDica = useId();
  const [ref, largura] = useLargura<HTMLDivElement>();
  const n = categorias.length;
  const maximo = Math.max(0, referencia?.valor ?? 0, ...series.flatMap((s) => s.valores));
  const ticks = ticksY ?? ticksBonitos(maximo);
  const teto = ticks[ticks.length - 1] ?? 1;
  const comRotuloFinal = series.find((s) => s.rotuloFinal);
  const ultimoValor = comRotuloFinal?.valores[n - 1];

  const margem = {
    topo: 14,
    direita:
      comRotuloFinal && ultimoValor !== undefined ? larguraTexto(formatar(ultimoValor)) + 14 : 10,
    base: 22,
    esquerda: Math.ceil(Math.max(...ticks.map((t) => larguraTexto(formatarEixo(t))))) + 8,
  };
  const x0 = margem.esquerda + 4;
  const x1 = Math.max(x0 + 1, largura - margem.direita);
  const yBase = margem.topo + altura;
  const y = escalaLinear([0, teto], [yBase, margem.topo]);
  const x = (i: number) => (n <= 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * i) / (n - 1));

  const { ativo, eventos } = useCategoriaAtiva(n, (px) => indiceMaisProximo(px, n, x0, x1));
  const rotulos = indicesRotulos(
    n,
    Math.max(2, Math.floor((x1 - x0) / (larguraTexto(categorias[0]?.curto ?? 'Dia 30') + 14))),
  );

  const linhasDica = (i: number): LinhaDica[] =>
    series.map((s) => ({
      nome: s.nome,
      valor: formatar(s.valores[i] ?? 0),
      cor: s.cor,
      forma: 'linha',
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
                <line
                  x1={x0 - 4}
                  x2={x1}
                  y1={y(t)}
                  y2={y(t)}
                  stroke="var(--g-grade)"
                  strokeWidth={1}
                />
              )}
              <text
                x={x0 - 12}
                y={y(t)}
                dy="0.32em"
                textAnchor="end"
                className="fill-texto-2 text-[11px] tabular-nums"
              >
                {formatarEixo(t)}
              </text>
            </g>
          ))}
          <line x1={x0 - 4} x2={x1} y1={yBase} y2={yBase} stroke="var(--g-eixo)" strokeWidth={1} />

          {referencia && referencia.valor > 0 && (
            <g>
              <line
                x1={x0 - 4}
                x2={x1}
                y1={y(referencia.valor)}
                y2={y(referencia.valor)}
                stroke="var(--texto-2)"
                strokeWidth={1}
                opacity={0.6}
              />
              <text
                x={x0}
                y={y(referencia.valor) - 5}
                className="fill-texto-2 text-[11px] font-medium"
              >
                {referencia.rotulo}
              </text>
            </g>
          )}

          {series.map((s) => {
            const pontos = s.valores.slice(0, n).map((v, i) => ({ x: x(i), y: y(v) }));
            if (pontos.length === 0) return null;
            const primeiro = pontos[0];
            const ultimo = pontos[pontos.length - 1];
            return (
              <g key={s.nome}>
                {s.area && primeiro && ultimo && pontos.length > 1 && (
                  <path
                    d={`${caminhoLinha(pontos)} L${ultimo.x},${yBase} L${primeiro.x},${yBase} Z`}
                    fill={s.cor === 'destaque' ? 'var(--g-area)' : COR[s.cor]}
                    opacity={s.cor === 'destaque' ? 1 : 0.1}
                  />
                )}
                {pontos.length > 1 && (
                  <path
                    d={caminhoLinha(pontos)}
                    fill="none"
                    stroke={COR[s.cor]}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                )}
                {(pontos.length === 1 || s.rotuloFinal) && ultimo && (
                  <circle
                    cx={ultimo.x}
                    cy={ultimo.y}
                    r={4}
                    fill={COR[s.cor]}
                    stroke="var(--superficie)"
                    strokeWidth={2}
                  />
                )}
              </g>
            );
          })}

          {comRotuloFinal && ultimoValor !== undefined && ativo === null && (
            <text
              x={x(n - 1) + 9}
              y={y(ultimoValor)}
              dy="0.32em"
              className="fill-texto text-[11px] font-bold tabular-nums"
            >
              {formatar(ultimoValor)}
            </text>
          )}

          {ativo !== null && (
            <g>
              <line
                x1={x(ativo)}
                x2={x(ativo)}
                y1={margem.topo - 6}
                y2={yBase}
                stroke="var(--texto-2)"
                strokeWidth={1}
                opacity={0.5}
              />
              {series.map((s) => (
                <circle
                  key={s.nome}
                  cx={x(ativo)}
                  cy={y(s.valores[ativo] ?? 0)}
                  r={4.5}
                  fill={COR[s.cor]}
                  stroke="var(--superficie)"
                  strokeWidth={2}
                />
              ))}
            </g>
          )}

          {rotulos.map((i) => {
            const c = categorias[i];
            if (!c) return null;
            const meia = larguraTexto(c.curto) / 2;
            const px = Math.min(largura - meia, Math.max(meia, x(i)));
            return (
              <text
                key={i}
                x={px}
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
            x={x(ativo)}
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
