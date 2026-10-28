// Utilitários de infraestrutura dos testes E2E (rodam no Node: webServer e global-setup).
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const DIR_API = resolve(RAIZ, 'apps', 'api');

/** Executa um comando (sem shell) e falha com a saída completa se o código de saída não for 0. */
export function executar(
  comando: string,
  args: readonly string[],
  opcoes: { cwd?: string; env?: Record<string, string> } = {},
): string {
  const r = spawnSync(comando, args, {
    cwd: opcoes.cwd ?? RAIZ,
    env: { ...process.env, ...opcoes.env },
    encoding: 'utf8',
  });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    throw new Error(`Falhou (${r.status}): ${comando} ${args.join(' ')}\n${r.stdout}\n${r.stderr}`);
  }
  return r.stdout;
}

/** psql dentro do container do Postgres (docker compose). */
export function psql(banco: string, sql: string): string {
  return executar('docker', [
    'compose',
    'exec',
    '-T',
    'postgres',
    'psql',
    '-U',
    'everest',
    '-d',
    banco,
    '-v',
    'ON_ERROR_STOP=1',
    '-tAc',
    sql,
  ]);
}

/** redis-cli dentro do container do Redis (docker compose). */
export function redisCli(db: number, args: readonly string[]): string {
  return executar('docker', [
    'compose',
    'exec',
    '-T',
    'redis',
    'redis-cli',
    '-n',
    String(db),
    ...args,
  ]);
}

/** Roda um binário JS do apps/api (prisma, ts-node, nest) com o Node atual, sem depender de shell. */
export function binarioApi(
  caminhoRelativo: string,
  args: readonly string[],
  env: Record<string, string>,
): string {
  return executar(process.execPath, [resolve(DIR_API, 'node_modules', caminhoRelativo), ...args], {
    cwd: DIR_API,
    env,
  });
}
