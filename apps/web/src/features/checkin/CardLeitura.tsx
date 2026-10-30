import { LIMITES, METAS } from '@everest/shared';
import { BookOpen, Minus } from 'lucide-react';
import { useId } from 'react';
import { Botao } from '../../components/ui/Botao';
import { CardRequisito } from './CardRequisito';
import { limitar } from './formatos';

/** Stepper de páginas: − / número grande / +, mais os atalhos +1 e +5. */
export function CardLeitura({
  paginas,
  editavel,
  aoAlterar,
}: {
  paginas: number;
  editavel: boolean;
  aoAlterar: (fn: (atual: number) => number) => void;
}) {
  const idSaida = useId();
  const somar = (n: number) => aoAlterar((atual) => limitar(atual + n, 0, LIMITES.paginasMax));
  return (
    <CardRequisito
      titulo="Leitura"
      meta={`Meta: ${METAS.paginas} páginas`}
      icone={<BookOpen className="size-5" />}
      cumprido={paginas >= METAS.paginas}
      falta={`Faltam ${Math.max(0, METAS.paginas - paginas)} pág.`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {editavel && (
            <button
              type="button"
              aria-label="Menos uma página"
              aria-controls={idSaida}
              disabled={paginas <= 0}
              onClick={() => somar(-1)}
              className="press grid size-11 place-items-center rounded-full bg-superficie-2 disabled:opacity-50"
            >
              <Minus className="size-4" aria-hidden />
            </button>
          )}
          <output
            id={idSaida}
            aria-live="polite"
            aria-label={`${paginas} de ${METAS.paginas} páginas`}
            className="min-w-[2ch] text-center font-display text-[34px] leading-none font-extrabold tabular-nums"
          >
            {paginas}
          </output>
          <span aria-hidden className="text-[13px] text-texto-2">
            / {METAS.paginas} páginas
          </span>
        </div>
        {editavel && (
          <div className="flex gap-1.5">
            <Botao tamanho="sm" variante="secundario" aria-controls={idSaida} onClick={() => somar(1)} aria-label="+1 página">
              +1
            </Botao>
            <Botao
              tamanho="sm"
              variante="secundario"
              aria-controls={idSaida}
              onClick={() => somar(5)}
              aria-label="+5 páginas"
            >
              +5
            </Botao>
          </div>
        )}
      </div>
    </CardRequisito>
  );
}
