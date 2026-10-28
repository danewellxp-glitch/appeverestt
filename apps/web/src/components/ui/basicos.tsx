import { AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';

export function Card({ className = '', children, ...resto }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-2xl border border-borda bg-superficie p-4 ${className}`} {...resto}>
      {children}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-xl bg-superficie-2 ${className}`} />;
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-12 text-texto-2">
      <Loader2 className="size-5 animate-spin" aria-hidden />
      <span>{texto}</span>
    </div>
  );
}

type TipoAlerta = 'erro' | 'aviso' | 'info' | 'sucesso';

const ESTILO_ALERTA: Record<TipoAlerta, string> = {
  erro: 'border-red-900 bg-red-950/60 text-red-100',
  aviso: 'border-amber-900 bg-amber-950/50 text-amber-100',
  info: 'border-borda bg-superficie-2 text-texto',
  sucesso: 'border-green-900 bg-green-950/50 text-green-100',
};

const ICONE: Record<TipoAlerta, ReactNode> = {
  erro: <AlertTriangle className="size-5 shrink-0" aria-hidden />,
  aviso: <AlertTriangle className="size-5 shrink-0" aria-hidden />,
  info: <Info className="size-5 shrink-0" aria-hidden />,
  sucesso: <CheckCircle2 className="size-5 shrink-0" aria-hidden />,
};

export function Alerta({
  tipo = 'info',
  children,
  className = '',
  acao,
}: {
  tipo?: TipoAlerta;
  children: ReactNode;
  className?: string;
  acao?: ReactNode;
}) {
  return (
    <div
      role={tipo === 'erro' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${ESTILO_ALERTA[tipo]} ${className}`}
    >
      {ICONE[tipo]}
      <div className="flex-1">{children}</div>
      {acao}
    </div>
  );
}

/** Rótulo de apoio: caixa alta, tracking-widest. */
export function Rotulo({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`rotulo ${className}`}>{children}</p>;
}

/** Barra de progresso acessível. */
export function BarraProgresso({
  valor,
  maximo,
  rotulo,
  className = '',
}: {
  valor: number;
  maximo: number;
  rotulo: string;
  className?: string;
}) {
  const pct = maximo > 0 ? Math.max(0, Math.min(100, (valor / maximo) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={maximo}
      aria-valuenow={Math.min(valor, maximo)}
      className={`h-2.5 w-full overflow-hidden rounded-full bg-superficie-2 ${className}`}
    >
      <div className="h-full rounded-full bg-vermelho transition-[width] duration-300" style={{ width: `${pct}%` }} />
    </div>
  );
}
