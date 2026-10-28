import { BookOpen, CalendarCheck, Trophy, TrendingUp } from 'lucide-react';
import { NavLink } from 'react-router';

const ITENS = [
  { para: '/hoje', rotulo: 'Hoje', Icone: CalendarCheck },
  { para: '/progresso', rotulo: 'Progresso', Icone: TrendingUp },
  { para: '/ranking', rotulo: 'Ranking', Icone: Trophy },
  { para: '/regras', rotulo: 'Regras', Icone: BookOpen },
] as const;

export function BottomNav() {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-borda bg-fundo/95 pb-safe backdrop-blur"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {ITENS.map(({ para, rotulo, Icone }) => (
          <li key={para}>
            <NavLink
              to={para}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-semibold ${isActive ? 'text-vermelho-texto' : 'text-texto-2 hover:text-texto'}`
              }
            >
              <Icone className="size-5" aria-hidden />
              {rotulo}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
