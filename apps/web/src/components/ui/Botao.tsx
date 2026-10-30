import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type VarianteBotao = 'primario' | 'secundario' | 'fantasma' | 'gradiente' | 'google' | 'perigo';
export type TamanhoBotao = 'md' | 'sm';

const ESTILOS: Record<VarianteBotao, string> = {
  // vermelho #dc2626 só como fundo, com texto branco (~4,8:1)
  primario: 'bg-vermelho text-sobre-vermelho hover:bg-vermelho-escuro',
  secundario: 'bg-superficie-2 text-texto hover:shadow-[inset_0_0_0_1px_var(--borda-campo)]',
  fantasma: 'bg-transparent text-texto hover:bg-superficie-2',
  // borda de 2 px em gradiente vermelho→laranja, fundo da página por dentro
  gradiente:
    'border-2 border-transparent text-texto [background:linear-gradient(var(--fundo),var(--fundo))_padding-box,linear-gradient(90deg,var(--vermelho),var(--laranja))_border-box]',
  google: 'bg-superficie text-texto shadow-[inset_0_0_0_1px_var(--borda)] hover:bg-superficie-2',
  perigo: 'bg-superficie-2 text-vermelho-texto hover:shadow-[inset_0_0_0_1px_var(--vermelho-texto)]',
};

const TAMANHOS: Record<TamanhoBotao, string> = {
  md: 'h-[54px] px-5 text-base',
  sm: 'h-[42px] min-w-11 px-3.5 text-sm',
};

export interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
  /** Mostra um spinner no lugar do conteúdo, mantendo a largura. */
  carregando?: boolean;
  larguraTotal?: boolean;
  icone?: ReactNode;
}

/** Botão em pílula, sem caixa alta, com toque em mola e foco visível (alvo ≥ 44 px). */
export function Botao({
  variante = 'primario',
  tamanho = 'md',
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
      className={`press relative inline-flex min-h-11 items-center justify-center rounded-full font-semibold transition-[transform,background-color,box-shadow,opacity] duration-200 disabled:opacity-50 ${TAMANHOS[tamanho]} ${ESTILOS[variante]} ${larguraTotal ? 'w-full' : ''} ${className}`}
      {...resto}
    >
      <span className={`inline-flex items-center justify-center gap-2.5 ${carregando ? 'invisible' : ''}`}>
        {icone}
        {children}
      </span>
      {carregando && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="size-5 animate-spin" aria-hidden />
        </span>
      )}
    </button>
  );
}
