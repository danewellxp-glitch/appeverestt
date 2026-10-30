import { numeroDiaSchema, type MeuProgresso } from '@everest/shared';
import { useParams } from 'react-router';
import { caminhoDoDia } from '../desafio/navegacao';

/**
 * Dia aberto em `/desafio/dia/:n` (docs/FRONTEND.md §3). Aceita de 1 até `min(diaAtual, totalDias)`
 * (todos os dias depois do fim). Qualquer outro valor devolve `destino` para redirecionar com replace.
 */
export function useDiaSelecionado(progresso: MeuProgresso): { numeroDia: number | null; destino: string | null } {
  const { n } = useParams();
  if (progresso.status === 'NAO_INICIADO') return { numeroDia: null, destino: '/desafio' };
  const ultimo =
    progresso.status === 'EM_ANDAMENTO'
      ? Math.min(progresso.diaAtual ?? 1, progresso.totalDias)
      : progresso.totalDias;
  const r = numeroDiaSchema.safeParse(n);
  if (!r.success || r.data < 1 || r.data > ultimo) return { numeroDia: null, destino: caminhoDoDia(ultimo) };
  return { numeroDia: r.data, destino: null };
}
