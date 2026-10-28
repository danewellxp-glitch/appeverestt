import { Share, SquarePlus, X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { Botao } from '../../components/ui/Botao';

interface Props {
  aberto: boolean;
  onFechar: () => void;
}

/**
 * Passo a passo para instalar no iOS (Safari não tem `beforeinstallprompt`).
 * `<dialog>` nativo com showModal(): prende o foco, fecha com Esc e devolve o foco ao botão que abriu.
 */
export function ModalInstrucoesIOS({ aberto, onFechar }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();
  const idDescricao = useId();

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) {
      const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialogo.showModal();
      return () => {
        if (dialogo.open) dialogo.close();
        anterior?.focus();
      };
    }
    if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitulo}
      aria-describedby={idDescricao}
      // Esc dispara "cancel" e depois "close"; o close cobre os dois casos.
      onClose={onFechar}
      // Toque fora do conteúdo (no backdrop) fecha.
      onClick={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
      className="m-auto w-[min(100%-2rem,24rem)] rounded-2xl border border-borda bg-superficie p-0 text-texto backdrop:bg-black/80"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 id={idTitulo} className="text-lg font-bold">
            Instalar no iPhone
          </h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar instruções"
            className="-mr-2 -mt-2 flex min-h-11 min-w-11 items-center justify-center rounded-xl text-texto-2 hover:text-texto"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <p id={idDescricao} className="mt-1 text-sm text-texto-2">
          No Safari, adicione o Everest à Tela de Início para abrir como app.
        </p>
        <ol className="mt-4 space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-superficie-2 font-bold">
              1
            </span>
            <span>
              Toque em <strong>Compartilhar</strong>{' '}
              <Share className="inline size-4 align-text-bottom" aria-hidden /> na barra do Safari.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-superficie-2 font-bold">
              2
            </span>
            <span>
              Role e toque em <strong>“Adicionar à Tela de Início”</strong>{' '}
              <SquarePlus className="inline size-4 align-text-bottom" aria-hidden />.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-superficie-2 font-bold">
              3
            </span>
            <span>
              Toque em <strong>Adicionar</strong>. O ícone do Everest aparece na sua tela.
            </span>
          </li>
        </ol>
        <p className="mt-4 text-xs text-texto-2">
          Está em outro navegador (Chrome, Instagram…)? Abra este link no Safari primeiro.
        </p>
        <Botao larguraTotal className="mt-5" onClick={onFechar}>
          Entendi
        </Botao>
      </div>
    </dialog>
  );
}
