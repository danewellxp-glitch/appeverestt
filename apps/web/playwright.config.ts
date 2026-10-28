import { defineConfig } from '@playwright/test';
import { ENV_API, PORTA_WEB, URL_API, URL_WEB } from './e2e/ambiente';

// E2E da Fase 12: viewport de celular, pilha isolada (API E2E na 3001 + build servido na 4174).
// Pré-requisitos: `docker compose up -d` e `pnpm --filter api build` (apps/api/dist).
// Rodar: pnpm --filter web test:e2e
export default defineConfig({
  testDir: './e2e',
  // Os testes compartilham um banco: um worker, em ordem.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: URL_WEB,
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    // O service worker do PWA não é alvo destes testes e deixaria o reload menos determinístico.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'node e2e/iniciar-api.mjs',
      url: `${URL_API}/api/health`,
      env: ENV_API,
      reuseExistingServer: false,
      timeout: 180_000,
      // Log de boot do Nest é ruidoso; erros (stderr) continuam aparecendo.
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      // Build separado (não mexe no dist/ do dia a dia) servido pelo preview, com o proxy /api na API E2E.
      command: `pnpm exec vite build --outDir node_modules/.e2e-dist --emptyOutDir && pnpm exec vite preview --outDir node_modules/.e2e-dist --port ${PORTA_WEB} --strictPort`,
      url: URL_WEB,
      env: { VITE_API_PROXY: URL_API },
      reuseExistingServer: false,
      timeout: 240_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
