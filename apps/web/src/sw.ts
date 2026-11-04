/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import {
  TITULO_CONFIRMACAO,
  destinoDoClique,
  lerPayload,
  mensagemDaResposta,
  opcoesDaConfirmacao,
  opcoesDaNotificacao,
  type DestinoClique,
} from './features/push/sw/mensagens';

/**
 * Service worker do app (vite-plugin-pwa, `injectManifest`). Faz o mesmo que o SW gerado antes
 * (precache do app shell, fallback de SPA, "Atualizar" pelo SKIP_WAITING) e recebe o push (R22).
 * Nada de runtimeCaching: /api e URLs assinadas do storage nunca vão para o cache.
 */
declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// /__/* é o login do Firebase (popup e iframe do Google): tem que ir para a rede,
// senão o SW devolve o index.html e o popup mostra o 404 do app.
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/api/, /^\/__\//] }));

// Nova versão só ativa quando a pessoa toca em "Atualizar" (features/pwa/PwaGlobais → useRegisterSW).
self.addEventListener('message', (evento) => {
  const dados: unknown = evento.data;
  if (typeof dados === 'object' && dados !== null && (dados as { type?: unknown }).type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

function lerDadosDoPush(evento: PushEvent): unknown {
  try {
    return evento.data?.json() as unknown;
  } catch {
    return null;
  }
}

self.addEventListener('push', (evento) => {
  const payload = lerPayload(lerDadosDoPush(evento));
  evento.waitUntil(self.registration.showNotification(payload.titulo, opcoesDaNotificacao(payload)));
});

/** Foca uma janela do app já aberta e navega até `url`; sem janela, abre uma nova. */
async function abrirNoApp(url: string): Promise<void> {
  const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const destino = new URL(url, self.location.origin).href;
  for (const janela of janelas) {
    if (new URL(janela.url).origin !== self.location.origin) continue;
    // Foco primeiro (a página aparece na hora); se o navegador negar, navega mesmo assim.
    await janela.focus().catch(() => undefined);
    try {
      await janela.navigate(destino);
      return;
    } catch {
      // Janela não controlada por este SW (ou já fechando): tenta a próxima / abre uma nova.
    }
  }
  await self.clients.openWindow(destino);
}

/** Botão da notificação: registra sem abrir o app e confirma com a mensagem do servidor. */
async function executarAcao(destino: Extract<DestinoClique, { tipo: 'acao' }>, tag: string): Promise<void> {
  try {
    const resposta = await fetch('/api/acoes-rapidas', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ acao: destino.acao }),
    });
    // 401 (sessão expirada) ou qualquer erro: abre o app, que aplica a ação depois do login.
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const mensagem = mensagemDaResposta(await resposta.json());
    if (!mensagem) throw new Error('Resposta inesperada');
    await self.registration.showNotification(TITULO_CONFIRMACAO, opcoesDaConfirmacao(mensagem, tag));
  } catch {
    await self.clients.openWindow(destino.seFalhar);
  }
}

self.addEventListener('notificationclick', (evento) => {
  const { notification } = evento;
  notification.close();
  const destino = destinoDoClique({ action: evento.action, data: notification.data });
  evento.waitUntil(destino.tipo === 'acao' ? executarAcao(destino, notification.tag) : abrirNoApp(destino.url));
});
