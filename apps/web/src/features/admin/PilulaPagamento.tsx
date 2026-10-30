import type { StatusPagamento } from '@everest/shared';

const PILULA: Record<StatusPagamento, { rotulo: string; estilo: string }> = {
  PENDENTE: { rotulo: 'Pendente', estilo: 'bg-superficie-2 text-texto-2 shadow-[inset_0_0_0_1px_var(--borda)]' },
  INFORMADO: { rotulo: 'A confirmar', estilo: 'bg-laranja text-texto escuro:text-fundo' },
  CONFIRMADO: { rotulo: 'Pago', estilo: 'bg-superficie-2 text-texto' },
};

/** Situação do pagamento da inscrição (admin): Pendente, A confirmar (avisou) ou Pago. */
export function PilulaPagamento({ status, className = '' }: { status: StatusPagamento; className?: string }) {
  const p = PILULA[status];
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${p.estilo} ${className}`}>
      <span className="sr-only">Pagamento: </span>
      {p.rotulo}
    </span>
  );
}
