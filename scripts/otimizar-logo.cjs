// Gera apps/web/public/logo.webp (512 px) a partir de apps/web/public/logo.png.
// A logo.png (1024 px) continua sendo a fonte dos ícones do PWA (pwa-assets.config.ts);
// a UI (Watermark, cabeçalho, Entrada) usa a logo.webp, bem mais leve.
// TODO_DECISAO(LOGO): ao receber a logo oficial, substitua logo.png e rode:
//   node scripts/otimizar-logo.cjs
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(
  require.resolve('sharp', { paths: [path.join(__dirname, '..', 'apps', 'api')] }),
);

const publico = path.join(__dirname, '..', 'apps', 'web', 'public');
const origem = path.join(publico, 'logo.png');
const destino = path.join(publico, 'logo.webp');
const LADO = 512;
const LIMITE_BYTES = 50 * 1024;

sharp(origem)
  .resize(LADO, LADO, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .webp({ quality: 82, alphaQuality: 90, effort: 6 })
  .toFile(destino)
  .then(() => {
    const bytes = fs.statSync(destino).size;
    console.log(`logo.webp gerada: ${LADO}x${LADO}, ${(bytes / 1024).toFixed(1)} KB`);
    if (bytes > LIMITE_BYTES) {
      console.error(`logo.webp passou de ${LIMITE_BYTES / 1024} KB; reduza a qualidade.`);
      process.exitCode = 1;
    }
  })
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  });
