import { z } from 'zod';
import {
  LIMITES,
  MIME_TYPES_FOTO,
  TAMANHO_MAX_FOTO_BYTES,
  TIPOS_FOTO,
} from './constantes';

const emailSchema = z
  .string({ error: 'Informe o e-mail.' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'E-mail inválido.' }).max(254, { error: 'E-mail longo demais.' }));

export const cadastroSchema = z.object({
  nome: z
    .string({ error: 'Informe o nome.' })
    .trim()
    .min(LIMITES.nomeMin, { error: `O nome precisa ter pelo menos ${LIMITES.nomeMin} letras.` })
    .max(LIMITES.nomeMax, { error: `O nome pode ter no máximo ${LIMITES.nomeMax} caracteres.` }),
  email: emailSchema,
  senha: z
    .string({ error: 'Informe a senha.' })
    .min(LIMITES.senhaMin, { error: `A senha precisa ter pelo menos ${LIMITES.senhaMin} caracteres.` })
    .max(LIMITES.senhaMax, { error: `A senha pode ter no máximo ${LIMITES.senhaMax} caracteres.` }),
  aceitouTermos: z.literal(true, { error: 'Você precisa aceitar a política de privacidade.' }),
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
