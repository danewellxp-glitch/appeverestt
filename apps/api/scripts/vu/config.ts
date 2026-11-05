// Constantes e configuração do simulador de usuários virtuais (VUs). Sem efeitos colaterais.

/** Todo VU tem e-mail neste domínio (sem MX: nenhum e-mail é entregue). */
export const DOMINIO_VU = 'vu.everestt.app.br';
const REGEX_EMAIL_VU = /^vu-(\d{2,4})@vu\.everestt\.app\.br$/;

/** Prefixo das chaves do simulador no Redis (sessões, trava da rodada, última rodada). */
export const PREFIXO_REDIS = 'everest-vu:';
export const CHAVE_TRAVA_RODADA = `${PREFIXO_REDIS}trava-rodada`;
export const CHAVE_ULTIMA_RODADA = `${PREFIXO_REDIS}ultima-rodada`;
export const chaveSessao = (email: string): string => `${PREFIXO_REDIS}sessao:${email}`;

export const QUANTIDADE_MAX = 200;
/** O e-mail tem de 2 a 4 dígitos (vu-01 … vu-9999). */
export const NUMERO_MAX_VU = 9999;
export const INTERVALO_PADRAO_MIN = 15;

export function emailDoVu(numero: number): string {
  if (!Number.isInteger(numero) || numero < 1 || numero > NUMERO_MAX_VU) {
    throw new Error(`Número de VU inválido: ${numero}`);
  }
  return `vu-${String(numero).padStart(2, '0')}@${DOMINIO_VU}`;
}

/** Número do VU a partir do e-mail; null se o e-mail não for de um VU. */
export function numeroDoEmail(email: string): number | null {
  const m = REGEX_EMAIL_VU.exec(email.trim().toLowerCase());
  return m ? Number(m[1]) : null;
}

export function ehEmailVu(email: string): boolean {
  return numeroDoEmail(email) !== null;
}

/** "07" (2 dígitos até 99). */
export function rotuloVu(numero: number): string {
  return String(numero).padStart(2, '0');
}

/** Trava de segurança: só desafios cujo slug começa com "teste" (a menos que --forcar). */
export function slugPermitido(slug: string, forcar: boolean): boolean {
  return forcar || slug.startsWith('teste');
}

export interface ConfigVu {
  /** Base pública do app (a API fica em `${baseUrl}/api`). */
  baseUrl: string;
  /** Chave PÚBLICA do app web no Firebase (necessária só para logar VUs). */
  apiKey: string | null;
  /** Teto de requisições por minuto à API (todos os VUs saem do mesmo IP). */
  maxRpm: number;
  /** host:porta do emulador do Firebase Auth (só desenvolvimento). */
  emulador: string | null;
}

function numeroEnv(valor: string | undefined, padrao: number, min: number, max: number): number {
  if (valor === undefined || valor.trim() === '') return padrao;
  const n = Number(valor);
  if (!Number.isFinite(n)) return padrao;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function lerConfig(env: NodeJS.ProcessEnv = process.env): ConfigVu {
  const base = (env.VU_BASE_URL?.trim() || 'https://everestt.app.br').replace(/\/+$/, '');
  if (!/^https?:\/\/[^/\s]+(\/[^\s]*)?$/.test(base)) {
    throw new Error(`VU_BASE_URL inválida: ${base}`);
  }
  return {
    baseUrl: base,
    apiKey: env.VU_FIREBASE_API_KEY?.trim() || null,
    // A API limita 100 req/min por IP (e 10/min na troca de sessão): 40 deixa folga.
    maxRpm: numeroEnv(env.VU_MAX_RPM, 40, 5, 90),
    emulador: env.FIREBASE_AUTH_EMULATOR_HOST?.trim() || null,
  };
}
