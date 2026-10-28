// Gera apps/web/public/logo.png PROVISÓRIA (TODO_DECISAO(LOGO): trocar pela logo oficial).
const path = require('node:path');
const sharp = require(require.resolve('sharp', { paths: [path.join(__dirname, '..', 'apps', 'api')] }));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <polygon points="512,170 880,830 144,830" fill="#dc2626"/>
  <polygon points="512,170 616,356 560,330 512,380 462,330 408,356" fill="#ffffff"/>
  <polygon points="700,500 900,830 520,830" fill="#7f1d1d"/>
</svg>`;
sharp(Buffer.from(svg)).png().toFile(path.join(__dirname, '..', 'apps', 'web', 'public', 'logo.png'))
  .then(() => console.log('logo provisória gerada'));
