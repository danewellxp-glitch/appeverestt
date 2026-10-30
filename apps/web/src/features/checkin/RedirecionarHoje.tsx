import { Navigate, useSearchParams } from 'react-router';
import { Carregando } from '../../components/ui/basicos';
import { useMe, useMeuProgresso } from '../../lib/queries';
import { caminhoDoDia } from '../desafio/navegacao';

/**
 * Rota antiga `/hoje` (docs/FRONTEND.md §3): `/hoje?dia=N` → `/desafio/dia/N`;
 * `/hoje` → dia atual, ou `/desafio` fora do período do desafio.
 */
export function RedirecionarHoje() {
  const [params] = useSearchParams();
  const { data: me } = useMe();
  const progressoQ = useMeuProgresso(me?.participacao?.desafioSlug);
  const dia = params.get('dia');
  if (dia && /^\d{1,3}$/.test(dia)) return <Navigate to={caminhoDoDia(Number(dia))} replace />;
  if (progressoQ.isPending && !progressoQ.isError) return <Carregando />;
  const p = progressoQ.data;
  if (p?.status === 'EM_ANDAMENTO' && p.diaAtual !== null) return <Navigate to={caminhoDoDia(p.diaAtual)} replace />;
  return <Navigate to="/desafio" replace />;
}
