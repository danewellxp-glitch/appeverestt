// Sobe a API dos testes E2E (usado pelo `webServer` do playwright.config.ts).
// O Playwright inicia os webServers ANTES do globalSetup, então este script prepara o que a
// API precisa para dar boot: cria o banco E2E se faltar e aplica as migrations.
// As variáveis (DATABASE_URL, PORT, REDIS_URL...) chegam pelo `env` do webServer.
// Pré-requisito: apps/api/dist (pnpm --filter api build). Só compila se não existir.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const dirApi = resolve(raiz, 'apps', 'api');

function executar(comando, args, cwd) {
  const r = spawnSync(comando, args, { cwd, env: process.env, encoding: 'utf8' });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    throw new Error(`Falhou (${r.status}): ${comando} ${args.join(' ')}\n${r.stdout}\n${r.stderr}`);
  }
  return r.stdout;
}

const url = process.env.DATABASE_URL ?? '';
const banco = new URL(url).pathname.replace(/^\//, '');
if (!/_e2e$/.test(banco)) {
  throw new Error(
    `A API E2E só roda num banco *_e2e (recebeu "${banco}"). Nunca use o banco de desenvolvimento.`,
  );
}

const psql = (sql) =>
  executar(
    'docker',
    [
      'compose',
      'exec',
      '-T',
      'postgres',
      'psql',
      '-U',
      'everest',
      '-d',
      'everest',
      '-v',
      'ON_ERROR_STOP=1',
      '-tAc',
      sql,
    ],
    raiz,
  ).trim();

if (psql(`SELECT 1 FROM pg_database WHERE datname = '${banco}'`) !== '1') {
  psql(`CREATE DATABASE ${banco}`);
  console.log(`[e2e] banco ${banco} criado`);
}

executar(
  process.execPath,
  [resolve(dirApi, 'node_modules', 'prisma', 'build', 'index.js'), 'migrate', 'deploy'],
  dirApi,
);
console.log(`[e2e] migrations aplicadas em ${banco}`);

const main = resolve(dirApi, 'dist', 'main.js');
if (!existsSync(main)) {
  console.log('[e2e] apps/api/dist não existe; compilando a API (nest build)…');
  executar(
    process.execPath,
    [resolve(dirApi, 'node_modules', '@nestjs', 'cli', 'bin', 'nest.js'), 'build'],
    dirApi,
  );
}

// Mesmo cwd do `node dist/main` de produção. O apps/api/.env também é lido pelo
// @nestjs/config, mas não sobrescreve as variáveis já definidas pelo webServer.
process.chdir(dirApi);
await import(pathToFileURL(main).href);
