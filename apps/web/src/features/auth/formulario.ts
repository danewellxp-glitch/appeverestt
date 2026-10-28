import { ehApiError } from '../../lib/api';
import { MENSAGENS_ERRO } from '../../lib/erros';

export type ErrosCampos<C extends string> = Partial<Record<C, string>>;

interface IssueSimples {
  readonly path: readonly PropertyKey[];
  readonly message: string;
}

/** Converte as `issues` do zod em { campo: primeira mensagem }. */
export function errosDasIssues<C extends string>(
  issues: readonly IssueSimples[],
  campos: readonly C[],
): ErrosCampos<C> {
  const erros: ErrosCampos<C> = {};
  for (const issue of issues) {
    const chave = issue.path[0];
    const campo = campos.find((c) => c === chave);
    if (campo && erros[campo] === undefined) erros[campo] = issue.message;
  }
  return erros;
}

/** Erros por campo vindos da API (ApiError.campos, em VALIDACAO). */
export function errosDoServidor<C extends string>(erro: unknown, campos: readonly C[]): ErrosCampos<C> {
  if (!ehApiError(erro)) return {};
  const erros: ErrosCampos<C> = {};
  for (const campo of campos) {
    const mensagem = erro.campos[campo];
    if (mensagem) erros[campo] = mensagem;
  }
  return erros;
}

/** Mensagem geral (pt-BR) para um erro qualquer de mutação. */
export function mensagemGeral(erro: unknown): string {
  return ehApiError(erro) ? erro.message : MENSAGENS_ERRO.ERRO_INTERNO;
}
