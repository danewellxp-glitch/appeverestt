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
  feedbackTextoMin: 10,
  feedbackTextoMax: 1000,
  /** Limites do BR Code (Pix estático): nome do recebedor, cidade e txid. */
  pixNomeMax: 25,
  pixCidadeMax: 15,
  pixTxidMax: 25,
} as const;

export const TOTAL_DIAS_PADRAO = 30;

/**
 * Tolerância da virada do dia (X18): até 5 min depois da meia-noite, o dia que acabou ainda aceita
 * o check-in e as fotos que já estavam a caminho (rede lenta, upload grande). Depois disso, só hoje.
 */
export const TOLERANCIA_VIRADA_MS = 5 * 60 * 1000;
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
  /** 403: participante sem pagamento confirmado numa rota que exige o pagamento. */
  'PAGAMENTO_PENDENTE',
  /** 409: aviso de pagamento depois da confirmação. */
  'PAGAMENTO_JA_CONFIRMADO',
  /** 409: o admin tentou remover a inscrição do embaixador ou uma inscrição com check-ins. */
  'PARTICIPANTE_NAO_REMOVIVEL',
  /** 409: o admin tentou inscrever quem já está no desafio. */
  'JA_INSCRITO',
  /** 409: já existe um desafio com esse identificador (slug). */
  'DESAFIO_JA_EXISTE',
  /** 409: mudança que o desafio não aceita mais (ex.: data de início com check-ins, vagas abaixo das ocupadas). */
  'DESAFIO_NAO_EDITAVEL',
  /** 503: PIX_COPIA_E_COLA não configurado (só fora de produção). */
  'PAGAMENTO_INDISPONIVEL',
  /** 503: chaves VAPID do push não configuradas. */
  'PUSH_NAO_CONFIGURADO',
  'ERRO_INTERNO',
] as const;
export type CodigoErro = (typeof CODIGOS_ERRO)[number];

export interface ErroApi {
  codigo: CodigoErro;
  mensagem: string;
  campos?: Record<string, string>;
}
