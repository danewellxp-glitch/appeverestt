import type { CodigoErro } from '@everest/shared';

/** Mensagens amigáveis (pt-BR) por código de erro da API. */
export const MENSAGENS_ERRO: Record<CodigoErro | 'REDE', string> = {
  VALIDACAO: 'Confira os dados informados.',
  NAO_AUTENTICADO: 'Faça login para continuar.',
  PROIBIDO: 'Você não tem permissão para fazer isso.',
  NAO_ENCONTRADO: 'Não encontramos o que você procurou.',
  EMAIL_EM_USO: 'Este e-mail já tem cadastro. Faça login.',
  CREDENCIAIS_INVALIDAS: 'E-mail ou senha incorretos.',
  VAGAS_ESGOTADAS: 'As vagas acabaram. Que pena! Fique de olho no próximo desafio.',
  INSCRICOES_FECHADAS: 'As inscrições estão fechadas.',
  NAO_INSCRITO: 'Você ainda não está inscrito no desafio.',
  DESAFIO_NAO_INICIADO: 'O desafio ainda não começou.',
  DESAFIO_ENCERRADO: 'O desafio já terminou.',
  DIA_NAO_EDITAVEL: 'Este dia não pode mais ser editado.',
  FOTO_INVALIDA: 'Não conseguimos usar essa foto. Tente outra.',
  FOTO_GRANDE_DEMAIS: 'A foto é grande demais (máximo 5 MB).',
  MUITAS_REQUISICOES: 'Muitas tentativas seguidas. Espere um minuto e tente de novo.',
  ERRO_INTERNO: 'Algo deu errado do nosso lado. Tente novamente.',
  REDE: 'Sem conexão. Verifique sua internet.',
};

/**
 * Mensagem para o usuário. Para VALIDACAO e erros de regra, a mensagem do servidor
 * já é específica (pt-BR); nos demais casos usamos a mensagem amigável padrão.
 */
export function mensagemDoErro(codigo: CodigoErro | 'REDE', doServidor?: string): string {
  const usarServidor: (CodigoErro | 'REDE')[] = [
    'VALIDACAO',
    'DIA_NAO_EDITAVEL',
    'FOTO_INVALIDA',
    'NAO_ENCONTRADO',
  ];
  if (doServidor && usarServidor.includes(codigo)) return doServidor;
  return MENSAGENS_ERRO[codigo];
}
