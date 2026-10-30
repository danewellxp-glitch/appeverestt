import { Link, type LinkProps } from 'react-router';
import { type Direcao, marcarDirecao } from '../../lib/transicoes';

/**
 * Link interno com View Transition e direção da animação (docs/FRONTEND.md §7.3):
 * 'avancar' aprofunda (padrão), 'voltar' sobe um nível, 'aba' troca de seção.
 */
export function LinkNav({ direcao = 'avancar', onClick, ...props }: LinkProps & { direcao?: Direcao }) {
  return (
    <Link
      viewTransition
      {...props}
      onClick={(e) => {
        marcarDirecao(direcao);
        onClick?.(e);
      }}
    />
  );
}
