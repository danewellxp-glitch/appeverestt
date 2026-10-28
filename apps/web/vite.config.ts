import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
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
      },
      workbox: {
        // Só o app shell (assets do build + ícones). Nada de runtimeCaching:
        // /api e URLs assinadas do storage NUNCA vão para o cache.
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg,webp,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        cleanupOutdatedCaches: true,
      },
      // SW desligado no `vite dev` (sem dev-dist); teste com build + preview.
      devOptions: { enabled: false },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: false },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: false },
    },
  },
});
