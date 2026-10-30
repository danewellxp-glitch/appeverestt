import { WifiOff } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useOnline } from '../../lib/useOnline';

const DURACAO_PADRAO_MS = 2400;

export interface OpcoesToast {
  /** ms até sumir; `Infinity` = fica até a ação ou o fechar. Padrão 2,4 s. */
  duracao?: number;
  acao?: { rotulo: string; aoClicar: () => void };
  /** Chamado quando o toast some (tempo, ação ou substituição). */
  aoSumir?: () => void;
}

interface ToastAtual extends OpcoesToast {
  id: number;
  texto: string;
}

interface ContextoToast {
  toast: (texto: string, opcoes?: OpcoesToast) => void;
  fecharToast: () => void;
}

const Contexto = createContext<ContextoToast | null>(null);

/** Um toast por vez, no topo; também mostra o único aviso global de "sem conexão". */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [atual, setAtual] = useState<ToastAtual | null>(null);
  const atualRef = useRef<ToastAtual | null>(null);
  const seq = useRef(0);
  const online = useOnline();

  const trocar = useCallback((proximo: ToastAtual | null) => {
    const anterior = atualRef.current;
    atualRef.current = proximo;
    setAtual(proximo);
    anterior?.aoSumir?.();
  }, []);

  const fecharToast = useCallback(() => trocar(null), [trocar]);

  const toast = useCallback(
    (texto: string, opcoes: OpcoesToast = {}) => {
      seq.current += 1;
      trocar({ id: seq.current, texto, ...opcoes });
    },
    [trocar],
  );

  useEffect(() => {
    if (!atual) return;
    const duracao = atual.duracao ?? DURACAO_PADRAO_MS;
    if (!Number.isFinite(duracao)) return;
    const t = window.setTimeout(fecharToast, duracao);
    return () => window.clearTimeout(t);
  }, [atual, fecharToast]);

  const valor = useMemo(() => ({ toast, fecharToast }), [toast, fecharToast]);

  return (
    <Contexto.Provider value={valor}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+8px)] z-[60] flex flex-col items-center gap-2 px-4"
      >
        {!online && (
          <p className="flex max-w-[88%] items-center gap-2 rounded-full border border-aviso-borda bg-aviso-fundo px-4 py-2.5 text-[13px] font-semibold text-aviso-texto shadow-[0_10px_30px_-10px_rgb(0_0_0/0.5)]">
            <WifiOff className="size-4 shrink-0" aria-hidden />
            Sem conexão. A edição volta quando a internet voltar.
          </p>
        )}
        {atual && (
          <div
            key={atual.id}
            className="flex max-w-[88%] items-center gap-3 rounded-full bg-texto py-2.5 pr-2.5 pl-4 text-center text-[13px] font-semibold text-fundo shadow-[0_10px_30px_-10px_rgb(0_0_0/0.5)]"
            style={{ animation: 'toast-entrar 260ms var(--ease-saida) both', paddingRight: atual.acao ? undefined : '1rem' }}
          >
            <span>{atual.texto}</span>
            {atual.acao && (
              <button
                type="button"
                onClick={() => {
                  atual.acao?.aoClicar();
                  fecharToast();
                }}
                className="pointer-events-auto min-h-11 shrink-0 rounded-full bg-vermelho px-4 text-[13px] font-semibold text-sobre-vermelho"
              >
                {atual.acao.rotulo}
              </button>
            )}
          </div>
        )}
      </div>
    </Contexto.Provider>
  );
}

export function useToast(): ContextoToast {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useToast precisa do <ToastProvider> (main.tsx).');
  return ctx;
}
