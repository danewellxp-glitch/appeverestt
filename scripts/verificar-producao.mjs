#!/usr/bin/env node
// Verificação rápida do deploy de produção (docs/DEPLOY.md, seção 11).
// Uso: node scripts/verificar-producao.mjs https://desafio.exemplo.com.br [--contabo]
// Testa o app PELO DOMÍNIO PÚBLICO, passando pelo proxy /api → API (rewrite da Vercel ou Caddy).
// --contabo: servidor próprio (docker-compose.prod.yml); pula a checagem do vercel.json.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const base = (process.argv[2] ?? '').replace(/\/+$/, '');
const contabo = process.argv.includes('--contabo');

if (!/^https?:\/\/[^/]+$/.test(base)) {
  console.error('Uso: node scripts/verificar-producao.mjs https://<domínio-do-app>');
  process.exit(2);
}

let falhas = 0;
let avisos = 0;
const ok = (msg) => console.log(`  ✔ ${msg}`);
const falha = (msg) => {
  falhas++;
  console.log(`  ✖ ${msg}`);
};
const aviso = (msg) => {
  avisos++;
  console.log(`  ! ${msg}`);
};

async function buscar(caminho) {
  const r = await fetch(`${base}${caminho}`, {
    redirect: 'manual',
    signal: AbortSignal.timeout(20_000),
  });
  const corpo = await r.text();
  return { status: r.status, headers: r.headers, corpo };
}

async function checar(nome, fn) {
  try {
    await fn();
  } catch (e) {
    falha(`${nome}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

console.log(`\nVerificando ${base}\n`);

if (!contabo) await checar('vercel.json', async () => {
  const vercel = readFileSync(`${raiz}apps/web/vercel.json`, 'utf8');
  if (vercel.includes('API_HOST_AQUI'))
    falha('apps/web/vercel.json ainda tem API_HOST_AQUI (troque pelo host da API)');
  else ok('apps/web/vercel.json sem API_HOST_AQUI');
});

await checar('/api/health', async () => {
  const r = await buscar('/api/health');
  if (r.status === 200 && r.corpo.includes('"db":"ok"') && r.corpo.includes('"redis":"ok"')) {
    ok(`/api/health pelo rewrite → ${r.corpo}`);
  } else {
    falha(
      `/api/health → HTTP ${r.status} ${r.corpo.slice(0, 120)} (esperado 200 {"db":"ok","redis":"ok"})`,
    );
  }
});

await checar('/api/docs', async () => {
  const r = await buscar('/api/docs');
  if (r.status === 404) ok('/api/docs → 404 (Swagger desligado em produção)');
  else falha(`/api/docs → HTTP ${r.status} (esperado 404: confira NODE_ENV=production na API)`);
});

await checar('/', async () => {
  const r = await buscar('/');
  const tipo = r.headers.get('content-type') ?? '';
  if (r.status === 200 && tipo.includes('text/html')) ok('/ → 200 HTML');
  else falha(`/ → HTTP ${r.status} ${tipo}`);
  if (r.headers.get('x-content-type-options') === 'nosniff')
    ok('header X-Content-Type-Options: nosniff');
  else aviso('header X-Content-Type-Options ausente (o vercel.json foi aplicado?)');
  if (r.headers.get('strict-transport-security')) ok('HSTS presente');
  else aviso('HSTS ausente (normal só se não for HTTPS)');
});

await checar('SPA fallback', async () => {
  const r = await buscar('/hoje');
  if (r.status === 200 && (r.headers.get('content-type') ?? '').includes('text/html')) {
    ok('/hoje → index.html (fallback da SPA)');
  } else {
    falha(`/hoje → HTTP ${r.status} (o fallback para /index.html do vercel.json não está ativo)`);
  }
});

await checar('PWA', async () => {
  const m = await buscar('/manifest.webmanifest');
  if (m.status === 200) ok('/manifest.webmanifest → 200');
  else aviso(`/manifest.webmanifest → HTTP ${m.status} (PWA não publicado?)`);
  const sw = await buscar('/sw.js');
  if (sw.status !== 200) {
    aviso(`/sw.js → HTTP ${sw.status} (service worker não publicado?)`);
  } else {
    if ((sw.headers.get('cache-control') ?? '').includes('no-cache')) ok('/sw.js → 200 com Cache-Control no-cache');
    else aviso(`/sw.js sem no-cache (Cache-Control: ${sw.headers.get('cache-control')})`);
    // Sem isso o SW responde /__/auth/* com o index.html e o popup do Google mostra o 404 do app.
    if (sw.corpo.includes('/^\\/__\\//')) ok('/sw.js deixa /__/* (login do Firebase) ir para a rede');
    else falha('/sw.js responde /__/* com o index.html (navigateFallbackDenylist sem /^\\/__\\//)');
  }
});

await checar('login (Firebase)', async () => {
  const h = await buscar('/__/auth/handler');
  if (h.status === 200) ok('/__/auth/handler → 200 (proxy do Firebase no domínio do app)');
  else falha(`/__/auth/handler → HTTP ${h.status} (proxy /__/* para <projeto>.firebaseapp.com)`);
  // O SDK abre /__/auth/iframe num iframe do próprio app: DENY quebra o popup do Google.
  const xfo = (await buscar('/__/auth/iframe')).headers.get('x-frame-options') ?? '';
  if (xfo.toUpperCase() === 'DENY') falha('/__/auth/iframe com X-Frame-Options DENY (use SAMEORIGIN em /__/*)');
  else ok(`/__/auth/iframe pode abrir num iframe do app (X-Frame-Options: ${xfo || 'ausente'})`);
  const r = await fetch(`${base}/api/auth/sessao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({ idToken: 'invalido' }),
    signal: AbortSignal.timeout(20_000),
  });
  if (r.status === 401 || r.status === 400) ok(`POST /api/auth/sessao existe (token inválido → ${r.status})`);
  else falha(`POST /api/auth/sessao → HTTP ${r.status} (esperado 401 com token inválido)`);
});

await checar('desafio ativo', async () => {
  const r = await buscar('/api/desafios/atual');
  if (r.status !== 200) {
    falha(`/api/desafios/atual → HTTP ${r.status} (rode criar-desafio — docs/DEPLOY.md 9.2)`);
    return;
  }
  const d = JSON.parse(r.corpo);
  ok(
    `desafio ativo "${d.slug}": início ${d.dataInicio}, ${d.vagasDisponiveis}/${d.totalVagas} vagas, @${d.instagramHandle}`,
  );
  if (d.instagramHandle === 'everest_dev')
    falha('instagramHandle é o de desenvolvimento (everest_dev) — Q1');
});

console.log(
  `\n${falhas === 0 ? 'OK' : 'FALHOU'}: ${falhas} falha(s), ${avisos} aviso(s).` +
    ' Faça também as verificações manuais da seção 11.2 (cookie, foto, instalação no celular).\n',
);
process.exit(falhas === 0 ? 0 : 1);
