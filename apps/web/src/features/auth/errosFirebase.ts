import { ehApiError } from '../../lib/api';
import { MENSAGENS_ERRO } from '../../lib/erros';

export type CampoAuth = 'email' | 'senha';

export interface ErroAuthTraduzido {
  /** null = silencioso (a pessoa fechou o popup). */
  mensagem: string | null;
  /** Campo do formulário em que o erro aparece; sem campo = alerta geral. */
  campo?: CampoAuth;
  /** Mostra o link "Entrar" junto (e-mail já tem conta). */
  linkEntrar?: boolean;
}

/** Código de erro do Firebase (`auth/...`), sem depender da classe FirebaseError no bundle. */
export function codigoFirebase(e: unknown): string | null {
  if (typeof e !== 'object' || e === null || !('code' in e)) return null;
  const codigo = (e as { code: unknown }).code;
  return typeof codigo === 'string' && codigo.startsWith('auth/') ? codigo : null;
}

const INCORRETOS: ErroAuthTraduzido = { mensagem: 'E-mail ou senha incorretos.' };
const SILENCIOSO: ErroAuthTraduzido = { mensagem: null };
const EMAIL_COM_CONTA: ErroAuthTraduzido = {
  mensagem: 'Este e-mail já tem conta. Entre com ele.',
  campo: 'email',
  linkEntrar: true,
};

const MENSAGENS: Record<string, ErroAuthTraduzido> = {
  'auth/invalid-credential': INCORRETOS,
  'auth/wrong-password': INCORRETOS,
  'auth/user-not-found': INCORRETOS,
  'auth/invalid-email': { mensagem: 'Informe um e-mail válido.', campo: 'email' },
  'auth/email-already-in-use': EMAIL_COM_CONTA,
  'auth/weak-password': { mensagem: 'Use pelo menos 8 caracteres.', campo: 'senha' },
  'auth/account-exists-with-different-credential': {
    mensagem: 'Esse e-mail já entrou de outro jeito. Use Google ou sua senha.',
  },
  'auth/popup-closed-by-user': SILENCIOSO,
  'auth/cancelled-popup-request': SILENCIOSO,
  'auth/user-cancelled': SILENCIOSO,
  'auth/too-many-requests': { mensagem: 'Muitas tentativas seguidas. Espere um minuto e tente de novo.' },
  'auth/network-request-failed': { mensagem: 'Sem conexão. Verifique sua internet.' },
};

/** Erros do Firebase e da troca por sessão (API) em pt-BR (docs/FRONTEND.md §5.3). */
export function traduzirErroAuth(e: unknown): ErroAuthTraduzido {
  const codigo = codigoFirebase(e);
  if (codigo) return MENSAGENS[codigo] ?? { mensagem: 'Algo deu errado. Tente novamente.' };
  if (ehApiError(e, 'EMAIL_EM_USO')) return EMAIL_COM_CONTA;
  if (ehApiError(e)) return { mensagem: e.message };
  return { mensagem: MENSAGENS_ERRO.ERRO_INTERNO };
}
