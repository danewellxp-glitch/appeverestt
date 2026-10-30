import type { DiaResumo } from '@everest/shared';
import { AlertTriangle } from 'lucide-react';
import { formatarDataCurta } from '../lib/datas';

const DESCRICAO: Record<DiaResumo['situacao'], string> = {
  CONCLUIDO: 'concluído',
  INVALIDADO: 'invalidado pelo embaixador',
  HOJE: 'hoje',
  NAO_CONCLUIDO: 'não concluído',
  FUTURO: 'ainda não chegou',
  AGUARDANDO_CONFERENCIA: 'concluído, aguardando conferência',
};

/** Células do grid dos 30 dias (docs/FRONTEND.md §8.4). */
function estilo(d: DiaResumo, selecionado: boolean): string {
  const base =
    'relative grid aspect-square min-h-11 w-full place-items-center rounded-xl text-[13px] font-bold tabular-nums transition-[transform,box-shadow] duration-200';
  const anel = selecionado ? ' outline-2 outline-offset-2 outline-texto' : '';
  switch (d.situacao) {
    case 'CONCLUIDO':
    case 'AGUARDANDO_CONFERENCIA':
      return `${base} bg-vermelho text-sobre-vermelho${anel}`;
    case 'INVALIDADO':
      return `${base} bg-superficie-2 text-vermelho-texto shadow-[inset_0_0_0_1.5px_var(--vermelho-texto)]${anel}`;
    case 'HOJE':
      return `${base} bg-superficie-2 text-texto shadow-[inset_0_0_0_2px_var(--vermelho)]${anel}`;
    case 'NAO_CONCLUIDO':
      return `${base} bg-superficie-2 text-texto-2${anel}`;
    case 'FUTURO':
      return `${base} bg-superficie-2 text-texto-2 opacity-45${anel}`;
  }
}

/**
 * Grade de 30 dias (6 colunas). Com `aoSelecionar`, dias passados/atual são botões
 * (futuros ficam desabilitados); sem, as células são só leitura (role="img").
 */
export function GridDias({
  dias,
  selecionado,
  aoSelecionar,
  rotulo = 'Dias do desafio',
}: {
  dias: DiaResumo[];
  selecionado?: number | null;
  aoSelecionar?: (numeroDia: number) => void;
  rotulo?: string;
}) {
  return (
    <ol aria-label={rotulo} className="grid grid-cols-6 gap-1.5">
      {dias.map((d) => {
        const futuro = d.situacao === 'FUTURO';
        const ativo = selecionado === d.numeroDia;
        const conteudo = (
          <>
            {d.situacao === 'AGUARDANDO_CONFERENCIA' && (
              <span
                aria-hidden
                className="absolute top-[5px] right-[5px] size-[7px] rounded-full bg-laranja shadow-[0_0_0_2px_var(--superficie)]"
              />
            )}
            {d.situacao === 'INVALIDADO' ? (
              <span className="flex flex-col items-center leading-none">
                <AlertTriangle className="size-3" aria-hidden />
                <span className="text-[10px]">{d.numeroDia}</span>
              </span>
            ) : (
              d.numeroDia
            )}
          </>
        );
        const legenda = `Dia ${d.numeroDia} (${formatarDataCurta(d.data)}): ${DESCRICAO[d.situacao]}`;
        return (
          <li key={d.numeroDia}>
            {aoSelecionar ? (
              <button
                type="button"
                disabled={futuro}
                aria-label={legenda}
                aria-current={ativo ? 'true' : undefined}
                onClick={() => aoSelecionar(d.numeroDia)}
                className={`${estilo(d, ativo)} active:scale-[0.92] disabled:cursor-not-allowed`}
              >
                {conteudo}
              </button>
            ) : (
              <div role="img" aria-label={legenda} className={estilo(d, false)}>
                {conteudo}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Legenda do grid. `comConferencia` inclui o ponto laranja (só no admin). */
export function LegendaDias({ comConferencia = false }: { comConferencia?: boolean }) {
  const itens: { rotulo: string; amostra: string }[] = [
    { rotulo: 'Concluído', amostra: 'bg-vermelho' },
    { rotulo: 'Não concluído', amostra: 'bg-superficie-2' },
    { rotulo: 'Hoje', amostra: 'shadow-[inset_0_0_0_2px_var(--vermelho)]' },
    { rotulo: 'Invalidado', amostra: 'shadow-[inset_0_0_0_1.5px_var(--vermelho-texto)]' },
  ];
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-texto-2" aria-label="Legenda">
      {itens.map((i) => (
        <li key={i.rotulo} className="flex items-center gap-1.5">
          <i aria-hidden className={`inline-block size-2.5 rounded-[3px] ${i.amostra}`} />
          {i.rotulo}
        </li>
      ))}
      {comConferencia && (
        <li className="flex items-center gap-1.5">
          <i aria-hidden className="inline-block size-2.5 rounded-full bg-laranja" />
          Aguardando conferência
        </li>
      )}
    </ul>
  );
}
