import { z } from 'zod';
import {
  TIMEZONE_PADRAO,
  LIMITES,
  MIME_TYPES_FOTO,
  TAMANHO_MAX_FOTO_BYTES,
  TIPOS_FOTO,
} from './constantes';
import { hojeNoFuso } from './regras/diaAtual';
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

export const atualizarDesafioSchema = z.object({
  inscricoesAbertas: z.boolean({ error: 'Informe se as inscrições estão abertas.' }),
});
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
  /** Opcional e separado do aceite: receber novidades e ofertas (marketing). */
  aceitouMarketing: z.boolean({ error: 'Valor inválido.' }).default(false),
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

/** Fila de conferência do embaixador (X8). */
export const conferenciaSchema = z.object({
  conferido: z.boolean({ error: 'Informe se o dia foi conferido.' }),
});
export type ConferenciaInput = z.infer<typeof conferenciaSchema>;
