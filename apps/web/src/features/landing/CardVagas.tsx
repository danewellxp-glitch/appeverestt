import type { DesafioAtual } from '@everest/shared';
import { Barra } from '../../components/ui/Barra';
import { Contador } from '../../components/ui/Contador';
import { formatarReais } from '../../lib/moeda';

/** Mini contador de vagas do topo da landing (recarrega a cada 30 s pela página). */
export function CardVagas({ desafio }: { desafio: DesafioAtual }) {
  const preenchidas = Math.max(0, desafio.totalVagas - desafio.vagasDisponiveis);
  const esgotado = desafio.vagasDisponiveis <= 0;
  return (
    <section
      aria-label="Vagas"
      className="grid gap-2.5 rounded-3xl bg-superficie p-[18px] shadow-[inset_0_0_0_1px_var(--borda)]"
    >
      <p className="flex items-baseline justify-between gap-3" aria-live="polite">
        <Contador valor={desafio.vagasDisponiveis} className="font-display text-[48px] leading-[0.9] font-extrabold" />
        <span className="text-[13px] text-texto-2">{esgotado ? 'vagas: esgotado' : 'vagas restantes'}</span>
      </p>
      <Barra valor={preenchidas} maximo={desafio.totalVagas} rotulo="Vagas preenchidas" />
      <p className="text-[13px] text-texto-2">
        {preenchidas} de {desafio.totalVagas} vagas preenchidas
        {esgotado ? '. Fique de olho no próximo desafio.' : ''}
      </p>
      {desafio.inscricao && (
        <p className="border-t border-borda pt-2.5 text-sm">
          Inscrição: <b className="tabular-nums">{formatarReais(desafio.inscricao.valorCentavos)}</b> via Pix
        </p>
      )}
    </section>
  );
}
