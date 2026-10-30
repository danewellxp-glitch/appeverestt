import { Check } from 'lucide-react';
import { useId, type ReactNode } from 'react';

/**
 * Moldura dos cards do check-in: ícone em bolha, título + meta e um selo à direita
 * ("Feito" em pílula vermelha, ou o que falta). Cumprido ganha um anel vermelho de 1,5 px.
 */
export function CardRequisito({
  titulo,
  meta,
  icone,
  cumprido,
  falta,
  children,
}: {
  titulo: string;
  meta: string;
  icone: ReactNode;
  cumprido: boolean;
  /** Texto do selo quando ainda não cumpriu (ex.: "Faltam 1.500 ml"). */
  falta: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={`surgir grid gap-3 rounded-3xl bg-superficie p-4 transition-shadow duration-[350ms] ${cumprido ? 'shadow-[inset_0_0_0_1.5px_var(--vermelho)]' : 'shadow-[inset_0_0_0_1px_var(--borda)]'}`}
    >
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid size-[42px] shrink-0 place-items-center rounded-full bg-superficie-2 text-vermelho-texto">
          {icone}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={id} className="text-base font-bold">
            {titulo}
          </h2>
          <p className="text-[13px] text-texto-2">{meta}</p>
        </div>
        {cumprido ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-vermelho px-2.5 py-[5px] text-xs font-semibold text-sobre-vermelho">
            <Check className="size-3.5" aria-hidden />
            Feito
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center rounded-full bg-superficie-2 px-2.5 py-[5px] text-xs font-semibold whitespace-nowrap text-texto-2">
            {falta}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
