import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { COOKIE_SESSAO, type PayloadSessao } from '../../modules/auth/sessao';
import { ErroApp } from '../erros';

function ehPayload(v: unknown): v is PayloadSessao {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.sub === 'string' && typeof o.v === 'number';
}

/** Exige sessão válida (cookie JWT + tokenVersao em dia) e preenche req.usuario. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const cookies: unknown = req.cookies;
    const token =
      typeof cookies === 'object' && cookies !== null
        ? (cookies as Record<string, unknown>)[COOKIE_SESSAO]
        : undefined;
    if (typeof token !== 'string' || token.length === 0) throw new ErroApp('NAO_AUTENTICADO');

    let payload: unknown;
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new ErroApp('NAO_AUTENTICADO', 'Sua sessão expirou. Faça login de novo.');
    }
    if (!ehPayload(payload)) throw new ErroApp('NAO_AUTENTICADO');

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: { id: true, nome: true, email: true, papel: true, tokenVersao: true },
    });
    if (!usuario || usuario.tokenVersao !== payload.v) {
      throw new ErroApp('NAO_AUTENTICADO', 'Sua sessão expirou. Faça login de novo.');
    }
    req.usuario = { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel };
    return true;
  }
}
