import { Suspense, useEffect, useRef } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { useMe } from '../../lib/queries';
import { nomeTransicaoDoEstado } from '../../lib/transicoes';
import { Carregando } from '../ui/basicos';
import { BarraAbas, ROTAS_COM_ABAS } from './BarraAbas';
import { Watermark } from './Watermark';

const SELETOR_CARREGANDO = 'main [role="status"][aria-label^="Carregando"]';

/**
 * Depois de cada navegação (não na primeira carga), move o foco para o h1 da página nova
 * (docs/FRONTEND.md §11): leitores de tela anunciam a tela e o Tab começa do topo.
 * Espera o skeleton sair (até ~2 s) para não focar um título provisório.
 */
function useFocoNoTitulo(pathname: string) {
  const primeira = useRef(true);
  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    let tentativas = 0;
    let quadro = 0;
    const focar = () => {
      const h1 = document.querySelector<HTMLElement>('main h1');
      if (h1 && !document.querySelector(SELETOR_CARREGANDO)) {
        if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1');
        h1.focus({ preventScroll: true });
        return;
      }
      tentativas += 1;
      if (tentativas < 120) quadro = requestAnimationFrame(focar);
    };
    quadro = requestAnimationFrame(focar);
    return () => cancelAnimationFrame(quadro);
  }, [pathname]);
}

/**
 * Layout das telas do app. Sem cabeçalho fixo: cada página tem o seu topo (eyebrow + h1, ou
 * BotaoVoltar). A barra de abas aparece só nas rotas de aba e só para inscritos.
 */
export function AppShell() {
  const { data: me } = useMe();
  const { pathname, state } = useLocation();
  // Container transform: a tela de destino herda o nome do card tocado (abrir-dia, abrir-ranking).
  const nomeTransicao = nomeTransicaoDoEstado(state);
  useFocoNoTitulo(pathname);
  // Abas só para quem já teve o pagamento confirmado (pendente não acessa as telas das abas).
  const comAbas = me?.participacao?.pagamentoStatus === 'CONFIRMADO' && ROTAS_COM_ABAS.includes(pathname);

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
      <ScrollRestoration />
    </div>
  );
}
