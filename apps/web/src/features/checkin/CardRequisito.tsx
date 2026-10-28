import { Circle, CircleCheck } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { Card } from '../../components/ui/basicos';

/** Moldura dos cards do checklist: título (h2), ícone e selo "Feito"/"Pendente". */
export function CardRequisito({
  titulo,
  icone,
  cumprido,
  children,
}: {
  titulo: string;
  icone: ReactNode;
  cumprido: boolean;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id}>
      <Card className={`flex flex-col gap-3 ${cumprido ? 'border-green-900' : ''}`}>
        <div className="flex items-center justify-between gap-3">
          <h2 id={id} className="flex items-center gap-2 text-lg font-bold">
            <span className="text-texto-2" aria-hidden>
              {icone}
            </span>
            {titulo}
          </h2>
          {cumprido ? (
            <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-sucesso">
              <CircleCheck className="size-4" aria-hidden />
              Feito
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-texto-2">
              <Circle className="size-4" aria-hidden />
              Pendente
            </span>
          )}
        </div>
        {children}
      </Card>
    </section>
  );
}
