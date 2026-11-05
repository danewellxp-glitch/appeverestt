// `limpar`: apaga TUDO dos VUs (storage, banco, Firebase, sessões no Redis) e, com
// --remover-desafio, o próprio desafio de teste. Nunca toca em usuário que não seja VU.
import { DeleteObjectsCommand, ListObjectsV2Command, type S3Client } from '@aws-sdk/client-s3';
import { configS3DoEnv, criarClienteS3 } from '../../src/storage/s3';
import { DOMINIO_VU, chaveSessao, numeroDoEmail } from './config';
import {
  type Contexto,
  apagarChavesDoSimulador,
  invalidarCachesDoDesafio,
  travarRodada,
} from './contexto';

export interface OpcoesLimpar {
  slug: string;
  removerDesafio: boolean;
}

async function listarChaves(s3: S3Client, bucket: string, prefixo: string): Promise<string[]> {
  const chaves: string[] = [];
  let token: string | undefined;
  do {
    const r = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefixo, ContinuationToken: token }),
    );
    for (const o of r.Contents ?? []) if (o.Key) chaves.push(o.Key);
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  return chaves;
}

async function apagarChaves(
  s3: S3Client,
  bucket: string,
  chaves: readonly string[],
): Promise<number> {
  let apagadas = 0;
  for (let i = 0; i < chaves.length; i += 1000) {
    const lote = chaves.slice(i, i + 1000);
    const r = await s3.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: lote.map((Key) => ({ Key })), Quiet: true },
      }),
    );
    if (r.Errors && r.Errors.length > 0) {
      throw new Error(
        `Falha ao apagar ${r.Errors.length} foto(s) no storage: ${r.Errors[0]?.Message ?? ''}`,
      );
    }
    apagadas += lote.length;
  }
  return apagadas;
}

export async function limpar(ctx: Contexto, op: OpcoesLimpar): Promise<void> {
  const { prisma, log } = ctx;
  // Espera a rodada em andamento terminar e segura a trava durante a limpeza.
  const trava = await travarRodada(ctx, 30 * 60, 10 * 60_000);
  if (!trava)
    throw new Error('Uma rodada não terminou em 10 min. Pare o serviço "vu" e tente de novo.');
  try {
    const usuariosVu = (
      await prisma.usuario.findMany({
        where: { email: { endsWith: `@${DOMINIO_VU}` }, papel: 'USUARIO' },
        select: { id: true, email: true },
      })
    ).filter((u) => numeroDoEmail(u.email) !== null);
    const idsVu = usuariosVu.map((u) => u.id);
    const desafio = await prisma.desafio.findUnique({ where: { slug: op.slug } });
    if (!desafio) log(`Desafio "${op.slug}" não existe; limpando só as contas dos VUs.`);

    if (desafio) {
      const participantes = await prisma.participante.findMany({
        where: { desafioId: desafio.id, usuarioId: { in: idsVu } },
        select: { id: true },
      });
      const pids = participantes.map((p) => p.id);

      // 1) Storage primeiro: se falhar, o banco fica intacto e dá para rodar de novo.
      if (pids.length > 0) {
        const fotos = await prisma.fotoProva.findMany({
          where: { dia: { participanteId: { in: pids } } },
          select: { storageKey: true, thumbKey: true },
        });
        const s3cfg = configS3DoEnv(process.env);
        const s3 = criarClienteS3(s3cfg);
        try {
          const chaves = new Set<string>();
          for (const f of fotos) {
            chaves.add(f.storageKey);
            if (f.thumbKey) chaves.add(f.thumbKey);
          }
          // Tudo sob provas/{desafio}/{participante}/ (originais, .full.webp, .thumb.webp, órfãos).
          for (const pid of pids) {
            for (const k of await listarChaves(s3, s3cfg.bucket, `provas/${desafio.id}/${pid}/`))
              chaves.add(k);
          }
          const apagadas = await apagarChaves(s3, s3cfg.bucket, [...chaves]);
          log(`Storage: ${apagadas} objeto(s) apagado(s).`);
        } finally {
          s3.destroy();
        }
      }

      // 2) Banco (mesma trava de linha que a inscrição usa).
      const r = await prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Desafio" WHERE id = ${desafio.id} FOR UPDATE`;
          const fotos = await tx.fotoProva.deleteMany({
            where: { dia: { participanteId: { in: pids } } },
          });
          const dias = await tx.diaDesafio.deleteMany({ where: { participanteId: { in: pids } } });
          const feedbacks = await tx.feedback.deleteMany({
            where: { participanteId: { in: pids } },
          });
          const parts = await tx.participante.deleteMany({
            where: { id: { in: pids }, usuario: { email: { endsWith: `@${DOMINIO_VU}` } } },
          });
          return {
            fotos: fotos.count,
            dias: dias.count,
            feedbacks: feedbacks.count,
            participantes: parts.count,
          };
        },
        { maxWait: 15_000, timeout: 120_000 },
      );
      log(
        `Banco: ${r.participantes} inscrição(ões), ${r.dias} dia(s), ${r.fotos} foto(s), ${r.feedbacks} feedback(s) apagados.`,
      );
      await invalidarCachesDoDesafio(ctx, desafio.id);
    }

    // 3) Usuários VU sem nenhuma outra inscrição (os que ainda estão em outro desafio ficam).
    const presos = await prisma.participante.findMany({
      where: { usuarioId: { in: idsVu } },
      select: { usuarioId: true, desafio: { select: { slug: true } } },
    });
    const idsPresos = new Set(presos.map((p) => p.usuarioId));
    if (presos.length > 0) {
      const slugs = [...new Set(presos.map((p) => p.desafio.slug))].join(', ');
      log(
        `! ${idsPresos.size} VU(s) ainda inscrito(s) em: ${slugs}. Rode limpar para esse(s) desafio(s).`,
      );
    }
    const removiveis = usuariosVu.filter((u) => !idsPresos.has(u.id));
    const apagados = await prisma.usuario.deleteMany({
      where: {
        id: { in: removiveis.map((u) => u.id) },
        email: { endsWith: `@${DOMINIO_VU}` },
        papel: 'USUARIO',
        participacoes: { none: {} },
      },
    });
    log(`Banco: ${apagados.count} usuário(s) VU apagado(s).`);

    // 4) Firebase: só contas com e-mail de VU (menos as dos VUs que continuam em outro desafio).
    const emailsPresos = new Set(usuariosVu.filter((u) => idsPresos.has(u.id)).map((u) => u.email));
    try {
      const fb = await ctx.firebase.excluirVus((email) => emailsPresos.has(email));
      log(
        `Firebase: ${fb.apagados} conta(s) apagada(s)${fb.falhas > 0 ? `, ${fb.falhas} falha(s)` : ''}.`,
      );
      if (fb.falhas > 0) process.exitCode = 1;
    } catch (e) {
      log(
        `✖ Firebase: ${e instanceof Error ? e.message : String(e)} (rode limpar de novo depois).`,
      );
      process.exitCode = 1;
    }

    // 5) Sessões guardadas, última rodada etc. Se sobrou VU inscrito em outro desafio (ex.: o loop do
    // teste-vu), apaga só as sessões dos VUs removidos; senão, tudo do simulador.
    const chaves =
      idsPresos.size > 0
        ? await ctx.redis.del(
            ...usuariosVu.filter((u) => !idsPresos.has(u.id)).map((u) => chaveSessao(u.email)),
            '__nenhuma__',
          )
        : await apagarChavesDoSimulador(ctx);
    log(
      `Redis: ${chaves} chave(s) do simulador apagada(s); caches de vagas/ranking/feed invalidados.`,
    );

    // 6) Desafio de teste (só se não sobrou ninguém de verdade nele).
    if (op.removerDesafio && desafio) {
      const restantes = await prisma.participante.count({ where: { desafioId: desafio.id } });
      if (restantes > 0) {
        log(
          `! O desafio "${desafio.slug}" NÃO foi removido: ainda tem ${restantes} participante(s) que não são VUs ` +
            '(ex.: o embaixador). Remova-os pelo painel e rode de novo.',
        );
        process.exitCode = 1;
      } else {
        await prisma.desafio.delete({ where: { id: desafio.id } });
        await invalidarCachesDoDesafio(ctx, desafio.id);
        log(`Desafio "${desafio.slug}" removido.`);
        if (desafio.ativo) {
          log(
            '! Ele era o desafio ATIVO: ative o desafio real (criar-desafio ... --ativar true ou painel do admin).',
          );
        }
      }
    }
    log('Limpeza concluída.');
  } finally {
    await trava.liberar();
  }
}
