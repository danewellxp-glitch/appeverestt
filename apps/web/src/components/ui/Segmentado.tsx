import type { ReactNode } from 'react';

export interface OpcaoSegmentado<T extends string> {
  valor: T;
  rotulo: string;
  icone?: ReactNode;
}

/** Controle segmentado (Claro/Escuro/Sistema, iPhone/Android): grupo de botões com aria-pressed. */
export function Segmentado<T extends string>({
  opcoes,
  valor,
  aoMudar,
  rotulo,
  compacto = false,
}: {
  opcoes: readonly OpcaoSegmentado<T>[];
  valor: T;
  aoMudar: (valor: T) => void;
  rotulo: string;
  /** Ícone em cima do rótulo, texto menor: cabe 4 opções num celular de 360 px. */
  compacto?: boolean;
}) {
  return (
    <div role="group" aria-label={rotulo} className="flex gap-0.5 rounded-full bg-superficie-2 p-1">
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            aria-pressed={ativo}
            onClick={() => aoMudar(o.valor)}
            className={`flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-full font-medium ${compacto ? 'flex-col gap-0.5 px-1 py-1.5 text-[11.5px] leading-none' : 'gap-1.5 px-2.5 text-[13px]'} transition-colors duration-200 ${ativo ? 'bg-superficie text-texto shadow-[0_1px_3px_rgb(0_0_0/0.14)]' : 'text-texto-2 hover:text-texto'}`}
          >
            {o.icone}
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}
