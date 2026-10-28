// Roda uma vez, depois que os webServers (API E2E + front) estão no ar:
// zera o banco E2E e o cache, cria o desafio ativo (começou há 3 dias) e o admin.
import { hojeNoFuso, somarDias } from '@everest/shared';
import { ADMIN, DATABASE_URL, DESAFIO, ENV_API, NOME_BANCO, REDIS_DB } from './ambiente';
import { binarioApi, psql, redisCli } from './infra';

export default function globalSetup(): void {
  if (!DATABASE_URL.includes(`/${NOME_BANCO}?`))
    throw new Error('global-setup: banco E2E inválido');

  psql(
    NOME_BANCO,
    'TRUNCATE TABLE "FotoProva", "DiaDesafio", "Participante", "Desafio", "Usuario" CASCADE',
  );

  // Cache de vagas e ranking (as filas do BullMQ ficam intactas).
  for (const padrao of ['vagas:*', 'ranking:*']) {
    redisCli(REDIS_DB, [
      'EVAL',
      "for _, k in ipairs(redis.call('KEYS', ARGV[1])) do redis.call('DEL', k) end return 1",
      '0',
      padrao,
    ]);
  }

  const env = { ...ENV_API };
  const dataInicio = somarDias(hojeNoFuso(new Date(), 'America/Sao_Paulo'), DESAFIO.inicioRelativo);
  binarioApi(
    'ts-node/dist/bin.js',
    [
      '-T',
      'scripts/criar-desafio.ts',
      '--slug',
      DESAFIO.slug,
      '--nome',
      DESAFIO.nome,
      '--dataInicio',
      dataInicio,
      '--handle',
      DESAFIO.handle,
      '--totalVagas',
      String(DESAFIO.totalVagas),
    ],
    env,
  );
  binarioApi(
    'ts-node/dist/bin.js',
    [
      '-T',
      'scripts/criar-admin.ts',
      '--nome',
      ADMIN.nome,
      '--email',
      ADMIN.email,
      '--senha',
      ADMIN.senha,
    ],
    env,
  );
}
