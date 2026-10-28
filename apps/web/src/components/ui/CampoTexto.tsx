import { useId, type InputHTMLAttributes } from 'react';

export interface CampoTextoProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  rotulo: string;
  erro?: string | undefined;
  dica?: string;
}

/** Input com label, dica e erro ligados por aria-describedby. */
export function CampoTexto({ rotulo, erro, dica, className = '', ...resto }: CampoTextoProps) {
  const id = useId();
  const idErro = `${id}-erro`;
  const idDica = `${id}-dica`;
  const descritores = [dica ? idDica : null, erro ? idErro : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold text-texto">
        {rotulo}
      </label>
      <input
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritores}
        className={`min-h-11 rounded-xl border bg-superficie-2 px-3 text-base text-texto placeholder:text-texto-2/70 ${erro ? 'border-vermelho-texto' : 'border-borda'}`}
        {...resto}
      />
      {dica && !erro && (
        <p id={idDica} className="text-xs text-texto-2">
          {dica}
        </p>
      )}
      {erro && (
        <p id={idErro} className="text-sm text-vermelho-texto">
          {erro}
        </p>
      )}
    </div>
  );
}
