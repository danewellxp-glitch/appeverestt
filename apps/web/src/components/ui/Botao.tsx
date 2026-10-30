import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variante = 'primario' | 'secundario' | 'fantasma';

const ESTILOS: Record<Variante, string> = {
  // vermelho #dc2626 só como fundo, com texto branco (~4,8:1)
  primario: 'bg-vermelho text-sobre-vermelho hover:bg-vermelho-escuro disabled:bg-superficie-2 disabled:text-texto-2',
  secundario:
    'border border-borda bg-superficie-2 text-texto hover:border-texto-2 disabled:text-texto-2 disabled:hover:border-borda',
  fantasma: 'text-texto hover:bg-superficie-2 disabled:text-texto-2',
};

export interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  carregando?: boolean;
  larguraTotal?: boolean;
  icone?: ReactNode;
}

/** Botão com alvo de toque ≥ 44 px e foco visível. */
export function Botao({
  variante = 'primario',
  carregando = false,
  larguraTotal = false,
  icone,
  className = '',
  children,
  disabled,
  type = 'button',
  ...resto
}: BotaoProps) {
  return (
    <button
      type={type}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors ${ESTILOS[variante]} ${larguraTotal ? 'w-full' : ''} ${className}`}
      {...resto}
    >
      {carregando ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icone}
      {children}
    </button>
  );
}
