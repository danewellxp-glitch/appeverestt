import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';

export interface AreaTextoProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'value'> {
  rotulo: string;
  value: string;
  erro?: string | undefined;
  dica?: string;
  /** Mostra "n/max" abaixo do campo (precisa de `maxLength`). Padrão: sim. */
  contador?: boolean;
}

/**
 * Área de texto no estilo do CampoTexto (rótulo, dica, erro e contador "n/1000" ligados por
 * aria-describedby). Borda vermelha no foco e no erro.
 */
export const AreaTexto = forwardRef<HTMLTextAreaElement, AreaTextoProps>(function AreaTexto(
  { rotulo, erro, dica, contador = true, value, maxLength, rows = 4, className = '', ...resto },
  ref,
) {
  const id = useId();
  const idErro = `${id}-erro`;
  const idDica = `${id}-dica`;
  const idContador = `${id}-contador`;
  const comContador = contador && maxLength !== undefined;
  const descritores =
    [dica && !erro ? idDica : null, erro ? idErro : null, comContador ? idContador : null].filter(Boolean).join(' ') ||
    undefined;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="px-[22px] text-[13px] font-medium text-texto-2">
        {rotulo}
      </label>
      <textarea
        ref={ref}
        id={id}
        value={value}
        rows={rows}
        maxLength={maxLength}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritores}
        className={`min-h-[112px] rounded-[22px] border-[1.5px] bg-superficie-2 px-[22px] py-3.5 text-base text-texto placeholder:text-texto-2 focus:border-vermelho focus-visible:outline-none ${erro ? 'border-vermelho-texto' : 'border-transparent'}`}
        {...resto}
      />
      <div className="flex items-start justify-between gap-3 px-[22px]">
        {erro ? (
          <p id={idErro} className="text-[13px] text-vermelho-texto">
            {erro}
          </p>
        ) : dica ? (
          <p id={idDica} className="text-xs text-texto-2">
            {dica}
          </p>
        ) : (
          <span />
        )}
        {comContador && (
          <p id={idContador} className="shrink-0 text-xs text-texto-2 tabular-nums">
            <span className="sr-only">Caracteres usados: </span>
            {value.length}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
});
