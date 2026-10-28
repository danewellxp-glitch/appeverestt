import type { DiaResumo } from '@everest/shared';
import { AlertTriangle, Check } from 'lucide-react';
import { formatarDataCurta } from '../lib/datas';

const DESCRICAO: Record<DiaResumo['situacao'], string> = {
  CONCLUIDO: 'concluído',
  INVALIDADO: 'invalidado pelo embaixador',
  HOJE: 'hoje',
  NAO_CONCLUIDO: 'não concluído',
  FUTURO: 'ainda não chegou',
};

function estilo(d: DiaResumo, selecionado: boolean): string {
  const base = 'relative flex aspect-square min-h-11 flex-col items-center justify-center rounded-xl text-sm font-bold transition-colors';
  const anel = selecionado ? ' ring-2 ring-white ring-offset-2 ring-offset-fundo' : '';
  switch (d.situacao) {
    case 'CONCLUIDO':
      return `${base} bg-vermelho text-white${anel}`;
    case 'INVALIDADO':
      return `${base} border border-amber-700 bg-amber-950/60 text-amber-100${anel}`;
    case 'HOJE':
      return `${base} border-2 border-vermelho-texto bg-superficie-2 text-texto${anel}`;
    case 'NAO_CONCLUIDO':
      return `${base} bg-superficie-2 text-texto-2${anel}`;
    case 'FUTURO':
      return `${base} border border-borda bg-transparent text-texto-2/75${anel}`;
  }
}

/**
 * Grade de 30 dias (6 colunas): concluído = vermelho + check; hoje = contorno vermelho;
 * passado não concluído = cinza; futuro = esmaecido e desabilitado; invalidado = alerta.
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
    <ol aria-label={rotulo} className="grid grid-cols-6 gap-2">
      {dias.map((d) => {
        const futuro = d.situacao === 'FUTURO';
        const ativo = selecionado === d.numeroDia;
        const conteudo = (
          <>
            {d.situacao === 'CONCLUIDO' ? (
              <Check className="size-4" aria-hidden />
            ) : d.situacao === 'INVALIDADO' ? (
              <AlertTriangle className="size-4" aria-hidden />
            ) : null}
            <span className={d.situacao === 'CONCLUIDO' || d.situacao === 'INVALIDADO' ? 'text-[10px] leading-none' : ''}>
              {d.numeroDia}
            </span>
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
                className={`w-full ${estilo(d, ativo)} disabled:cursor-not-allowed`}
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
