// Cria (ou atualiza) um desafio e o deixa como o único ativo.
// Uso:
//   pnpm --filter api criar-desafio --slug desafio-30-everest --nome "Desafio 30 Dias Everest" \
//     --dataInicio 2026-11-01 --handle everest --totalVagas 50 [--embaixadorOcupaVaga false] [--ativar false]
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { carregarEnv, lerArgs, sair } from './_util';

carregarEnv();

const schema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug deve ser kebab-case (a-z, 0-9, -)'),
  nome: z.string().trim().min(3),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dataInicio deve ser YYYY-MM-DD'),
  handle: z
    .string()
    .trim()
    .transform((h) => h.replace(/^@/, ''))
    .pipe(z.string().regex(/^[A-Za-z0-9._]{1,30}$/, 'handle do Instagram inválido')),
  totalVagas: z.coerce.number().int().min(1).max(10000).default(50),
  hashtag: z
    .string()
    .transform((h) => h.replace(/^#/, ''))
    .default('DESAFIO30EVEREST'),
  embaixadorOcupaVaga: z.enum(['true', 'false']).default('true'),
  ativar: z.enum(['true', 'false']).default('true'),
  timezone: z.string().default('America/Sao_Paulo'),
});

async function main(): Promise<void> {
  const r = schema.safeParse(lerArgs());
  if (!r.success) sair(r.error.issues.map((i) => `--${i.path.join('.')}: ${i.message}`).join('\n  '));
  const a = r.data;
  const prisma = new PrismaClient();
  try {
    const dados = {
      nome: a.nome,
      dataInicio: new Date(`${a.dataInicio}T00:00:00Z`),
      instagramHandle: a.handle,
      totalVagas: a.totalVagas,
      hashtag: a.hashtag,
      embaixadorOcupaVaga: a.embaixadorOcupaVaga === 'true',
      timezone: a.timezone,
    };
    const ativar = a.ativar === 'true';
    const d = await prisma.$transaction(async (tx) => {
      if (ativar) {
        await tx.desafio.updateMany({ where: { ativo: true, NOT: { slug: a.slug } }, data: { ativo: false } });
      }
      return tx.desafio.upsert({
        where: { slug: a.slug },
        update: { ...dados, ...(ativar ? { ativo: true } : {}) },
        create: { slug: a.slug, ...dados, ativo: ativar },
      });
    });
    console.log(
      `✔ Desafio "${d.slug}" pronto. Início ${a.dataInicio}, ${d.totalVagas} vagas, @${d.instagramHandle}, ativo=${d.ativo}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e: unknown) => sair(e instanceof Error ? e.message : String(e)));
