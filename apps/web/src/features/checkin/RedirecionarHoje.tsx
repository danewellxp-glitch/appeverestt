import type { MeuProgresso } from '@everest/shared';
import { Navigate, useSearchParams } from 'react-router';
import { Carregando } from '../../components/ui/basicos';
import { useMe, useMeuProgresso } from '../../lib/queries';
import { caminhoDoDia } from '../desafio/navegacao';
import { lerAcaoRapida, PARAMETRO_ACAO } from './acaoRapida';

/**
 * Destino de `/hoje` (puro, testável):
 * - `?dia=N` → `/desafio/dia/N`;
 * - `?acao=agua|treino|leitura` → dia atual com a ação preservada (o check-in a aplica), ou
 *   `/desafio` se o desafio não estiver em andamento (a ação é descartada);
 * - sem parâmetros → dia atual, ou `/desafio` fora do período.
 */
export function destinoDeHoje(params: URLSearchParams, progresso: Pick<MeuProgresso, 'status' | 'diaAtual'> | undefined): string {
  const dia = params.get('dia');
  if (dia && /^\d{1,3}$/.test(dia)) return caminhoDoDia(Number(dia));
  if (progresso?.status === 'EM_ANDAMENTO' && progresso.diaAtual !== null) {
    const acao = lerAcaoRapida(params);
    const caminho = caminhoDoDia(progresso.diaAtual);
    return acao ? `${caminho}?${PARAMETRO_ACAO}=${acao}` : caminho;
  }
  return '/desafio';
}

/** Rota antiga `/hoje` (docs/FRONTEND.md §3) e entrada dos atalhos do ícone (`/hoje?acao=...`). */
export function RedirecionarHoje() {
  const [params] = useSearchParams();
  const { data: me } = useMe();
  const progressoQ = useMeuProgresso(me?.participacao?.desafioSlug);
  const dia = params.get('dia');
  if (dia && /^\d{1,3}$/.test(dia)) return <Navigate to={caminhoDoDia(Number(dia))} replace />;
  if (progressoQ.isPending && !progressoQ.isError) return <Carregando />;
  return <Navigate to={destinoDeHoje(params, progressoQ.data)} replace />;
}
