import { useContador } from '../../lib/useContador';

const FORMATO_PADRAO = new Intl.NumberFormat('pt-BR');

/** Número que conta até o valor na primeira exibição (800 ms; instantâneo com reduced motion). */
export function Contador({
  valor,
  formato = FORMATO_PADRAO,
  className = '',
}: {
  valor: number;
  formato?: Intl.NumberFormat;
  className?: string;
}) {
  const atual = useContador(valor);
  return <span className={`tabular-nums ${className}`}>{formato.format(atual)}</span>;
}
