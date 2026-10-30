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
  erro: 'border-erro-borda bg-erro-fundo text-erro-texto',
  aviso: 'border-aviso-borda bg-aviso-fundo text-aviso-texto',
  info: 'border-borda bg-superficie-2 text-texto',
  sucesso: 'border-ok-borda bg-ok-fundo text-ok-texto',
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
