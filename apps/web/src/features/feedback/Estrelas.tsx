import { Star } from 'lucide-react';
import { useId } from 'react';

const NOTAS = [1, 2, 3, 4, 5] as const;

/** Nome acessível de cada opção ("1 estrela", "2 estrelas"…). */
function rotuloNota(n: number): string {
  return n === 1 ? '1 estrela' : `${n} estrelas`;
}

/**
 * Nota de 1 a 5 com radios nativos (setas do teclado trocam a nota) desenhados como estrelas.
 * `valor` 0 = sem nota.
 */
export function Estrelas({
  valor,
  aoMudar,
  legenda,
  erro,
}: {
  valor: number;
  aoMudar: (nota: number) => void;
  legenda: string;
  erro?: string | undefined;
}) {
  const nome = useId();
  const idErro = `${nome}-erro`;
  return (
    <fieldset aria-describedby={erro ? idErro : undefined} className="grid gap-2">
      <legend className="mb-2 px-1 text-[13px] font-medium text-texto-2">{legenda}</legend>
      <div className="flex gap-1">
        {NOTAS.map((n) => {
          const acesa = valor >= n;
          return (
            <label key={n} className="relative grid size-12 cursor-pointer place-items-center rounded-full">
              <input
                type="radio"
                name={nome}
                value={n}
                checked={valor === n}
                onChange={() => aoMudar(n)}
                aria-invalid={erro ? true : undefined}
                className="peer absolute inset-0 size-full cursor-pointer appearance-none rounded-full focus-visible:outline-none"
              />
              <Star
                aria-hidden
                className={`pointer-events-none size-9 transition-transform duration-150 peer-focus-visible:scale-110 peer-active:scale-90 ${acesa ? 'fill-vermelho text-vermelho' : 'fill-transparent text-texto-2'}`}
                strokeWidth={1.75}
              />
              <span className="pointer-events-none absolute inset-0 rounded-full peer-focus-visible:shadow-[0_0_0_2px_var(--fundo),0_0_0_4px_var(--vermelho)]" />
              <span className="sr-only">{rotuloNota(n)}</span>
            </label>
          );
        })}
      </div>
      {erro && (
        <p id={idErro} className="px-1 text-[13px] text-vermelho-texto">
          {erro}
        </p>
      )}
    </fieldset>
  );
}

/** Nota só para leitura (admin): 5 estrelas, as `nota` primeiras preenchidas. */
export function NotaEstrelas({ nota, className = 'size-5' }: { nota: number; className?: string }) {
  return (
    <span role="img" aria-label={`Nota ${nota} de 5`} className="inline-flex gap-0.5">
      {NOTAS.map((n) => (
        <Star
          key={n}
          aria-hidden
          strokeWidth={1.75}
          className={`${className} ${nota >= n ? 'fill-vermelho text-vermelho' : 'fill-transparent text-texto-2'}`}
        />
      ))}
    </span>
  );
}
