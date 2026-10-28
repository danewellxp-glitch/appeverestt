import { Navigate, Outlet, useLocation } from 'react-router';
import { Alerta, Carregando } from '../../components/ui/basicos';
import { useMe } from '../../lib/queries';

function Falha() {
  return (
    <Alerta tipo="erro" className="mt-6">
      Não foi possível carregar sua sessão. Verifique a conexão e recarregue a página.
    </Alerta>
  );
}

/** Exige login; senão manda para /login?volta=<rota atual>. */
export function RotaProtegida() {
  const { data: me, isPending, isError } = useMe();
  const local = useLocation();
  if (isPending) return <Carregando />;
  if (isError) return <Falha />;
  if (!me) {
    const volta = encodeURIComponent(local.pathname + local.search);
    return <Navigate to={`/login?volta=${volta}`} replace />;
  }
  return <Outlet />;
}

/** Exige inscrição no desafio ativo (use dentro de RotaProtegida). */
export function RotaInscrito() {
  const { data: me, isPending, isError } = useMe();
  if (isPending) return <Carregando />;
  if (isError) return <Falha />;
  if (!me?.participacao) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Exige papel ADMIN (use dentro de RotaProtegida). */
export function RotaAdmin() {
  const { data: me, isPending, isError } = useMe();
  if (isPending) return <Carregando />;
  if (isError) return <Falha />;
  if (me?.usuario.papel !== 'ADMIN') return <Navigate to="/hoje" replace />;
  return <Outlet />;
}
