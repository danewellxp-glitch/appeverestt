import type { StatusDesafio } from '@everest/shared';
import { ArrowRight, MessageSquareHeart } from 'lucide-react';
import { LinkNav } from '../../components/layout/LinkNav';

/** Mostrar o convite na home: nos 3 últimos dias (a partir do dia 28 de 30) e depois do fim. */
export function deveMostrarFeedback({
  status,
  diaAtual,
  totalDias,
}: {
  status: StatusDesafio;
  diaAtual: number | null;
  totalDias: number;
}): boolean {
  if (status === 'ENCERRADO') return true;
  return status === 'EM_ANDAMENTO' && diaAtual !== null && diaAtual >= totalDias - 2;
}

/** Card "Conte como foi" (abaixo do "Seu dia"/"Seu resultado"): leva à /feedback. */
export function CardFeedback(props: { status: StatusDesafio; diaAtual: number | null; totalDias: number }) {
  if (!deveMostrarFeedback(props)) return null;
  const encerrado = props.status === 'ENCERRADO';
  return (
    <LinkNav
      to="/feedback"
      className="press relative grid gap-1 rounded-[28px] bg-superficie p-[18px] pr-16 shadow-[inset_0_0_0_1px_var(--borda)]"
    >
      <span className="flex items-center gap-2">
        <MessageSquareHeart className="size-4 text-vermelho-texto" aria-hidden />
        <span className="text-[17px] font-bold">Conte como foi</span>
      </span>
      <span className="text-sm text-texto-2">
        {encerrado
          ? 'O que você achou do desafio e o que mudou para você nestes 30 dias? Leva 2 minutos.'
          : 'Na reta final: conte o que achou do desafio e o que já mudou para você.'}
      </span>
      <span
        aria-hidden
        className="absolute top-1/2 right-4 grid size-[38px] -translate-y-1/2 place-items-center rounded-full bg-vermelho text-sobre-vermelho"
      >
        <ArrowRight className="size-4" />
      </span>
    </LinkNav>
  );
}
