import { TIMEZONE_PADRAO } from '../constantes';
import { hojeNoFuso } from './diaAtual';

/** Idade mínima para participar (LGPD: menores exigem consentimento dos pais). */
export const IDADE_MINIMA = 18;

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;
export type Uf = (typeof UFS)[number];

const DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 'YYYY-MM-DD' que existe no calendário (rejeita 2026-02-30). */
export function ehDataValida(data: string): boolean {
  const m = DATA_ISO.exec(data);
  if (!m) return false;
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

/** Idade completa em `hoje` (ambos 'YYYY-MM-DD'). Aniversário no próprio dia já conta. */
export function idadeEm(dataNascimento: string, hoje: string): number {
  const [an, mn, dn] = dataNascimento.split('-').map(Number) as [number, number, number];
  const [ah, mh, dh] = hoje.split('-').map(Number) as [number, number, number];
  let idade = ah - an;
  if (mh < mn || (mh === mn && dh < dn)) idade -= 1;
  return idade;
}

/** Idade hoje no fuso do desafio. */
export function idadeHoje(dataNascimento: string, agora = new Date(), timezone = TIMEZONE_PADRAO): number {
  return idadeEm(dataNascimento, hojeNoFuso(agora, timezone));
}

/** "@Maria.Souza " -> "maria.souza". Não valida (o schema valida). */
export function normalizarInstagram(entrada: string): string {
  return entrada.trim().replace(/^@+/, '').toLowerCase();
}

/** Usuário do Instagram: 1–30 letras, números, "." ou "_"; sem ponto no início/fim nem "..". */
export function ehInstagramValido(usuario: string): boolean {
  return /^[a-z0-9._]{1,30}$/.test(usuario) && !usuario.startsWith('.') && !usuario.endsWith('.') && !usuario.includes('..');
}

/**
 * Celular/telefone brasileiro só com dígitos, sem o +55: "+55 (11) 98765-4321" -> "11987654321".
 * Devolve null se não for um número válido (DDD 11–99; celular com 11 dígitos começa com 9).
 */
export function normalizarTelefone(entrada: string): string | null {
  let digitos = entrada.replace(/\D/g, '');
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith('55')) digitos = digitos.slice(2);
  if (digitos.length !== 10 && digitos.length !== 11) return null;
  const ddd = Number(digitos.slice(0, 2));
  if (ddd < 11 || ddd > 99 || digitos[1] === '0') return null;
  if (digitos.length === 11 && digitos[2] !== '9') return null;
  return digitos;
}

/** Tem nome e sobrenome (2 palavras com 2+ letras cada no total). */
export function ehNomeCompleto(nome: string): boolean {
  return nome.trim().split(/\s+/).filter((p) => p.length > 0).length >= 2;
}
