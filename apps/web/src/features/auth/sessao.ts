import type { QueryClient } from '@tanstack/react-query';
import type { ParticipacaoResumo } from '@everest/shared';

/**
 * Para onde vai quem tem (ou não) uma vaga: sem vaga → capa; vaga com pagamento ainda não
 * confirmado (PENDENTE ou INFORMADO) → /pagamento; confirmado → /desafio.
 * Ponto único usado pelos guards, pela /bem-vindo, pelo pós-login, pela capa e pelo perfil.
 */
export function destinoDaParticipacao(
  participacao: Pick<ParticipacaoResumo, 'pagamentoStatus'> | null | undefined,
): '/' | '/pagamento' | '/desafio' {
  if (!participacao) return '/';
  return participacao.pagamentoStatus === 'CONFIRMADO' ? '/desafio' : '/pagamento';
}

/** Remove dados de uma sessão anterior (progresso, dias, ranking, admin), mantendo `me` e o desafio público. */
export function limparDadosDeSessaoAnterior(qc: QueryClient): void {
  qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' && q.queryKey[0] !== 'desafio' });
}

const ROTAS_DE_AUTENTICACAO = ['/login', '/cadastro', '/entrar', '/criar-conta', '/recuperar-senha', '/bem-vindo'];

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
