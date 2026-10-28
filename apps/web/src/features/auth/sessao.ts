import type { QueryClient } from '@tanstack/react-query';

/** Remove dados de uma sessão anterior (progresso, dias, ranking, admin), mantendo `me` e o desafio público. */
export function limparDadosDeSessaoAnterior(qc: QueryClient): void {
  qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' && q.queryKey[0] !== 'desafio' });
}

const ROTAS_DE_AUTENTICACAO = ['/login', '/cadastro'];

/**
 * Valida o `?volta=`: só caminhos internos ("/algo"), nunca "//host" ou "/\host"
 * (que o navegador trata como outro domínio), nem as próprias telas de login/cadastro.
 */
export function destinoSeguro(volta: string | null): string | null {
  if (!volta || !volta.startsWith('/')) return null;
  if (volta.startsWith('//') || volta.startsWith('/\\')) return null;
  const caminho = volta.split(/[?#]/)[0] ?? '';
  if (ROTAS_DE_AUTENTICACAO.includes(caminho)) return null;
  return volta;
}
