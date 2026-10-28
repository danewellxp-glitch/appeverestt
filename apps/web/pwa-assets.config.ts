// Ícones do PWA gerados a partir de public/logo.png.
// TODO_DECISAO(LOGO): a logo atual é provisória. Ao receber a oficial, substitua
// public/logo.png e rode, na raiz do repo:
//   pnpm --filter web exec pwa-assets-generator
// Os PNGs/ICO gerados em public/ são versionados (o build não depende do sharp).
import { defineConfig, type Preset } from '@vite-pwa/assets-generator/config';

const FUNDO = '#000000';

const preset: Preset = {
  // Ícones "any" com fundo transparente (favicon, 192 e 512).
  transparent: {
    sizes: [64, 192, 512],
    favicons: [[48, 'favicon.ico']],
    padding: 0.05,
    resizeOptions: { background: 'transparent', fit: 'contain' },
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
