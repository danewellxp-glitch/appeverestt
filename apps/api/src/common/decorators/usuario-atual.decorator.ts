import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { UsuarioSessao } from '../../modules/auth/sessao';
import { ErroApp } from '../erros';

/** Usuário autenticado (exige JwtAuthGuard na rota). */
export const UsuarioAtual = createParamDecorator((_: unknown, ctx: ExecutionContext): UsuarioSessao => {
  const req = ctx.switchToHttp().getRequest<Request>();
  if (!req.usuario) throw new ErroApp('NAO_AUTENTICADO');
  return req.usuario;
});
