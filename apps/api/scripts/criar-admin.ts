// Cria um usuário ADMIN (ou promove um existente). Com --embaixador, inscreve como
// participante embaixador no desafio ativo (respeitando Desafio.embaixadorOcupaVaga — Q3);
// o embaixador nasce com o pagamento CONFIRMADO (não paga a inscrição).
// Uso:
//   pnpm --filter api criar-admin --nome "Anderson" --email anderson@exemplo.com [--senha "..."] [--embaixador]
//
// --senha é opcional: só serve para o login local legado (AUTH_SENHA_LEGADO=true). Sem senha, o usuário
// é criado sem senha e o admin ENTRA COM O GOOGLE (Firebase) usando a conta do MESMO e-mail: no primeiro
// POST /auth/sessao com e-mail verificado, a conta Firebase é vinculada a este usuário e o papel ADMIN vale.
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
            // null = sem login local; entra pelo Google/Firebase com este mesmo e-mail.
            senhaHash: senhaHash ?? null,
            papel: 'ADMIN',
            aceitouTermosEm: new Date(),
          },
        });
    console.log(`✔ ${usuario.email} agora é ADMIN.`);
    if (!usuario.senhaHash) console.log('  Sem senha local: entre com o Google usando este mesmo e-mail.');

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
