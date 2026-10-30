import { ChartLine, Flag, Trophy, User, type LucideIcon } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { marcarDirecao } from '../../lib/transicoes';

interface ItemAba {
  para: string;
  rotulo: string;
  Icone: LucideIcon;
  /** Outros caminhos em que a aba aparece ativa. */
  tambem?: readonly string[];
}

export const ABAS: readonly ItemAba[] = [
  { para: '/desafio', rotulo: 'Desafio', Icone: Flag },
  { para: '/progresso', rotulo: 'Progresso', Icone: ChartLine },
  { para: '/ranking', rotulo: 'Ranking', Icone: Trophy },
  { para: '/perfil', rotulo: 'Perfil', Icone: User },
];

/** Rotas que mostram a barra de abas (para inscritos). */
export const ROTAS_COM_ABAS: readonly string[] = ABAS.flatMap((a) => [a.para, ...(a.tambem ?? [])]);

function abaAtiva(pathname: string): number {
  return ABAS.findIndex((a) => [a.para, ...(a.tambem ?? [])].some((p) => pathname === p || pathname.startsWith(`${p}/`)));
}

/**
 * Barra de abas em pílula flutuante, com indicador vermelho que desliza até a aba ativa.
 * Fica fora das View Transitions (`view-transition-name: tabbar`) para não piscar.
 */
export function BarraAbas({ visivel }: { visivel: boolean }) {
  const { pathname } = useLocation();
  const ativa = abaAtiva(pathname);
  // Mede o <li> (o offsetParent dele é a <ul>, onde o indicador é posicionado).
  const itens = useRef<(HTMLLIElement | null)[]>([]);
  const [indicador, setIndicador] = useState<{ x: number; largura: number } | null>(null);

  useLayoutEffect(() => {
    const medir = () => {
      const el = ativa >= 0 ? itens.current[ativa] : null;
      setIndicador(el ? { x: el.offsetLeft, largura: el.offsetWidth } : null);
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [ativa]);

  return (
    <nav
      aria-label="Navegação principal"
      aria-hidden={!visivel || undefined}
      inert={!visivel}
      className={`fixed inset-x-3.5 bottom-[calc(env(safe-area-inset-bottom)+14px)] z-20 mx-auto max-w-[calc(28rem-28px)] transition-[transform,opacity] duration-[420ms] ease-saida ${visivel ? '' : 'pointer-events-none translate-y-[120%] opacity-0'}`}
      style={{ viewTransitionName: 'tabbar' }}
    >
      <ul className="relative flex h-16 rounded-full bg-superficie p-1.5 shadow-[inset_0_0_0_1px_var(--borda),0_12px_30px_-12px_rgb(0_0_0/0.35)]">
        {indicador && (
          <li
            aria-hidden
            className="absolute top-1.5 left-0 h-[52px] rounded-full bg-vermelho transition-[transform,width] duration-[420ms] ease-[cubic-bezier(.3,.8,.3,1.15)]"
            style={{ transform: `translateX(${indicador.x}px)`, width: indicador.largura }}
          />
        )}
        {ABAS.map(({ para, rotulo, Icone }, i) => {
          const atual = i === ativa;
          return (
            <li
              key={para}
              ref={(el) => {
                itens.current[i] = el;
              }}
              className="relative z-10 flex-1"
            >
              <Link
                to={para}
                viewTransition
                onClick={() => marcarDirecao('aba')}
                aria-current={atual ? 'page' : undefined}
                className={`flex h-[52px] flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-semibold transition-colors duration-300 ${atual ? 'text-sobre-vermelho' : 'text-texto-2 hover:text-texto'}`}
              >
                <Icone className="size-5" aria-hidden />
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
