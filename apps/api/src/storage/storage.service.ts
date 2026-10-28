import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3ServiceException,
  type S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Global, Injectable, Module } from '@nestjs/common';
import { AppConfig } from '../config/app-config.service';
import { criarClienteS3 } from './s3';

/** Validade das URLs assinadas (GET e PUT): 10 minutos. */
export const TTL_URL_ASSINADA_S = 600;

export interface CabecalhoObjeto {
  tamanhoBytes: number;
  contentType: string | undefined;
}

function ehNaoEncontrado(e: unknown): boolean {
  return (
    e instanceof NotFound ||
    (e instanceof S3ServiceException &&
      (e.name === 'NotFound' || e.name === 'NoSuchKey' || e.$metadata.httpStatusCode === 404))
  );
}

@Injectable()
export class StorageService {
  readonly bucket: string;
  private readonly s3: S3Client;

  constructor(config: AppConfig) {
    this.bucket = config.get('S3_BUCKET');
    this.s3 = criarClienteS3({
      endpoint: config.get('S3_ENDPOINT'),
      region: config.get('S3_REGION'),
      bucket: this.bucket,
      accessKeyId: config.get('S3_ACCESS_KEY_ID'),
      secretAccessKey: config.get('S3_SECRET_ACCESS_KEY'),
      forcePathStyle: config.get('S3_FORCE_PATH_STYLE'),
    });
  }

  /** URL de PUT direto do navegador. A assinatura inclui o Content-Type. */
  urlUpload(chave: string, contentType: string, ttl = TTL_URL_ASSINADA_S): Promise<string> {
    return getSignedUrl(
      this.s3,
      new PutObjectCommand({ Bucket: this.bucket, Key: chave, ContentType: contentType }),
      { expiresIn: ttl },
    );
  }

  urlLeitura(chave: string, ttl = TTL_URL_ASSINADA_S): Promise<string> {
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: this.bucket, Key: chave }), {
      expiresIn: ttl,
    });
  }

  async cabecalho(chave: string): Promise<CabecalhoObjeto | null> {
    try {
      const r = await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: chave }));
      return { tamanhoBytes: r.ContentLength ?? 0, contentType: r.ContentType };
    } catch (e) {
      if (ehNaoEncontrado(e)) return null;
      throw e;
    }
  }

  async baixar(chave: string): Promise<Buffer> {
    const r = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: chave }));
    if (!r.Body) throw new Error(`Objeto vazio: ${chave}`);
    return Buffer.from(await r.Body.transformToByteArray());
  }

  async enviar(chave: string, corpo: Buffer, contentType: string): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: chave, Body: corpo, ContentType: contentType }),
    );
  }

  async apagar(chave: string): Promise<void> {
    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: chave }));
    } catch (e) {
      if (!ehNaoEncontrado(e)) throw e;
    }
  }

  async apagarVarios(chaves: readonly (string | null | undefined)[]): Promise<void> {
    const unicas = [...new Set(chaves.filter((c): c is string => typeof c === 'string' && c.length > 0))];
    if (unicas.length === 0) return;
    await this.s3.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: { Objects: unicas.map((Key) => ({ Key })), Quiet: true },
      }),
    );
  }
}

@Global()
@Module({ providers: [StorageService], exports: [StorageService] })
export class StorageModule {}
