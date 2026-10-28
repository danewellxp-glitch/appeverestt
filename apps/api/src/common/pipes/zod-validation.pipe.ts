import { Injectable, type PipeTransform } from '@nestjs/common';
import type { z } from 'zod';
import { ErroApp } from '../erros';

/** Valida (e normaliza) um valor com um schema zod. Erros viram { codigo: 'VALIDACAO' }. */
@Injectable()
export class ZodValidationPipe<S extends z.ZodType> implements PipeTransform<unknown, z.output<S>> {
  constructor(private readonly schema: S) {}

  transform(valor: unknown): z.output<S> {
    const r = this.schema.safeParse(valor);
    if (r.success) return r.data;
    const campos: Record<string, string> = {};
    for (const issue of r.error.issues) {
      const chave = issue.path.map(String).join('.') || '_';
      if (!(chave in campos)) campos[chave] = issue.message;
    }
    const primeira = r.error.issues[0]?.message ?? 'Dados inválidos.';
    throw new ErroApp('VALIDACAO', primeira, campos);
  }
}
