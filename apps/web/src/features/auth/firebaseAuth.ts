import type { QueryClient } from '@tanstack/react-query';
import type { MeResposta } from '@everest/shared';
import type { User } from 'firebase/auth';
import { api } from '../../lib/api';
import { obterAuth } from '../../lib/firebase';
import { chaves } from '../../lib/queries';
import { codigoFirebase } from './errosFirebase';
import { limparDadosDeSessaoAnterior } from './sessao';

/** iPhone com o app instalado: popup não funciona lá; usa redirect. */
function iosInstalado(): boolean {
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent);
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches);
  return ios && standalone;
}

/**
 * Troca o usuário do Firebase pela sessão do app (cookie httpOnly) e sai do Firebase:
 * quem guarda a sessão é a API; o navegador não fica com token nenhum.
 */
export async function trocarPorSessao(usuario: User, qc: QueryClient): Promise<MeResposta> {
  const auth = await obterAuth();
  const { signOut } = await import('firebase/auth');
  try {
    const idToken = await usuario.getIdToken(true);
    const me = await api<MeResposta>('/auth/sessao', { method: 'POST', body: { idToken }, silenciar401: true });
    limparDadosDeSessaoAnterior(qc);
    qc.setQueryData(chaves.me, me);
    return me;
  } finally {
    await signOut(auth).catch(() => undefined);
  }
}

/**
 * Google: popup no navegador; redirect no iPhone com o app instalado ou se o popup for bloqueado.
 * Devolve null quando saiu para o redirect (a página vai embora e volta em `concluirRedirect`).
 */
export async function entrarComGoogle(): Promise<User | null> {
  const auth = await obterAuth();
  const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await import('firebase/auth');
  const provedor = new GoogleAuthProvider();
  provedor.setCustomParameters({ prompt: 'select_account' });
  if (iosInstalado()) {
    await signInWithRedirect(auth, provedor);
    return null;
  }
  try {
    return (await signInWithPopup(auth, provedor)).user;
  } catch (e) {
    if (codigoFirebase(e) === 'auth/popup-blocked') {
      await signInWithRedirect(auth, provedor);
      return null;
    }
    throw e;
  }
}

/** No mount de /entrar e /criar-conta: o usuário que voltou do redirect do Google (ou null). */
export async function concluirRedirect(): Promise<User | null> {
  const auth = await obterAuth();
  const { getRedirectResult } = await import('firebase/auth');
  const r = await getRedirectResult(auth);
  return r?.user ?? null;
}

export async function entrarComEmail(email: string, senha: string): Promise<User> {
  const auth = await obterAuth();
  const { signInWithEmailAndPassword } = await import('firebase/auth');
  return (await signInWithEmailAndPassword(auth, email, senha)).user;
}

/** Cria a conta e grava o nome (vira o `name` do token e o nome inicial na API). */
export async function criarContaComEmail(nome: string, email: string, senha: string): Promise<User> {
  const auth = await obterAuth();
  const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
  const { user } = await createUserWithEmailAndPassword(auth, email, senha);
  await updateProfile(user, { displayName: nome });
  return user;
}

/** Link para criar senha nova. A tela mostra sempre a mesma confirmação, exista a conta ou não. */
export async function enviarRecuperacao(email: string): Promise<void> {
  const auth = await obterAuth();
  const { sendPasswordResetEmail } = await import('firebase/auth');
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (e) {
    // Não revela se a conta existe.
    if (codigoFirebase(e) === 'auth/user-not-found') return;
    throw e;
  }
}
