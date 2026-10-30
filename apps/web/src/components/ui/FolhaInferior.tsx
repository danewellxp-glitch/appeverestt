import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const DURACAO_SAIDA_MS = 260;
const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Folha que sobe de baixo (bottom sheet). role="dialog" + aria-modal; o foco vai para o primeiro
 * elemento focável, fica preso dentro dela e volta ao gatilho ao fechar. Esc e toque no véu fecham.
 */
export function FolhaInferior({
  aberta,
  aoFechar,
  titulo,
  children,
}: {
  aberta: boolean;
  aoFechar: () => void;
  titulo: string;
  children: ReactNode;
}) {
  const idTitulo = useId();
  const painel = useRef<HTMLDivElement>(null);
  const gatilho = useRef<HTMLElement | null>(null);
  const [montada, setMontada] = useState(aberta);
  const [saindo, setSaindo] = useState(false);
  const fechar = useRef(aoFechar);
  fechar.current = aoFechar;

  // Abre na hora; ao fechar, espera a animação de saída antes de desmontar.
  useEffect(() => {
    if (aberta) {
      setMontada(true);
      setSaindo(false);
      return;
    }
    if (!montada) return;
    setSaindo(true);
    const t = window.setTimeout(() => {
      setMontada(false);
      setSaindo(false);
    }, DURACAO_SAIDA_MS);
    return () => window.clearTimeout(t);
  }, [aberta, montada]);

  // Foco inicial, Esc, focus trap, rolagem do fundo travada; devolve o foco ao fechar.
  useEffect(() => {
    if (!aberta) return;
    gatilho.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const el = painel.current;
    const primeiro = el?.querySelector<HTMLElement>(FOCAVEIS);
    (primeiro ?? el)?.focus();
    const overflowAntes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        fechar.current();
        return;
      }
      if (e.key !== 'Tab' || !el) return;
      const focaveis = [...el.querySelectorAll<HTMLElement>(FOCAVEIS)];
      const ini = focaveis[0];
      const fim = focaveis[focaveis.length - 1];
      if (!ini || !fim) {
        e.preventDefault();
        return;
      }
      if (e.shiftKey && document.activeElement === ini) {
        e.preventDefault();
        fim.focus();
      } else if (!e.shiftKey && document.activeElement === fim) {
        e.preventDefault();
        ini.focus();
      }
    };
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflowAntes;
      gatilho.current?.focus();
    };
  }, [aberta]);

  // Renderiza no mesmo commit em que abre: o efeito de foco já encontra o painel.
  if (!montada && !aberta) return null;
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        aria-hidden
        onClick={() => fechar.current()}
        className="absolute inset-0 bg-scrim"
        style={{ animation: saindo ? `sair ${DURACAO_SAIDA_MS}ms ease-in both` : 'fade-in 240ms ease-out both' }}
      />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[86dvh] max-w-md flex-col gap-3.5 overflow-auto rounded-t-[30px] bg-superficie px-5 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+28px)] focus-visible:outline-none"
        style={{
          animation: saindo
            ? `folha-sair ${DURACAO_SAIDA_MS}ms ease-in both`
            : 'folha-entrar 420ms cubic-bezier(.2,.9,.25,1) both',
        }}
      >
        <span aria-hidden className="mb-1 h-[5px] w-10 self-center rounded-full bg-borda" />
        <h2 id={idTitulo} className="font-display text-[28px] leading-none font-black uppercase">
          {titulo}
        </h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
