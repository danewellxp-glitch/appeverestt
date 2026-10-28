import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import type { ErroApi } from '@everest/shared';
import { AppConfig } from '../../config/app-config.service';

const METODOS_MUTACAO = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Proteção extra contra CSRF: em mutações, se o navegador mandou `Origin`,
 * ele precisa estar na lista WEB_ORIGIN. (Navegadores sempre enviam Origin
 * em POST/PUT/PATCH/DELETE; clientes sem navegador não são vetor de CSRF.)
 */
@Injectable()
export class OriginMiddleware implements NestMiddleware {
  private readonly permitidas: Set<string>;

  constructor(config: AppConfig) {
    this.permitidas = new Set(config.get('WEB_ORIGIN'));
  }

  use(req: Request, res: Response, next: NextFunction): void {
    if (!METODOS_MUTACAO.has(req.method)) return next();
    const origin = req.headers.origin;
    if (origin === undefined || this.permitidas.has(origin.replace(/\/$/, ''))) return next();
    const corpo: ErroApi = { codigo: 'PROIBIDO', mensagem: 'Origem da requisição não permitida.' };
    res.status(403).json(corpo);
  }
}
