import type { CookieOptions } from 'express';
import type { Papel } from '@everest/shared';

export const COOKIE_SESSAO = 'everest_sessao';
export const SESSAO_DIAS = 30;
export const SESSAO_MS = SESSAO_DIAS * 24 * 60 * 60 * 1000;

export interface PayloadSessao {
  sub: string;
  papel: Papel;
  v: number;
}

export interface UsuarioSessao {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
}

export function opcoesCookie(producao: boolean): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: producao,
    path: '/',
    maxAge: SESSAO_MS,
  };
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioSessao;
    }
  }
}
