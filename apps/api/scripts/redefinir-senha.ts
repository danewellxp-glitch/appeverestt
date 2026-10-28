// Redefine a senha de um usuário e encerra todas as sessões dele (X3).
// Uso: pnpm --filter api redefinir-senha --email maria@exemplo.com --senha "nova-senha-123"
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { cadastroSchema } from '@everest/shared';
import { z } from 'zod';
import { carregarEnv, lerArgs, sair } from './_util';

carregarEnv();

const schema = z.object({
  email: cadastroSchema.shape.email,
  senha: cadastroSchema.shape.senha,
});

async function main(): Promise<void> {
  const r = schema.safeParse(lerArgs());
  if (!r.success) sair(r.error.issues.map((i) => `--${i.path.join('.')}: ${i.message}`).join('\n  '));
  const prisma = new PrismaClient();
  try {
    const u = await prisma.usuario.findUnique({ where: { email: r.data.email } });
    if (!u) sair(`Usuário ${r.data.email} não encontrado.`);
    await prisma.usuario.update({
      where: { id: u.id },
      data: {
        senhaHash: await argon2.hash(r.data.senha, { type: argon2.argon2id }),
        tokenVersao: { increment: 1 },
      },
    });
    console.log(`✔ Senha de ${u.email} redefinida. Sessões antigas foram encerradas.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e: unknown) => sair(e instanceof Error ? e.message : String(e)));
