import { LogOut, Shield } from 'lucide-react';
import { Suspense } from 'react';
import { Link, Outlet } from 'react-router';
import { useLogout } from '../../features/auth/useLogout';
import { useMe } from '../../lib/queries';
import { Carregando } from '../ui/basicos';
import { BottomNav } from './BottomNav';
import { Watermark } from './Watermark';

/** Layout das telas do app: cabeçalho, conteúdo (max-w-md) e bottom nav para inscritos. */
export function AppShell() {
  const { data: me } = useMe();
  const logout = useLogout();
  const inscrito = Boolean(me?.participacao);

  return (
    <div className="relative min-h-dvh">
      <Watermark />
      <header className="sticky top-0 z-20 border-b border-borda bg-fundo/90 pt-safe backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-2 px-4 py-2">
          <Link to="/" className="flex min-h-11 items-center gap-2 font-bold tracking-wide">
            <img src="/logo.webp" alt="" width={32} height={32} className="size-8" />
            <span>EVEREST</span>
          </Link>
          {me && (
            <div className="flex items-center gap-1">
              {me.usuario.papel === 'ADMIN' && (
                <Link
                  to="/admin"
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-texto-2 hover:text-texto"
                  aria-label="Painel do embaixador"
                >
                  <Shield className="size-5" aria-hidden />
                </Link>
              )}
              <button
                type="button"
                onClick={() => logout.mutate()}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-texto-2 hover:text-texto"
                aria-label="Sair da conta"
              >
                <LogOut className="size-5" aria-hidden />
              </button>
            </div>
          )}
        </div>
      </header>
      <main className={`mx-auto max-w-md px-4 pt-4 ${inscrito ? 'pb-28' : 'pb-10'}`}>
        <Suspense fallback={<Carregando />}>
          <Outlet />
        </Suspense>
      </main>
      {inscrito && <BottomNav />}
    </div>
  );
}
