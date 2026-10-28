import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Carrega apps/api/.env (se existir) sem sobrescrever variáveis já definidas. */
export function carregarEnv(): void {
  const caminho = resolve(__dirname, '..', '.env');
  if (existsSync(caminho)) process.loadEnvFile(caminho);
}

/** Lê argumentos no formato `--chave valor` (ou `--flag` sozinho = "true"). */
export function lerArgs(argv = process.argv.slice(2)): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const atual = argv[i];
    if (!atual?.startsWith('--')) continue;
    const chave = atual.slice(2);
    const proximo = argv[i + 1];
    if (proximo === undefined || proximo.startsWith('--')) {
      args[chave] = 'true';
    } else {
      args[chave] = proximo;
      i++;
    }
  }
  return args;
}

export function sair(mensagem: string): never {
  console.error(`\n✖ ${mensagem}\n`);
  process.exit(1);
}
