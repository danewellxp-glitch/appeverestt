export const METAS = { aguaMl: 3000, paginas: 10, fotos: 3 } as const;

export const TIPOS_FOTO = ['AGUA', 'EXERCICIO', 'LEITURA'] as const;
export type TipoFoto = (typeof TIPOS_FOTO)[number];

export const REQUISITOS = ['AGUA', 'EXERCICIO', 'LEITURA', 'FOTOS', 'STORY'] as const;
export type Requisito = (typeof REQUISITOS)[number];

export const MIME_TYPES_FOTO = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type MimeTypeFoto = (typeof MIME_TYPES_FOTO)[number];

/** Tamanho máximo do arquivo enviado ao storage (5 MB). */
export const TAMANHO_MAX_FOTO_BYTES = 5 * 1024 * 1024;

export const LIMITES = {
  aguaMlMax: 20000,
  paginasMax: 2000,
  nomeMin: 2,
  nomeMax: 80,
  senhaMin: 8,
  senhaMax: 72,
  motivoInvalidacaoMax: 500,
  localMin: 2,
  localMax: 80,
} as const;

export const TOTAL_DIAS_PADRAO = 30;
export const TIMEZONE_PADRAO = 'America/Sao_Paulo';

export const CODIGOS_ERRO = [
  'VALIDACAO',
  'NAO_AUTENTICADO',
  'PROIBIDO',
  'NAO_ENCONTRADO',
  'EMAIL_EM_USO',
  'CREDENCIAIS_INVALIDAS',
  'VAGAS_ESGOTADAS',
  'INSCRICOES_FECHADAS',
  'NAO_INSCRITO',
  'DESAFIO_NAO_INICIADO',
  'DESAFIO_ENCERRADO',
  'DIA_NAO_EDITAVEL',
  'FOTO_INVALIDA',
  'FOTO_GRANDE_DEMAIS',
  'MUITAS_REQUISICOES',
  'PERFIL_INCOMPLETO',
  'ERRO_INTERNO',
] as const;
export type CodigoErro = (typeof CODIGOS_ERRO)[number];

export interface ErroApi {
  codigo: CodigoErro;
  mensagem: string;
  campos?: Record<string, string>;
}
