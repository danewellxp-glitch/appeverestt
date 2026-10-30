import type { CSSProperties } from 'react';
import { MASCARAS } from './Marca';

/**
 * Montanha da logo fixa, centralizada e quase transparente atrás de todo o conteúdo.
 * Máscara (mascara-marca) com a cor do texto: escura no tema claro, clara no escuro.
 */
export function Watermark() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 flex items-center justify-center"
    >
      <span
        className="mascara-marca block aspect-[682/313] w-[80vw] max-w-md bg-current text-texto opacity-[0.1] select-none escuro:opacity-[0.13]"
        style={{ '--mascara': `url(${MASCARAS.montanha})` } as CSSProperties}
      />
    </div>
  );
}
