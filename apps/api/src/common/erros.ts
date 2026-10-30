import { HttpException, HttpStatus } from '@nestjs/common';
import type { CodigoErro, ErroApi } from '@everest/shared';

const STATUS_PADRAO: Record<CodigoErro, HttpStatus> = {
  VALIDACAO: HttpStatus.BAD_REQUEST,
  NAO_AUTENTICADO: HttpStatus.UNAUTHORIZED,
  PROIBIDO: HttpStatus.FORBIDDEN,
  NAO_ENCONTRADO: HttpStatus.NOT_FOUND,
  EMAIL_EM_USO: HttpStatus.CONFLICT,
  CREDENCIAIS_INVALIDAS: HttpStatus.UNAUTHORIZED,
  VAGAS_ESGOTADAS: HttpStatus.CONFLICT,
  INSCRICOES_FECHADAS: HttpStatus.CONFLICT,
  NAO_INSCRITO: HttpStatus.FORBIDDEN,
  DESAFIO_NAO_INICIADO: HttpStatus.CONFLICT,
  DESAFIO_ENCERRADO: HttpStatus.CONFLICT,
  DIA_NAO_EDITAVEL: HttpStatus.CONFLICT,
  FOTO_INVALIDA: HttpStatus.UNPROCESSABLE_ENTITY,
  FOTO_GRANDE_DEMAIS: HttpStatus.PAYLOAD_TOO_LARGE,
  MUITAS_REQUISICOES: HttpStatus.TOO_MANY_REQUESTS,
  PERFIL_INCOMPLETO: HttpStatus.FORBIDDEN,
  ERRO_INTERNO: HttpStatus.INTERNAL_SERVER_ERROR,
};

export const MENSAGENS_PADRAO: Record<CodigoErro, string> = {
  VALIDACAO: 'Confira os dados enviados.',
  NAO_AUTENTICADO: 'Faça login para continuar.',
  PROIBIDO: 'Você não tem permissão para isso.',
  NAO_ENCONTRADO: 'Não encontrado.',
  EMAIL_EM_USO: 'Este e-mail já está cadastrado.',
  CREDENCIAIS_INVALIDAS: 'E-mail ou senha incorretos.',
  VAGAS_ESGOTADAS: 'As vagas do desafio se esgotaram.',
  INSCRICOES_FECHADAS: 'As inscrições estão fechadas.',
  NAO_INSCRITO: 'Você não está inscrito neste desafio.',
  DESAFIO_NAO_INICIADO: 'O desafio ainda não começou.',
  DESAFIO_ENCERRADO: 'O desafio já terminou.',
  DIA_NAO_EDITAVEL: 'Este dia não pode mais ser editado.',
  FOTO_INVALIDA: 'A foto enviada é inválida.',
  FOTO_GRANDE_DEMAIS: 'A foto é grande demais (máximo 5 MB).',
  MUITAS_REQUISICOES: 'Muitas tentativas. Aguarde um pouco e tente de novo.',
  PERFIL_INCOMPLETO: 'Complete seu cadastro para garantir a vaga.',
  ERRO_INTERNO: 'Algo deu errado. Tente novamente.',
};

/** Erro de domínio sempre no formato { codigo, mensagem }. */
export class ErroApp extends HttpException {
  constructor(codigo: CodigoErro, mensagem?: string, campos?: Record<string, string>, status?: HttpStatus) {
    const corpo: ErroApi = { codigo, mensagem: mensagem ?? MENSAGENS_PADRAO[codigo] };
    if (campos) corpo.campos = campos;
    super(corpo, status ?? STATUS_PADRAO[codigo]);
  }
}
