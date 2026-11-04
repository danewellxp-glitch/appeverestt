import { z } from 'zod';
import {
  TIMEZONE_PADRAO,
  TOTAL_DIAS_PADRAO,
  LIMITES,
  MIME_TYPES_FOTO,
  TAMANHO_MAX_FOTO_BYTES,
  TIPOS_FOTO,
} from './constantes';
import { ACOES_RAPIDAS } from './regras/acaoRapida';
import { hojeNoFuso } from './regras/diaAtual';
import { LIMITES_AVISO_PUSH, MODELOS_AVISO_PUSH } from './regras/push';
import {
  IDADE_MINIMA,
  UFS,
  ehDataValida,
  ehInstagramValido,
  ehNomeCompleto,
  idadeEm,
  normalizarInstagram,
  normalizarTelefone,
} from './regras/perfil';

const emailSchema = z
  .string({ error: 'Informe o e-mail.' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'E-mail inválido.' }).max(254, { error: 'E-mail longo demais.' }));

const nomeSchema = z
  .string({ error: 'Informe o nome.' })
  .trim()
  .min(LIMITES.nomeMin, { error: `O nome precisa ter pelo menos ${LIMITES.nomeMin} letras.` })
  .max(LIMITES.nomeMax, { error: `O nome pode ter no máximo ${LIMITES.nomeMax} caracteres.` });

const senhaNovaSchema = z
  .string({ error: 'Informe a senha.' })
  .min(LIMITES.senhaMin, { error: `Use pelo menos ${LIMITES.senhaMin} caracteres.` })
  .max(LIMITES.senhaMax, { error: `A senha pode ter no máximo ${LIMITES.senhaMax} caracteres.` });

const aceiteSchema = z.literal(true, { error: 'Aceite a política de privacidade para continuar.' });

export const cadastroSchema = z.object({
  nome: nomeSchema,
  email: emailSchema,
  senha: senhaNovaSchema,
  aceitouTermos: aceiteSchema,
});
export type CadastroInput = z.infer<typeof cadastroSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  senha: z
    .string({ error: 'Informe a senha.' })
    .min(1, { error: 'Informe a senha.' })
    .max(LIMITES.senhaMax, { error: 'Senha inválida.' }),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const checkinSchema = z.object({
  aguaMl: z
    .number({ error: 'Água inválida.' })
    .int({ error: 'Água inválida.' })
    .min(0, { error: 'Água não pode ser negativa.' })
    .max(LIMITES.aguaMlMax, { error: `Máximo de ${LIMITES.aguaMlMax} ml.` }),
  exercicio: z.boolean({ error: 'Exercício inválido.' }),
  paginasLidas: z
    .number({ error: 'Páginas inválidas.' })
    .int({ error: 'Páginas inválidas.' })
    .min(0, { error: 'Páginas não podem ser negativas.' })
    .max(LIMITES.paginasMax, { error: `Máximo de ${LIMITES.paginasMax} páginas.` }),
  storyPostado: z.boolean({ error: 'Story inválido.' }),
});
export type CheckinInput = z.infer<typeof checkinSchema>;

export const tipoFotoSchema = z.enum(TIPOS_FOTO, { error: 'Tipo de foto inválido.' });

export const uploadUrlSchema = z.object({
  tipo: tipoFotoSchema,
  mimeType: z.enum(MIME_TYPES_FOTO, { error: 'Formato não suportado. Use JPG, PNG ou WEBP.' }),
  tamanhoBytes: z
    .number({ error: 'Tamanho inválido.' })
    .int({ error: 'Tamanho inválido.' })
    .positive({ error: 'Arquivo vazio.' })
    .max(TAMANHO_MAX_FOTO_BYTES, { error: 'A foto pode ter no máximo 5 MB.' }),
});
export type UploadUrlInput = z.infer<typeof uploadUrlSchema>;

export const invalidacaoSchema = z
  .object({
    invalidado: z.boolean({ error: 'Informe se o dia está invalidado.' }),
    motivo: z
      .string()
      .trim()
      .max(LIMITES.motivoInvalidacaoMax, {
        error: `O motivo pode ter no máximo ${LIMITES.motivoInvalidacaoMax} caracteres.`,
      })
      .optional(),
  })
  .refine((v) => !v.invalidado || (v.motivo !== undefined && v.motivo.length > 0), {
    error: 'Informe o motivo da invalidação.',
    path: ['motivo'],
  });
export type InvalidacaoInput = z.infer<typeof invalidacaoSchema>;

/** Identificador do desafio na URL (ex.: desafio-30-everest). Não muda depois de criado. */
export const slugDesafioSchema = z
  .string({ error: 'Informe o identificador do desafio.' })
  .trim()
  .toLowerCase()
  .min(3, { error: 'Use pelo menos 3 caracteres.' })
  .max(60, { error: 'Use no máximo 60 caracteres.' })
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: 'Use só letras minúsculas, números e hífen (ex.: desafio-30-everest).' });

/** Campos editáveis do desafio pelo painel do admin (criar e atualizar). */
const camposDesafio = {
  nome: z
    .string({ error: 'Informe o nome do desafio.' })
    .trim()
    .min(3, { error: 'Nome muito curto.' })
    .max(80, { error: 'Use no máximo 80 caracteres.' }),
  /** 'YYYY-MM-DD', no fuso do desafio. */
  dataInicio: z
    .string({ error: 'Informe a data de início.' })
    .trim()
    .refine(ehDataValida, { error: 'Data de início inválida.' }),
  totalDias: z
    .number({ error: 'Informe o total de dias.' })
    .int({ error: 'Use um número inteiro de dias.' })
    .min(1, { error: 'Pelo menos 1 dia.' })
    .max(365, { error: 'No máximo 365 dias.' }),
  totalVagas: z
    .number({ error: 'Informe o número de vagas.' })
    .int({ error: 'Use um número inteiro de vagas.' })
    .min(1, { error: 'Pelo menos 1 vaga.' })
    .max(10000, { error: 'No máximo 10.000 vagas.' }),
  /** Sem "@". */
  instagramHandle: z
    .string({ error: 'Informe o @ do Instagram do desafio.' })
    .transform(normalizarInstagram)
    .refine((v) => v.length > 0, { error: 'Informe o @ do Instagram do desafio.' })
    .refine(ehInstagramValido, { error: '@ inválido. Use letras, números, "." ou "_".' }),
  /** Sem "#". */
  hashtag: z
    .string({ error: 'Informe a hashtag.' })
    .trim()
    .transform((v) => v.replace(/^#+/, ''))
    .refine((v) => /^[A-Za-z0-9_]{1,50}$/.test(v), { error: 'Hashtag inválida. Use letras, números ou "_".' }),
  inscricoesAbertas: z.boolean({ error: 'Informe se as inscrições estão abertas.' }),
  embaixadorOcupaVaga: z.boolean({ error: 'Informe se o embaixador ocupa uma vaga.' }),
};

/**
 * POST /admin/desafios: o admin cria um desafio pelo painel.
 * `ativar` = vira o desafio do app (só um ativo por vez; os outros são desativados). Padrão `false`:
 * criar sem dizer nada nunca derruba o desafio em andamento (o painel sempre manda o valor).
 */
export const criarDesafioSchema = z.object({
  slug: slugDesafioSchema,
  ...camposDesafio,
  totalDias: camposDesafio.totalDias.default(TOTAL_DIAS_PADRAO),
  totalVagas: camposDesafio.totalVagas.default(50),
  hashtag: camposDesafio.hashtag.default('DESAFIO30EVEREST'),
  inscricoesAbertas: camposDesafio.inscricoesAbertas.default(true),
  embaixadorOcupaVaga: camposDesafio.embaixadorOcupaVaga.default(true),
  ativar: z.boolean({ error: 'Informe se o desafio fica ativo.' }).default(false),
});
export type CriarDesafioInput = z.infer<typeof criarDesafioSchema>;
/** Formato aceito na entrada (campos com padrão são opcionais). */
export type CriarDesafioForm = z.input<typeof criarDesafioSchema>;

/**
 * PATCH /admin/desafios/:slug: muda qualquer campo (pelo menos um).
 * `dataInicio` e `totalDias` só mudam enquanto não houver check-in; `totalVagas` não pode ficar
 * abaixo das vagas já ocupadas; `ativo: true` desativa os outros desafios.
 */
export const atualizarDesafioSchema = z
  .object({ ...camposDesafio, ativo: z.boolean({ error: 'Informe se o desafio fica ativo.' }) })
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), { error: 'Nada para atualizar.' });
export type AtualizarDesafioInput = z.infer<typeof atualizarDesafioSchema>;

export const numeroDiaSchema = z.coerce
  .number({ error: 'Dia inválido.' })
  .int({ error: 'Dia inválido.' })
  .min(1, { error: 'Dia inválido.' })
  .max(365, { error: 'Dia inválido.' });

/** Troca do idToken do Firebase pela sessão (cookie) da API. */
export const sessaoSchema = z.object({
  idToken: z
    .string({ error: 'Token ausente.' })
    .min(1, { error: 'Token ausente.' })
    .max(4096, { error: 'Token inválido.' }),
});
export type SessaoInput = z.infer<typeof sessaoSchema>;

const localSchema = (rotulo: string) =>
  z
    .string({ error: `Informe ${rotulo}.` })
    .trim()
    .min(LIMITES.localMin, { error: `Informe ${rotulo}.` })
    .max(LIMITES.localMax, { error: `Use no máximo ${LIMITES.localMax} caracteres.` });

/**
 * PATCH /me: completa o perfil (Q7). Todos os dados são obrigatórios para garantir a vaga;
 * o consentimento de marketing é separado e opcional (X9).
 */
export const atualizarPerfilSchema = z.object({
  nome: nomeSchema.refine(ehNomeCompleto, { error: 'Informe nome e sobrenome.' }),
  instagram: z
    .string({ error: 'Informe seu @ do Instagram.' })
    .transform(normalizarInstagram)
    .refine((v) => v.length > 0, { error: 'Informe seu @ do Instagram.' })
    .refine(ehInstagramValido, { error: '@ inválido. Use letras, números, "." ou "_".' }),
  dataNascimento: z
    .string({ error: 'Informe a data de nascimento.' })
    .trim()
    .refine(ehDataValida, { error: 'Data de nascimento inválida.' })
    .refine((v) => idadeEm(v, hojeNoFuso(new Date(), TIMEZONE_PADRAO)) >= IDADE_MINIMA, {
      error: `O desafio é para maiores de ${IDADE_MINIMA} anos.`,
    })
    .refine((v) => idadeEm(v, hojeNoFuso(new Date(), TIMEZONE_PADRAO)) <= 120, {
      error: 'Data de nascimento inválida.',
    }),
  whatsapp: z
    .string({ error: 'Informe seu WhatsApp com DDD.' })
    .transform((v, ctx) => {
      const n = normalizarTelefone(v);
      if (n === null) {
        ctx.addIssue({ code: 'custom', message: 'WhatsApp inválido. Use DDD + número.' });
        return z.NEVER;
      }
      return n;
    }),
  bairro: localSchema('o bairro'),
  cidade: localSchema('a cidade'),
  uf: z
    .string({ error: 'Escolha o estado.' })
    .trim()
    .toUpperCase()
    .pipe(z.enum(UFS, { error: 'Escolha o estado.' })),
  aceitouTermos: aceiteSchema,
  /**
   * Opcional e separado do aceite: receber novidades e ofertas (marketing).
   * true = consente; false = revoga; omitido = mantém como está (nunca revoga sem querer).
   */
  aceitouMarketing: z.boolean({ error: 'Valor inválido.' }).optional(),
});
export type AtualizarPerfilInput = z.infer<typeof atualizarPerfilSchema>;

/** Validação local antes de chamar o Firebase (tela /entrar). */
export const entrarSchema = z.object({
  email: emailSchema,
  senha: senhaNovaSchema,
});
export type EntrarInput = z.infer<typeof entrarSchema>;

/** Validação local antes de chamar o Firebase (tela /criar-conta). */
export const criarContaSchema = z.object({
  nome: nomeSchema,
  email: emailSchema,
  senha: senhaNovaSchema,
  aceitouTermos: aceiteSchema,
});
export type CriarContaInput = z.infer<typeof criarContaSchema>;

const textoFeedback = (rotulo: string) =>
  z
    .string({ error: `Conte ${rotulo}.` })
    .trim()
    .min(LIMITES.feedbackTextoMin, { error: `Escreva pelo menos ${LIMITES.feedbackTextoMin} caracteres.` })
    .max(LIMITES.feedbackTextoMax, { error: `Use no máximo ${LIMITES.feedbackTextoMax} caracteres.` });

/** Feedback do participante (X13): nota de 1 a 5, dois textos e a autorização de divulgação. */
export const feedbackSchema = z.object({
  nota: z
    .number({ error: 'Dê uma nota de 1 a 5.' })
    .int({ error: 'Dê uma nota de 1 a 5.' })
    .min(1, { error: 'Dê uma nota de 1 a 5.' })
    .max(5, { error: 'Dê uma nota de 1 a 5.' }),
  oQueAchou: textoFeedback('o que você achou do desafio'),
  oQueMudou: textoFeedback('o que mudou para você nestes 30 dias'),
  autorizaDivulgacao: z.boolean({ error: 'Valor inválido.' }),
});
export type FeedbackInput = z.infer<typeof feedbackSchema>;

/** Conferência manual do Pix pelo embaixador (X12): confirma ou volta para pendente. */
export const pagamentoAdminSchema = z.object({
  status: z.enum(['CONFIRMADO', 'PENDENTE'], { error: 'Status inválido.' }),
});
export type PagamentoAdminInput = z.infer<typeof pagamentoAdminSchema>;

/** Fila de conferência do embaixador (X8). */
export const conferenciaSchema = z.object({
  conferido: z.boolean({ error: 'Informe se o dia foi conferido.' }),
});
export type ConferenciaInput = z.infer<typeof conferenciaSchema>;

/**
 * POST /admin/desafios/:slug/participantes: o admin inscreve quem JÁ TEM CONTA no app (pelo e-mail).
 * Pega a menor vaga livre, como na inscrição normal. Padrão: pagamento já confirmado (ex.: pagou direto ao TT).
 */
export const adicionarParticipanteSchema = z.object({
  email: emailSchema,
  pagamentoStatus: z
    .enum(['PENDENTE', 'INFORMADO', 'CONFIRMADO'], { error: 'Status de pagamento inválido.' })
    .default('CONFIRMADO'),
});
export type AdicionarParticipanteInput = z.infer<typeof adicionarParticipanteSchema>;

// ---------- R22: push ----------

export const acaoRapidaSchema = z.enum(ACOES_RAPIDAS, { error: 'Ação inválida.' });

export const pushInscricaoSchema = z.object({
  endpoint: z.url({ error: 'Endereço de inscrição inválido.' }).max(2048),
  chaves: z.object({
    p256dh: z.string().min(1).max(256),
    auth: z.string().min(1).max(256),
  }),
  userAgent: z.string().max(512).optional(),
});
export type PushInscricaoInput = z.infer<typeof pushInscricaoSchema>;

export const pushEndpointSchema = z.object({ endpoint: z.url().max(2048) });

const { tituloMax, corpoMax } = LIMITES_AVISO_PUSH;

export const avisoPushSchema = z
  .object({
    modelo: z.enum(MODELOS_AVISO_PUSH, { error: 'Modelo de aviso inválido.' }),
    titulo: z.string().trim().max(tituloMax, { error: `Até ${tituloMax} caracteres.` }).optional(),
    corpo: z.string().trim().max(corpoMax, { error: `Até ${corpoMax} caracteres.` }).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.modelo !== 'livre') return;
    if (!v.titulo) ctx.addIssue({ code: 'custom', path: ['titulo'], message: 'Escreva o título.' });
    if (!v.corpo) ctx.addIssue({ code: 'custom', path: ['corpo'], message: 'Escreva a mensagem.' });
  });
export type AvisoPushInput = z.infer<typeof avisoPushSchema>;
