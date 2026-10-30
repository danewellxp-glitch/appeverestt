import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

export interface CampoTextoProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  rotulo: string;
  erro?: string | undefined;
  dica?: string;
  /** Telas de auth centralizam label e texto; o resto alinha à esquerda. */
  alinhamento?: 'esquerda' | 'centro';
  /** Conteúdo fixo antes do texto (ex.: "@" do Instagram). */
  prefixo?: ReactNode;
}

/** Input em pílula com label, dica e erro ligados por aria-describedby. Borda vermelha no foco e no erro. */
export function CampoTexto({
  rotulo,
  erro,
  dica,
  alinhamento = 'esquerda',
  prefixo,
  className = '',
  ...resto
}: CampoTextoProps) {
  const id = useId();
  const idErro = `${id}-erro`;
  const idDica = `${id}-dica`;
  const descritores = [dica ? idDica : null, erro ? idErro : null].filter(Boolean).join(' ') || undefined;
  const centro = alinhamento === 'centro';
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={id}
        className={`text-[13px] font-medium text-texto-2 ${centro ? 'text-center' : 'px-[22px]'}`}
      >
        {rotulo}
      </label>
      <div
        className={`flex h-[54px] items-center gap-1 rounded-full border-[1.5px] bg-superficie-2 px-[22px] transition-colors focus-within:border-vermelho ${erro ? 'border-vermelho-texto' : 'border-transparent'}`}
      >
        {prefixo && (
          <span aria-hidden className="text-base text-texto-2">
            {prefixo}
          </span>
        )}
        <input
          id={id}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descritores}
          className={`h-full w-full min-w-0 bg-transparent text-base text-texto placeholder:text-texto-2 focus-visible:outline-none ${centro ? 'text-center' : ''}`}
          {...resto}
        />
      </div>
      {dica && !erro && (
        <p id={idDica} className={`text-xs text-texto-2 ${centro ? 'text-center' : 'px-[22px]'}`}>
          {dica}
        </p>
      )}
      {erro && (
        <p id={idErro} className={`text-[13px] text-vermelho-texto ${centro ? 'text-center' : 'px-[22px]'}`}>
          {erro}
        </p>
      )}
    </div>
  );
}
