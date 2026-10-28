import { CheckCircle2, RefreshCw, WifiOff, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useOnline } from '../../lib/useOnline';

const UMA_HORA = 60 * 60 * 1000;
const TEMPO_TOAST_OFFLINE_PRONTO = 6000;

const CLASSE_TOAST =
  'pointer-events-auto flex w-full items-center gap-3 rounded-2xl border px-4 py-2 text-sm shadow-lg shadow-black/60';

/** Indicador global de offline: aparece em todas as rotas (inclusive `/`). */
function IndicadorOffline() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className={`${CLASSE_TOAST} min-h-11 border-amber-900 bg-amber-950 text-amber-100`}>
      <WifiOff className="size-4 shrink-0" aria-hidden />
      <span>Você está offline. A edição volta quando a conexão voltar.</span>
    </div>
  );
}

/** Toasts do service worker: "Nova versão disponível" e "pronto para uso offline". */
function ToastsServiceWorker() {
  const {
    needRefresh: [precisaAtualizar, setPrecisaAtualizar],
    offlineReady: [prontoOffline, setProntoOffline],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registro) {
      if (!registro) return;
      // Abas abertas por muito tempo também recebem a versão nova.
      setInterval(() => {
        if (navigator.onLine && !registro.installing) void registro.update();
      }, UMA_HORA);
    },
    onRegisterError(erro: unknown) {
      console.error('Falha ao registrar o service worker', erro);
    },
  });
  const [atualizando, setAtualizando] = useState(false);

  useEffect(() => {
    if (!prontoOffline) return;
    const t = window.setTimeout(() => setProntoOffline(false), TEMPO_TOAST_OFFLINE_PRONTO);
    return () => window.clearTimeout(t);
  }, [prontoOffline, setProntoOffline]);

  if (precisaAtualizar) {
    return (
      <div className={`${CLASSE_TOAST} border-borda bg-superficie-2 text-texto`}>
        <RefreshCw className="size-4 shrink-0 text-texto-2" aria-hidden />
        <span className="flex-1">Nova versão disponível</span>
        <button
          type="button"
          disabled={atualizando}
          onClick={() => {
            setAtualizando(true);
            // Ativa o SW novo; a página recarrega quando ele assume o controle.
            void updateServiceWorker(true);
          }}
          className="min-h-11 rounded-xl bg-vermelho px-4 text-xs font-bold uppercase tracking-wide text-white hover:bg-red-700 disabled:bg-superficie disabled:text-texto-2"
        >
          {atualizando ? 'Atualizando…' : 'Atualizar'}
        </button>
        <button
          type="button"
          onClick={() => setPrecisaAtualizar(false)}
          aria-label="Agora não"
          className="-mr-2 flex min-h-11 min-w-11 items-center justify-center rounded-xl text-texto-2 hover:text-texto"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    );
  }

  if (prontoOffline) {
    return (
      <div className={`${CLASSE_TOAST} border-borda bg-superficie-2 text-texto`}>
        <CheckCircle2 className="size-4 shrink-0 text-sucesso" aria-hidden />
        <span className="flex-1">App pronto para uso offline.</span>
        <button
          type="button"
          onClick={() => setProntoOffline(false)}
          aria-label="Fechar aviso"
          className="-mr-2 flex min-h-11 min-w-11 items-center justify-center rounded-xl text-texto-2 hover:text-texto"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    );
  }

  return null;
}

/**
 * UI global do PWA, montada em main.tsx fora do router.
 * Fica acima da BottomNav (≈56 px + safe area) para não cobrir a navegação.
 */
export function PwaGlobais() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-50 px-4"
    >
      <div className="mx-auto flex max-w-md flex-col gap-2">
        <IndicadorOffline />
        <ToastsServiceWorker />
      </div>
    </div>
  );
}
