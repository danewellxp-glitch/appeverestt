import { ArrowRight } from 'lucide-react';

/**
 * Botão principal fixo acima da barra de abas, sobre um degradê do fundo para transparente.
 * A página reserva espaço extra embaixo para o conteúdo não ficar escondido.
 */
export function CtaFixo({
  rotulo,
  aoClicar,
  aoPressionar,
}: {
  rotulo: string;
  aoClicar: (el: HTMLButtonElement) => void;
  aoPressionar?: () => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+84px)] z-10 bg-linear-to-t from-fundo from-60% to-transparent px-5 pt-[22px] pb-2">
      <div className="mx-auto max-w-md">
        <button
          type="button"
          onPointerDown={aoPressionar}
          onClick={(e) => aoClicar(e.currentTarget)}
          className="press pointer-events-auto inline-flex h-[54px] w-full items-center justify-center gap-2.5 rounded-full bg-vermelho px-5 text-base font-semibold text-sobre-vermelho hover:bg-vermelho-escuro"
        >
          {rotulo}
          <ArrowRight className="size-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
