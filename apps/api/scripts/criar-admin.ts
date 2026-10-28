// Cria um usuário ADMIN (ou promove um existente). Com --embaixador, inscreve como
// participante embaixador no desafio ativo (respeitando Desafio.embaixadorOcupaVaga — Q3).
// Uso:
//   pnpm --filter api criar-admin --nome "Anderson" --email anderson@exemplo.com --senha "..." [--embaixador]
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { cadastroSchema } from '@everest/shared';
import { z } from 'zod';
import { inscrever } from '../src/modules/inscricoes/inscrever';
import { carregarEnv, lerArgs, sair } from './_util';

carregarEnv();

const schema = z.object({
  nome: cadastroSchema.shape.nome,
  email: cadastroSchema.shape.email,
  senha: cadastroSchema.shape.senha.optional(),
  embaixador: z.enum(['true', 'false']).default('false'),
});

async function main(): Promise<void> {
  const r = schema.safeParse(lerArgs());
  if (!r.success) sair(r.error.issues.map((i) => `--${i.path.join('.')}: ${i.message}`).join('\n  '));
  const a = r.data;
  const prisma = new PrismaClient();
  try {
    const existente = await prisma.usuario.findUnique({ where: { email: a.email } });
    if (!existente && !a.senha) sair('Informe --senha para criar um usuário novo.');
    const senhaHash = a.senha ? await argon2.hash(a.senha, { type: argon2.argon2id }) : undefined;

    const usuario = existente
      ? await prisma.usuario.update({
          where: { id: existente.id },
          data: {
            papel: 'ADMIN',
            nome: a.nome,
            ...(senhaHash ? { senhaHash, tokenVersao: { increment: 1 } } : {}),
          },
        })
      : await prisma.usuario.create({
          data: {
            nome: a.nome,
            email: a.email,
            senhaHash: senhaHash ?? sair('senha obrigatória'),
            papel: 'ADMIN',
            aceitouTermosEm: new Date(),
          },
        });
    console.log(`✔ ${usuario.email} agora é ADMIN.`);

    if (a.embaixador === 'true') {
      const desafio = await prisma.desafio.findFirst({ where: { ativo: true } });
      if (!desafio) sair('Nenhum desafio ativo. Rode criar-desafio antes.');
      const ins = await inscrever(prisma, { slug: desafio.slug, usuarioId: usuario.id, embaixador: true });
      const vaga = ins.participante.vagaNumero === null ? 'sem vaga (não ocupa)' : `vaga ${ins.participante.vagaNumero}`;
      console.log(`✔ Embaixador no desafio "${desafio.slug}" (${vaga}).`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e: unknown) => sair(e instanceof Error ? e.message : String(e)));
