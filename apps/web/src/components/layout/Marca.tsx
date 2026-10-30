import type { CSSProperties } from 'react';

/**
 * Logo oficial do Everest (montanha em traço + "EVEREST"), desenhada com máscaras CSS
 * (utilitário `mascara-marca` em styles/index.css): a forma vem de public/marca/*.png e a cor
 * do fundo do elemento, então a montanha acompanha o tema e o nome fica sempre vermelho.
 * Os PNGs são gerados por `node scripts/marca.cjs` a partir de apps/web/design/logo-original.jpg.
 */
export const MASCARAS = {
  montanha: '/marca/montanha.png',
  everest: '/marca/everest.png',
  /** Montanha com traço engrossado: o traço fino da original some abaixo de ~60 px. */
  icone: '/marca/icone.png',
} as const;

function estiloMascara(url: string): CSSProperties {
  return { '--mascara': `url(${url})` } as CSSProperties;
}

/**
 * Ícone pequeno da montanha (topo das telas). Decorativo. Usa a máscara de traço grosso
 * (proporção 128:58 ≈ 2,2:1); numa caixa quadrada (size-7) a montanha ocupa 28×13 px.
 */
export function IconeMontanha({ className = 'size-7' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`mascara-marca inline-block shrink-0 bg-current ${className}`}
      style={estiloMascara(MASCARAS.icone)}
    />
  );
}

/**
 * Montanha grande (capa). Decorativa. O PNG tem proporção 682:313 (≈ 2,18:1); a máscara usa
 * `contain`, então uma caixa com outra proporção só sobra espaço em volta.
 */
export function MontanhaMarca({ className = 'aspect-[682/313] w-full' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`mascara-marca block bg-current ${className}`}
      style={estiloMascara(MASCARAS.montanha)}
    />
  );
}

/**
 * Nome "EVEREST" em vermelho. O texto acessível fica num `sr-only`. O PNG tem proporção
 * 681:61 (≈ 11,2:1): a largura sai da altura pelo aspect-ratio (ex.: h-4 → ≈ 179 px).
 */
export function Wordmark({
  className = 'h-5 aspect-[681/61]',
  rotulo = 'Everest',
}: {
  className?: string;
  rotulo?: string;
}) {
  return (
    <span className={`relative inline-block shrink-0 ${className}`}>
      <span
        aria-hidden
        className="mascara-marca absolute inset-0 bg-vermelho"
        style={estiloMascara(MASCARAS.everest)}
      />
      <span className="sr-only">{rotulo}</span>
    </span>
  );
}
