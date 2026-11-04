import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// react-router/dom: o RouterProvider daqui suporta navigate({ flushSync }) (usado no sair/excluir conta).
import { RouterProvider } from 'react-router/dom';
import { router } from './app/router';
import { ToastProvider } from './components/ui/Toast';
import { PwaGlobais } from './features/pwa/PwaGlobais';
import { aplicarModoApp } from './features/pwa/standalone';
import { iniciarCapturaInstalacao } from './features/pwa/useInstallPrompt';
import { definirAoNaoAutenticado } from './lib/api';
import { chaves } from './lib/queries';
import { queryClient } from './lib/queryClient';
import { iniciarTema } from './lib/tema';
import './styles/index.css';

// Em qualquer 401 inesperado: limpa o estado de auth; RotaProtegida leva ao /login.
definirAoNaoAutenticado(() => {
  queryClient.setQueryData(chaves.me, null);
});

// O `beforeinstallprompt` pode chegar antes do botão "Baixar o app" montar.
iniciarCapturaInstalacao();
iniciarTema();
// App instalado: sem zoom por pinça/duplo toque e sem "bounce" (no navegador o zoom continua).
aplicarModoApp();

const raiz = document.getElementById('root');
if (!raiz) throw new Error('Elemento #root não encontrado');

createRoot(raiz).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* Toasts (um por vez) + o único aviso de "sem conexão", em todas as rotas. */}
      <ToastProvider>
        <RouterProvider router={router} />
        <PwaGlobais />
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
