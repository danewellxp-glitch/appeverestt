import { CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import Redis from 'ioredis';
import { configS3DoEnv, criarClienteS3 } from '../src/storage/s3';
import { ENV_TESTE, aplicarEnvTeste } from './env-teste';

/** Cria o banco de teste (se faltar), aplica migrations, cria o bucket de teste e limpa o Redis db 1. */
export default async function globalSetup(): Promise<void> {
  aplicarEnvTeste();

  const urlAdmin = (ENV_TESTE.DATABASE_URL ?? '').replace('/everest_test?', '/everest?');
  const admin = new PrismaClient({ datasourceUrl: urlAdmin });
  try {
    const existe = await admin.$queryRaw<{ n: number }[]>`SELECT 1 AS n FROM pg_database WHERE datname = 'everest_test'`;
    if (existe.length === 0) await admin.$executeRawUnsafe('CREATE DATABASE everest_test');
  } finally {
    await admin.$disconnect();
  }

  execSync('npx prisma migrate deploy', {
    cwd: resolve(__dirname, '..'),
    env: { ...process.env, ...ENV_TESTE },
    stdio: 'pipe',
  });

  const cfg = configS3DoEnv(process.env);
  const s3 = criarClienteS3(cfg);
  try {
    await s3.send(new HeadBucketCommand({ Bucket: cfg.bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: cfg.bucket }));
  }

  const redis = new Redis(ENV_TESTE.REDIS_URL ?? '');
  await redis.flushdb();
  await redis.quit();
}
