import { applyDecorators } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { z } from 'zod';

type OpcoesBody = Extract<Parameters<typeof ApiBody>[0], { schema: unknown }>;
type SchemaBody = OpcoesBody['schema'];

/** Documenta no Swagger um body validado por schema zod, com exemplo. */
export function ApiZodBody(schema: z.ZodType, exemplo: Record<string, unknown>): MethodDecorator {
  const json = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' });
  const { $schema: _ignorado, ...resto } = json as Record<string, unknown>;
  return applyDecorators(ApiBody({ schema: { ...(resto as SchemaBody), example: exemplo } }));
}
