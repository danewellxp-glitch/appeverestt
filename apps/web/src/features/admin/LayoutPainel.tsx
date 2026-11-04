import type { AdminDesafioConfig } from '@everest/shared';
import { ChartColumn, Settings2, Users, type LucideIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { NavLink, useOutletContext } from 'react-router';

/**
 * O app é uma coluna de celular (max-w-md, no AppShell). O painel do embaixador sai dela no
 * desktop: até 72rem, centralizado, com folga para a barra de rolagem. No celular não muda nada.
 */
const LARGURA = 'max(100%, min(72rem, calc(100vw - 4rem)))';
const ESTILO_LARGO: CSSProperties = {
  width: LARGURA,
  marginLeft: `calc((100% - ${LARGURA}) / 2)`,
};

export function LarguraPainel({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div style={ESTILO_LARGO} className={className}>
      {children}
    </div>
  );
}

interface Aba {
  para: string;
  rotulo: string;
  Icone: LucideIcon;
}

const ABAS: readonly Aba[] = [
  { para: '/admin', rotulo: 'Indicadores', Icone: ChartColumn },
  { para: '/admin/participantes', rotulo: 'Participantes', Icone: Users },
  { para: '/admin/desafio', rotulo: 'Desafio', Icone: Settings2 },
];

/**
 * Navegação entre as seções do painel (links de verdade: voltar do navegador e link direto
 * funcionam). `pendencias` vira um selo na aba Participantes (pagamentos e dias para conferir).
 */
export function AbasPainel({ pendencias = 0 }: { pendencias?: number }) {
  return (
    <nav aria-label="Seções do painel">
      <ul className="flex gap-0.5 rounded-full bg-superficie-2 p-1 sm:max-w-xl">
        {ABAS.map(({ para, rotulo, Icone }) => (
          <li key={para} className="flex-auto">
            <NavLink
              to={para}
              end
              className={({ isActive }) =>
                `flex min-h-11 items-center justify-center gap-1.5 rounded-full px-2.5 text-[13px] whitespace-nowrap font-semibold transition-colors duration-200 ${isActive ? 'bg-superficie text-texto shadow-[0_1px_3px_rgb(0_0_0/0.14)]' : 'text-texto-2 hover:text-texto'}`
              }
            >
              <Icone className="hidden size-4 sm:block" aria-hidden />
              {rotulo}
              {para === '/admin/participantes' && pendencias > 0 && (
                <span className="grid min-w-5 place-items-center rounded-full bg-vermelho px-1.5 text-[11px] leading-5 font-bold text-sobre-vermelho tabular-nums">
                  {pendencias}
                  <span className="sr-only"> {pendencias === 1 ? 'pendência' : 'pendências'}</span>
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Link com cara de botão primário (pílula vermelha). */
export const CLASSE_LINK_PRIMARIO =
  'press inline-flex min-h-11 h-[42px] items-center justify-center gap-2 rounded-full bg-vermelho px-4 text-sm font-semibold text-sobre-vermelho hover:bg-vermelho-escuro';

/** Link com cara de botão secundário. */
export const CLASSE_LINK_SECUNDARIO =
  'press inline-flex min-h-11 h-[42px] items-center justify-center gap-2 rounded-full bg-superficie-2 px-4 text-sm font-semibold whitespace-nowrap hover:shadow-[inset_0_0_0_1px_var(--borda-campo)]';

/** O que o layout do painel (/admin) passa para as abas. */
export interface ContextoPainel {
  /** O desafio ativo (as abas só aparecem quando existe um). */
  desafio: AdminDesafioConfig;
  desafios: AdminDesafioConfig[];
}

export function useContextoPainel(): ContextoPainel {
  return useOutletContext<ContextoPainel>();
}
