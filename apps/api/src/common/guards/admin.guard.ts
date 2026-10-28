import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ErroApp } from '../erros';

/** Use depois do JwtAuthGuard: só deixa passar papel ADMIN. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!req.usuario) throw new ErroApp('NAO_AUTENTICADO');
    if (req.usuario.papel !== 'ADMIN') throw new ErroApp('PROIBIDO');
    return true;
  }
}
