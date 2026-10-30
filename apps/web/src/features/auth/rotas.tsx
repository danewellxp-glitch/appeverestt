import type { MeResposta } from '@everest/shared';
import { Navigate, Outlet, useLocation } from 'react-router';
import { Alerta, Carregando } from '../../components/ui/basicos';
import { useMe } from '../../lib/queries';
import { ErroAposEntrar } from './ErroAposEntrar';
import { destinoDaParticipacao } from './sessao';
import { usePosAutenticacao } from './usePosAutenticacao';

function Falha() {
  return (
    <Alerta tipo="erro" className="mt-6">
      Não foi possível carregar sua sessão. Verifique a conexão e recarregue a página.
    </Alerta>
  );
}

/** Exige login; senão manda para /entrar?volta=<rota atual>. */
export function RotaProtegida() {
  const { data: me, isPending, isError } = useMe();
  const local = useLocation();
  if (isPending) return <Carregando />;
  if (isError) return <Falha />;
  if (!me) {
    const volta = encodeURIComponent(local.pathname + local.search);
    return <Navigate to={`/entrar?volta=${volta}`} replace />;
  }
  return <Outlet />;
}

function PosAutenticacao({ me }: { me: MeResposta }) {
  const { erroInscricao } = usePosAutenticacao(me);
  if (erroInscricao) return <ErroAposEntrar mensagem={erroInscricao} />;
  return <Carregando texto="Entrando…" />;
}

/**
 * Telas de visitante (/entrar, /criar-conta). Com sessão, decide o destino (usePosAutenticacao):
 * perfil incompleto → /bem-vindo; senão `acao`/`volta`/desafio. Erro de rede no `me` deixa entrar.
 */
export function RotaVisitante() {
  const { data: me, isPending, isError } = useMe();
  if (isPending && !isError) return <Carregando />;
  if (me) return <PosAutenticacao me={me} />;
  return <Outlet />;
}

/** Exige perfil completo (aceite + dados de cadastro); senão /bem-vindo?volta=<rota atual>. */
export function RotaPerfilCompleto() {
  const { data: me } = useMe();
  const local = useLocation();
  if (me && !me.usuario.perfilCompleto) {
    const volta = encodeURIComponent(local.pathname + local.search);
    return <Navigate to={`/bem-vindo?volta=${volta}`} replace />;
  }
  return <Outlet />;
}

/**
 * Exige inscrição no desafio ativo com pagamento confirmado (use dentro de RotaProtegida).
 * Sem vaga → "/"; vaga ainda não paga/confirmada → /pagamento (fica fora deste guard).
 */
export function RotaInscrito() {
  const { data: me, isPending, isError } = useMe();
  if (isPending) return <Carregando />;
  if (isError) return <Falha />;
  const destino = destinoDaParticipacao(me?.participacao);
  if (destino !== '/desafio') return <Navigate to={destino} replace />;
  return <Outlet />;
}

/** Exige papel ADMIN (use dentro de RotaProtegida). */
export function RotaAdmin() {
  const { data: me, isPending, isError } = useMe();
  if (isPending) return <Carregando />;
  if (isError) return <Falha />;
  if (me?.usuario.papel !== 'ADMIN') return <Navigate to="/desafio" replace />;
  return <Outlet />;
}

/** Redireciona rotas antigas (/login, /cadastro) preservando a query. */
export function RedirecionarPreservandoBusca({ para }: { para: string }) {
  const { search } = useLocation();
  return <Navigate to={`${para}${search}`} replace />;
}
