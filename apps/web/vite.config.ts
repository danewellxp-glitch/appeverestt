/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { atalhosDoManifest } from './src/features/pwa/atalhos';

// Destino do proxy /api (dev e preview). Os testes E2E (Playwright) apontam para a API de teste.
const API_PROXY = process.env.VITE_API_PROXY ?? 'http://localhost:3000';

/**
 * Preload só do peso 900 da Big Shoulders (títulos grandes, acima da dobra). O nome do arquivo
 * tem hash, então o <link> é injetado no build a partir do bundle.
 */
function preloadFonteTitulo(): Plugin {
  return {
    name: 'everest:preload-fonte-titulo',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const arquivo = Object.keys(ctx.bundle ?? {}).find((nome) =>
          /big-shoulders-display-latin-900-normal-[\w-]+\.woff2$/.test(nome),
        );
        if (!arquivo) return [];
        return [
          {
            tag: 'link',
            attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `/${arquivo}`, crossorigin: '' },
            injectTo: 'head',
          },
        ];
      },
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    preloadFonteTitulo(),
    VitePWA({
      // Nova versão só ativa quando o usuário toca em "Atualizar" (features/pwa/PwaGlobais).
      registerType: 'prompt',
      // O registro é feito por useRegisterSW (virtual:pwa-register/react).
      injectRegister: false,
      // Ícones gerados por `pnpm --filter web exec pwa-assets-generator` (pwa-assets.config.ts)
      // e versionados em public/. A integração pwaAssets fica desligada de propósito.
      // Logo, ícones e favicon entram no precache pelo globPatterns abaixo (sem duplicar).
      includeManifestIcons: false,
      manifest: {
        name: 'Everest Desafio',
        short_name: 'Everest',
        description: 'Desafio 30 Dias Everest — construindo a sua melhor versão.',
        lang: 'pt-BR',
        dir: 'ltr',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        // Abre sempre em tela cheia de app (sem a barra do navegador).
        display_override: ['standalone'],
        orientation: 'portrait',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        // Toque longo no ícone (Android): água, treino e leitura em 1 toque (features/pwa/atalhos.ts).
        shortcuts: atalhosDoManifest(),
      },
      workbox: {
        // Só o app shell (assets do build + ícones). Nada de runtimeCaching:
        // /api e URLs assinadas do storage NUNCA vão para o cache.
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg,webp,woff2}'],
        // A UI usa as máscaras public/marca/*.png (entram pelo glob acima); logo.png é só a fonte
        // dos ícones do PWA (scripts/marca.cjs) e não precisa ir para o precache.
        // Fotos da landing (public/landing/) são grandes: carregam sob demanda, fora do precache.
        globIgnores: ['**/logo.png', '**/landing/**'],
        navigateFallback: '/index.html',
        // /__/* é o login do Firebase (popup e iframe do Google): tem que ir para a rede,
        // senão o SW devolve o index.html e o popup mostra o 404 do app.
        navigateFallbackDenylist: [/^\/api/, /^\/__\//],
        cleanupOutdatedCaches: true,
      },
      // SW desligado no `vite dev` (sem dev-dist); teste com build + preview.
      devOptions: { enabled: false },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: API_PROXY, changeOrigin: false },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': { target: API_PROXY, changeOrigin: false },
    },
  },
  test: {
    environment: 'jsdom',
    // e2e/ é do Playwright (pnpm test:e2e), não do Vitest.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
  },
});
