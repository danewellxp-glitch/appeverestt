import { REQUISITOS, type Requisito } from '@everest/shared';
import { Segmentos } from '../desafio/CardSeuDia';
import { BannerDiaConcluido } from './BannerDiaConcluido';

/** Card resumo do dia: "k de 5 requisitos", "fecha às 23:59", barra de 5 segmentos e o banner. */
export function ResumoDia({
  pendentes,
  concluido,
  animarBanner,
  editavel,
  totalDias,
}: {
  pendentes: Requisito[];
  concluido: boolean;
  animarBanner: boolean;
  editavel: boolean;
  totalDias: number;
}) {
  const total = REQUISITOS.length;
  const feitos = total - pendentes.length;
  return (
    <section aria-label="Resumo do dia" className="surgir grid gap-3 rounded-3xl bg-superficie p-4 shadow-[inset_0_0_0_1px_var(--borda)]">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-bold" aria-live="polite">
          {feitos} de {total} requisitos
        </p>
        {editavel && <p className="text-[13px] text-texto-2">fecha às 23:59</p>}
      </div>
      <Segmentos feitos={feitos} total={total} />
      {concluido && <BannerDiaConcluido animar={animarBanner} totalDias={totalDias} />}
    </section>
  );
}
