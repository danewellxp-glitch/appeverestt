import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useToast } from '../../components/ui/Toast';

const UMA_HORA = 60 * 60 * 1000;
const TEMPO_TOAST_OFFLINE_PRONTO = 4000;

/**
 * Avisos do service worker pelo ToastProvider: "Nova versão disponível · Atualizar" (fica até a
 * pessoa agir) e "App pronto para uso offline". O aviso de "sem conexão" é do próprio ToastProvider.
 * Montado em main.tsx, fora do router.
 */
export function PwaGlobais() {
  const { toast } = useToast();
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

  useEffect(() => {
    if (!precisaAtualizar) return;
    toast('Nova versão disponível', {
      duracao: Infinity,
      // Ativa o SW novo; a página recarrega quando ele assume o controle.
      acao: { rotulo: 'Atualizar', aoClicar: () => void updateServiceWorker(true) },
      aoSumir: () => setPrecisaAtualizar(false),
    });
  }, [precisaAtualizar, setPrecisaAtualizar, toast, updateServiceWorker]);

  useEffect(() => {
    if (!prontoOffline) return;
    toast('App pronto para uso offline.', {
      duracao: TEMPO_TOAST_OFFLINE_PRONTO,
      aoSumir: () => setProntoOffline(false),
    });
  }, [prontoOffline, setProntoOffline, toast]);

  return null;
}
