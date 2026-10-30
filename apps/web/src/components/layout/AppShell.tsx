import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useMe } from '../../lib/queries';
import { nomeTransicaoDoEstado } from '../../lib/transicoes';
import { Carregando } from '../ui/basicos';
import { BarraAbas, ROTAS_COM_ABAS } from './BarraAbas';
import { Watermark } from './Watermark';

/**
 * Layout das telas do app. Sem cabeçalho fixo: cada página tem o seu topo (eyebrow + h1, ou
 * BotaoVoltar). A barra de abas aparece só nas rotas de aba e só para inscritos.
 */
export function AppShell() {
  const { data: me } = useMe();
  const { pathname, state } = useLocation();
  // Container transform: a tela de destino herda o nome do card tocado (abrir-dia, abrir-ranking).
  const nomeTransicao = nomeTransicaoDoEstado(state);
  const comAbas = Boolean(me?.participacao) && ROTAS_COM_ABAS.includes(pathname);

  return (
    <div className="relative min-h-dvh">
      <Watermark />
      <main
        className={`mx-auto max-w-md px-5 pt-[calc(env(safe-area-inset-top)+16px)] ${comAbas ? 'pb-[calc(env(safe-area-inset-bottom)+112px)]' : 'pb-10'}`}
      >
        <div style={nomeTransicao ? { viewTransitionName: nomeTransicao } : undefined}>
          <Suspense fallback={<Carregando />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
      <BarraAbas visivel={comAbas} />
    </div>
  );
}
