import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { CODIGOS_ERRO, type CodigoErro, type ErroApi } from '@everest/shared';
import { MENSAGENS_PADRAO } from '../erros';

function ehErroApi(v: unknown): v is ErroApi {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.codigo === 'string' &&
    (CODIGOS_ERRO as readonly string[]).includes(o.codigo) &&
    typeof o.mensagem === 'string'
  );
}

function codigoPorStatus(status: number): CodigoErro {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return 'VALIDACAO';
    case HttpStatus.UNAUTHORIZED:
      return 'NAO_AUTENTICADO';
    case HttpStatus.FORBIDDEN:
      return 'PROIBIDO';
    case HttpStatus.NOT_FOUND:
      return 'NAO_ENCONTRADO';
    case HttpStatus.PAYLOAD_TOO_LARGE:
      return 'VALIDACAO';
    case HttpStatus.TOO_MANY_REQUESTS:
      return 'MUITAS_REQUISICOES';
    default:
      return 'ERRO_INTERNO';
  }
}

/** Toda resposta de erro sai como { codigo, mensagem }. */
@Catch()
export class ErroApiFilter implements ExceptionFilter {
  private readonly logger = new Logger('Erro');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const corpo = exception.getResponse();
      if (ehErroApi(corpo)) {
        res.status(status).json(corpo);
        return;
      }
      const codigo = codigoPorStatus(status);
      if (codigo === 'ERRO_INTERNO') this.logger.error(exception.message, exception.stack);
      res.status(status).json({ codigo, mensagem: MENSAGENS_PADRAO[codigo] } satisfies ErroApi);
      return;
    }

    // Erros do body-parser (JSON malformado / corpo grande demais) chegam como Error com status.
    if (exception instanceof Error && 'status' in exception && typeof exception.status === 'number') {
      const status = exception.status;
      const codigo = codigoPorStatus(status);
      res.status(status).json({ codigo, mensagem: MENSAGENS_PADRAO[codigo] } satisfies ErroApi);
      return;
    }

    this.logger.error(
      exception instanceof Error ? exception.message : String(exception),
      exception instanceof Error ? exception.stack : undefined,
    );
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ codigo: 'ERRO_INTERNO', mensagem: MENSAGENS_PADRAO.ERRO_INTERNO } satisfies ErroApi);
  }
}
