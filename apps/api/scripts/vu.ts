// Simulador de usuários virtuais (VUs) no desafio de TESTE. Guia: docs/VU.md
//
// Uso (no container da API ou do serviço "vu"):
//   node dist/cli/scripts/vu.js preparar --desafio teste-vu --quantidade 30
//   node dist/cli/scripts/vu.js rodada   --desafio teste-vu [--intervalo 15] [--periodo corrida]
//   node dist/cli/scripts/vu.js loop     --desafio teste-vu --intervalo 15
//   node dist/cli/scripts/vu.js status   --desafio teste-vu
//   node dist/cli/scripts/vu.js limpar   --desafio teste-vu [--remover-desafio]
// Em todos: --forcar libera slugs que não começam com "teste" (cuidado).
//
// Env: DATABASE_URL, REDIS_URL, FIREBASE_PROJECT_ID, FIREBASE_SERVICE_ACCOUNT_BASE64, S3_* (limpar),
//      VU_BASE_URL (padrão https://everestt.app.br), VU_FIREBASE_API_KEY (chave PÚBLICA do app web;
//      só preparar/rodada), VU_MAX_RPM (padrão 40 req/min).
import { carregarEnv, lerArgs, sair } from './_util';
import { INTERVALO_PADRAO_MIN, QUANTIDADE_MAX, slugPermitido } from './vu/config';
import { criarContexto, fecharContexto } from './vu/contexto';
import { limpar } from './vu/limpar';
import { preparar } from './vu/preparar';
import type { Periodo } from './vu/personas';
import { loop, rodada } from './vu/rodada';
import { status } from './vu/status';

carregarEnv();

const COMANDOS = ['preparar', 'rodada', 'loop', 'status', 'limpar'] as const;
type Comando = (typeof COMANDOS)[number];

const USO = `Uso: node dist/cli/scripts/vu.js <comando> --desafio <slug> [opções]
  preparar --quantidade 30     cria/inscreve os VUs (idempotente)
  rodada [--intervalo 15]      um "tique" da simulação
         [--periodo corrida]   força o período (madrugada|manha|tarde|noite|corrida) em vez do relógio
  loop --intervalo 15          uma rodada a cada N minutos, para sempre
  status                       resumo (personas, pagamento, check-ins de hoje)
  limpar [--remover-desafio]   apaga tudo dos VUs (e o desafio de teste)
  --forcar                     aceita slug que não começa com "teste"`;

function inteiro(
  valor: string | undefined,
  nome: string,
  padrao: number,
  min: number,
  max: number,
): number {
  if (valor === undefined) return padrao;
  const n = Number(valor);
  if (!Number.isInteger(n) || n < min || n > max)
    sair(`--${nome} deve ser um inteiro entre ${min} e ${max}.`);
  return n;
}

const PERIODOS_ARG = {
  madrugada: 'MADRUGADA',
  manha: 'MANHA',
  tarde: 'TARDE',
  noite: 'NOITE',
  corrida: 'CORRIDA',
} as const;

/** --periodo (só na rodada avulsa): útil para testar fotos/água sem esperar o horário certo. */
function periodoForcado(valor: string | undefined): Periodo | undefined {
  if (valor === undefined) return undefined;
  const periodo = (PERIODOS_ARG as Record<string, Periodo>)[valor.toLowerCase()];
  if (!periodo) sair(`--periodo deve ser um de: ${Object.keys(PERIODOS_ARG).join(', ')}.`);
  return periodo;
}

async function main(): Promise<void> {
  const [comandoBruto, ...resto] = process.argv.slice(2);
  if (!comandoBruto || !(COMANDOS as readonly string[]).includes(comandoBruto)) sair(USO);
  const comando = comandoBruto as Comando;
  const args = lerArgs(resto);

  const slug = args.desafio;
  if (!slug || slug === 'true' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    sair(`Informe --desafio <slug> (kebab-case).\n\n${USO}`);
  }
  if (!slugPermitido(slug, args.forcar === 'true')) {
    sair(
      `Recusado: o slug "${slug}" não começa com "teste". O simulador é só para o desafio de teste (--forcar para ignorar).`,
    );
  }

  const ctx = criarContexto();
  try {
    switch (comando) {
      case 'preparar':
        await preparar(ctx, {
          slug,
          quantidade: inteiro(args.quantidade, 'quantidade', 30, 1, QUANTIDADE_MAX),
        });
        break;
      case 'rodada':
        await rodada(ctx, {
          slug,
          intervaloMin: inteiro(args.intervalo, 'intervalo', INTERVALO_PADRAO_MIN, 1, 240),
          periodo: periodoForcado(args.periodo),
        });
        break;
      case 'loop':
        await loop(ctx, {
          slug,
          intervaloMin: inteiro(args.intervalo, 'intervalo', INTERVALO_PADRAO_MIN, 1, 240),
        });
        break;
      case 'status':
        await status(ctx, slug);
        break;
      case 'limpar':
        await limpar(ctx, { slug, removerDesafio: args['remover-desafio'] === 'true' });
        break;
    }
  } finally {
    await fecharContexto(ctx);
  }
}

main().catch((e: unknown) => sair(e instanceof Error ? e.message : String(e)));
