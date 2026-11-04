// Preenche o hash perceptual (dHash, X20) das fotos CONFIRMADA que ainda não têm: as enviadas antes
// da R20. Lê a versão processada (.full.webp) do storage, a mesma de que o worker calcula o hash.
// Idempotente: só mexe em foto sem hash e pode rodar de novo a qualquer momento. Imagem lisa (cor
// sólida, tela preta) fica sem hash de propósito; arquivo que sumiu do storage só é contado.
//
// Uso (no container da API, com a API no ar):
//   node dist/cli/scripts/hash-fotos.js [--desafio <slug>] [--lote 20]
// Em dev: pnpm --filter api hash-fotos [--desafio <slug>]
// Env: DATABASE_URL, S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
//      (S3_REGION, S3_FORCE_PATH_STYLE como na API).
import { GetObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { hashPerceptual } from '../src/modules/fotos/hash-perceptual';
import { configS3DoEnv, criarClienteS3, ehNaoEncontrado } from '../src/storage/s3';
import { carregarEnv, lerArgs, sair } from './_util';

export interface ResumoHashes {
  analisadas: number;
  preenchidas: number;
  /** Imagem sem textura: fica sem hash (casaria com qualquer outra lisa). */
  lisas: number;
  /** O arquivo não está no storage. */
  semArquivo: number;
  /** Trocada ou apagada enquanto o script rodava. */
  ignoradas: number;
  falhas: number;
}

export interface OpcoesHashes {
  /** Só as fotos deste desafio (padrão: todos). */
  desafioId?: string;
  /** Fotos baixadas ao mesmo tempo. */
  lote: number;
  log?: (mensagem: string) => void;
}

async function baixar(s3: S3Client, bucket: string, chave: string): Promise<Buffer | null> {
  try {
    const r = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: chave }));
    return r.Body ? Buffer.from(await r.Body.transformToByteArray()) : null;
  } catch (e) {
    if (ehNaoEncontrado(e)) return null;
    throw e;
  }
}

/** Percorre as fotos CONFIRMADA sem hash em lotes (cursor por id: cada foto é vista uma vez). */
export async function preencherHashes(
  prisma: PrismaClient,
  s3: S3Client,
  bucket: string,
  opcoes: OpcoesHashes,
): Promise<ResumoHashes> {
  const log = opcoes.log ?? (() => undefined);
  const resumo: ResumoHashes = {
    analisadas: 0,
    preenchidas: 0,
    lisas: 0,
    semArquivo: 0,
    ignoradas: 0,
    falhas: 0,
  };
  let cursor: string | undefined;
  for (;;) {
    const fotos = await prisma.fotoProva.findMany({
      where: {
        status: 'CONFIRMADA',
        hashPerceptual: null,
        ...(cursor ? { id: { gt: cursor } } : {}),
        ...(opcoes.desafioId ? { dia: { participante: { desafioId: opcoes.desafioId } } } : {}),
      },
      select: { id: true, storageKey: true },
      orderBy: { id: 'asc' },
      take: opcoes.lote,
    });
    if (fotos.length === 0) break;
    cursor = fotos[fotos.length - 1]?.id;

    await Promise.all(
      fotos.map(async (f) => {
        resumo.analisadas += 1;
        try {
          const imagem = await baixar(s3, bucket, f.storageKey);
          if (!imagem) {
            resumo.semArquivo += 1;
            log(`! ${f.id}: arquivo não encontrado (${f.storageKey})`);
            return;
          }
          const hash = await hashPerceptual(imagem);
          if (!hash) {
            resumo.lisas += 1;
            return;
          }
          // Condição no UPDATE: a foto pode ter sido trocada ou apagada enquanto baixava.
          const r = await prisma.fotoProva.updateMany({
            where: {
              id: f.id,
              status: 'CONFIRMADA',
              storageKey: f.storageKey,
              hashPerceptual: null,
            },
            data: { hashPerceptual: hash },
          });
          if (r.count > 0) resumo.preenchidas += 1;
          else resumo.ignoradas += 1;
        } catch (e) {
          resumo.falhas += 1;
          log(`✖ ${f.id}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }),
    );
    log(`… ${resumo.analisadas} analisada(s), ${resumo.preenchidas} com hash novo`);
  }
  return resumo;
}

async function main(): Promise<void> {
  carregarEnv();
  const args = lerArgs();
  const lote = args.lote === undefined ? 20 : Number(args.lote);
  if (!Number.isInteger(lote) || lote < 1 || lote > 100)
    sair('--lote deve ser um inteiro entre 1 e 100.');
  const s3cfg = configS3DoEnv(process.env);
  const s3 = criarClienteS3(s3cfg);
  const prisma = new PrismaClient();
  try {
    let desafioId: string | undefined;
    if (args.desafio) {
      const d = await prisma.desafio.findUnique({
        where: { slug: args.desafio },
        select: { id: true },
      });
      if (!d) sair(`Desafio "${args.desafio}" não existe.`);
      desafioId = d.id;
    }
    const inicio = Date.now();
    const r = await preencherHashes(prisma, s3, s3cfg.bucket, {
      desafioId,
      lote,
      log: console.log,
    });
    const segundos = ((Date.now() - inicio) / 1000).toFixed(1);
    console.log(
      `✔ ${r.analisadas} foto(s) sem hash analisada(s) em ${segundos} s: ${r.preenchidas} preenchida(s), ` +
        `${r.lisas} lisa(s) (ficam sem hash), ${r.semArquivo} sem arquivo, ${r.ignoradas} trocada(s) no meio, ` +
        `${r.falhas} falha(s).`,
    );
    if (r.falhas > 0) process.exitCode = 1;
  } finally {
    s3.destroy();
    await prisma.$disconnect();
  }
}

// Só roda como comando (o teste e2e importa `preencherHashes`).
if (require.main === module) {
  main().catch((e: unknown) => sair(e instanceof Error ? e.message : String(e)));
}
