import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useMe } from '../../lib/queries';
import { Carregando } from '../ui/basicos';
import { BarraAbas, ROTAS_COM_ABAS } from './BarraAbas';
import { Watermark } from './Watermark';

/**
 * Layout das telas do app. Sem cabeçalho fixo: cada página tem o seu topo (eyebrow + h1, ou
 * BotaoVoltar). A barra de abas aparece só nas rotas de aba e só para inscritos.
 */
export function AppShell() {
  const { data: me } = useMe();
  const { pathname } = useLocation();
  const comAbas = Boolean(me?.participacao) && ROTAS_COM_ABAS.includes(pathname);

  return (
    <div className="relative min-h-dvh">
      <Watermark />
      <main
        className={`mx-auto max-w-md px-5 pt-[calc(env(safe-area-inset-top)+16px)] ${comAbas ? 'pb-[calc(env(safe-area-inset-bottom)+112px)]' : 'pb-10'}`}
      >
        <Suspense fallback={<Carregando />}>
          <Outlet />
        </Suspense>
      </main>
      <BarraAbas visivel={comAbas} />
    </div>
  );
}
