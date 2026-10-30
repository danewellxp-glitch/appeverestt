import { useEffect, useState } from 'react';

/** Barra de progresso acessível: preenchimento em gradiente que cresce a partir de 0 no mount. */
export function Barra({
  valor,
  maximo,
  rotulo,
  tom = 'normal',
  className = '',
}: {
  valor: number;
  maximo: number;
  rotulo: string;
  /** 'pop': trilho para cards invertidos (bg-pop). */
  tom?: 'normal' | 'pop';
  className?: string;
}) {
  const [montado, setMontado] = useState(false);
  useEffect(() => {
    const quadro = requestAnimationFrame(() => setMontado(true));
    return () => cancelAnimationFrame(quadro);
  }, []);
  const pct = maximo > 0 ? Math.max(0, Math.min(100, (valor / maximo) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={maximo}
      aria-valuenow={Math.min(valor, maximo)}
      className={`h-2.5 w-full overflow-hidden rounded-full ${tom === 'pop' ? 'bg-pop-trilho' : 'bg-superficie-2'} ${className}`}
    >
      <div
        className="h-full rounded-full bg-linear-to-r from-vermelho to-laranja transition-[width] duration-600 ease-saida"
        style={{ width: `${montado ? pct : 0}%` }}
      />
    </div>
  );
}
