// REST do emulador do Firebase Auth (só nos testes E2E; nada aqui vale fora do emulador).
// "Bearer owner" é o token de administrador que o emulador aceita.
import { CHAVE_API_FIREBASE, PROJETO_FIREBASE, URL_EMULADOR } from './ambiente';

const BASE = `${URL_EMULADOR}/identitytoolkit.googleapis.com/v1`;

async function postar<T>(url: string, corpo: unknown, admin = false): Promise<T> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(admin ? { Authorization: 'Bearer owner' } : {}) },
    body: JSON.stringify(corpo),
  });
  if (!r.ok) throw new Error(`Emulador ${url}: ${r.status} ${await r.text()}`);
  return (await r.json()) as T;
}

/** Apaga todas as contas do projeto demo no emulador. */
export async function limparEmulador(): Promise<void> {
  const r = await fetch(`${URL_EMULADOR}/emulator/v1/projects/${PROJETO_FIREBASE}/accounts`, { method: 'DELETE' });
  if (!r.ok) throw new Error(`Emulador: falha ao limpar contas (${r.status})`);
}

/** Cria uma conta de e-mail e senha e devolve o idToken (renovado se o e-mail foi marcado como verificado). */
export async function criarContaEmulador(dados: {
  email: string;
  senha: string;
  nome: string;
  verificado?: boolean;
}): Promise<string> {
  const conta = await postar<{ localId: string; idToken: string }>(`${BASE}/accounts:signUp?key=${CHAVE_API_FIREBASE}`, {
    email: dados.email,
    password: dados.senha,
    displayName: dados.nome,
    returnSecureToken: true,
  });
  if (!dados.verificado) return conta.idToken;
  await postar(
    `${BASE}/projects/${PROJETO_FIREBASE}/accounts:update`,
    { localId: conta.localId, emailVerified: true },
    true,
  );
  return entrarEmulador(dados.email, dados.senha);
}

/** Login por e-mail e senha: devolve um idToken novo. */
export async function entrarEmulador(email: string, senha: string): Promise<string> {
  const r = await postar<{ idToken: string }>(`${BASE}/accounts:signInWithPassword?key=${CHAVE_API_FIREBASE}`, {
    email,
    password: senha,
    returnSecureToken: true,
  });
  return r.idToken;
}
