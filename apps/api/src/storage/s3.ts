import { S3Client } from '@aws-sdk/client-s3';

export interface ConfigS3 {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

/**
 * Cliente S3 compatível com MinIO e Cloudflare R2.
 * Checksums só quando exigidos: o SDK novo adiciona CRC32 por padrão, o que
 * quebra uploads diretos do navegador via URL assinada e não é suportado por todos os provedores.
 */
export function criarClienteS3(c: ConfigS3): S3Client {
  return new S3Client({
    endpoint: c.endpoint,
    region: c.region,
    forcePathStyle: c.forcePathStyle,
    credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
}

export function configS3DoEnv(env: NodeJS.ProcessEnv): ConfigS3 {
  const obrigatoria = (nome: string): string => {
    const v = env[nome];
    if (!v) throw new Error(`Variável ${nome} não definida`);
    return v;
  };
  return {
    endpoint: obrigatoria('S3_ENDPOINT'),
    region: env.S3_REGION || 'auto',
    bucket: obrigatoria('S3_BUCKET'),
    accessKeyId: obrigatoria('S3_ACCESS_KEY_ID'),
    secretAccessKey: obrigatoria('S3_SECRET_ACCESS_KEY'),
    forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true' || env.S3_FORCE_PATH_STYLE === '1',
  };
}
