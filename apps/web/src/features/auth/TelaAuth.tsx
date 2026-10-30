import type { LucideIcon } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { BotaoVoltar } from '../../components/layout/BotaoVoltar';
import { marcarDirecao } from '../../lib/transicoes';

/** Linha ondulada vermelho→laranja atrás do título (decorativa). */
function LinhaOndulada() {
  const id = useId();
  return (
    <svg
      aria-hidden
      viewBox="0 0 390 190"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+40px)] -z-0 h-[190px] w-full"
    >
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--vermelho)' }} />
          <stop offset="1" style={{ stopColor: 'var(--laranja)' }} />
        </linearGradient>
      </defs>
      <path d="M-10 150 C 70 92 120 196 205 152 S 330 52 400 74" fill="none" stroke={`url(#${id})`} strokeWidth="2.5" />
    </svg>
  );
}

/**
 * Layout de /entrar, /criar-conta e /recuperar-senha: voltar + link alternativo no topo,
 * título grande sobre a linha ondulada e o conteúdo abaixo (docs/FRONTEND.md §8.3).
 */
export function TelaAuth({
  titulo,
  voltarPara = '/',
  alternativa,
  apoio,
  children,
}: {
  titulo: string;
  voltarPara?: string;
  /** Link no canto superior direito ("Criar conta" / "Entrar"), preservando a query. */
  alternativa?: { para: string; rotulo: string; Icone: LucideIcon };
  /** Texto pequeno abaixo do título (ex.: "Passo 1 de 2"). */
  apoio?: string;
  children: ReactNode;
}) {
  const { search } = useLocation();
  return (
    <div className="relative flex flex-col gap-[18px]">
      <LinhaOndulada />
      <div className="relative flex items-center justify-between">
        <BotaoVoltar para={voltarPara} />
        {alternativa && (
          <Link
            to={{ pathname: alternativa.para, search }}
            viewTransition
            onClick={() => marcarDirecao('avancar')}
            className="inline-flex min-h-11 items-center gap-1.5 px-1 text-sm font-semibold underline decoration-vermelho underline-offset-4"
          >
            <alternativa.Icone className="size-4" aria-hidden />
            {alternativa.rotulo}
          </Link>
        )}
      </div>
      <div className="relative mt-[30px] mb-[54px] flex flex-col items-center gap-2">
        <h1 tabIndex={-1} className="text-center font-display text-[64px] leading-[0.9] font-black uppercase focus:outline-none">
          {titulo}
        </h1>
        {apoio && <p className="rotulo">{apoio}</p>}
      </div>
      <div className="relative flex flex-col gap-[18px]">{children}</div>
    </div>
  );
}

/** Divisor "ou entre com" / "ou com e-mail". */
export function Divisor({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-3 text-[13px] text-texto-2 before:h-px before:flex-1 before:bg-borda after:h-px after:flex-1 after:bg-borda">
      {children}
    </p>
  );
}
