// Ícones do PWA gerados a partir de public/logo.png (logo oficial, confirmada em 2026-10-30).
// A logo.png é gerada por scripts/marca.cjs a partir de apps/web/design/logo-original.jpg,
// junto com as máscaras public/marca/*.png usadas na UI. Para regerar tudo, na raiz do repo:
//   node scripts/marca.cjs
//   pnpm --filter web generate-pwa-assets
// Os PNGs/ICO gerados em public/ são versionados (o build não depende do sharp).
import { defineConfig, type Preset } from '@vite-pwa/assets-generator/config';

const FUNDO = '#000000';

const preset: Preset = {
  // Ícones "any" (favicon, 64, 192 e 512): fundo preto como a logo; a folga já vem do logo.png.
  transparent: {
    sizes: [64, 192, 512],
    favicons: [[48, 'favicon.ico']],
    padding: 0,
    resizeOptions: { background: FUNDO, fit: 'contain' },
  },
  // Maskable: fundo preto e margem de segurança (zona segura = círculo de 80%).
  maskable: {
    sizes: [512],
    padding: 0.3,
    resizeOptions: { background: FUNDO, fit: 'contain' },
  },
  // apple-touch-icon 180 px: o iOS não aceita transparência, então fundo preto.
  apple: {
    sizes: [180],
    padding: 0.2,
    resizeOptions: { background: FUNDO, fit: 'contain' },
  },
};

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset,
  images: ['public/logo.png'],
});
