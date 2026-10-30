import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService, chavesDoRanking } from '../../redis/redis.module';
import { StorageService } from '../../storage/storage.service';
import { recalcularDia } from '../dias/dia.service';
import { IDADE_MAX_PENDENTE_MS, LADO_MAX_FOTO, LADO_THUMB, chavesProcessadas } from './fotos.constantes';

const FORMATOS_ACEITOS = new Set(['jpeg', 'png', 'webp']);

export type ResultadoProcessamento = 'CONFIRMADA' | 'REJEITADA' | 'IGNORADA';

/** Lógica do worker (separada do processor para poder ser testada direto). */
@Injectable()
export class ProcessamentoFotoService {
  private readonly logger = new Logger(ProcessamentoFotoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly cache: CacheService,
  ) {}

  private async invalidarRankingDoDia(diaId: string): Promise<void> {
    const dia = await this.prisma.diaDesafio.findUnique({
      where: { id: diaId },
      select: { participante: { select: { desafioId: true } } },
    });
    if (dia) await this.cache.apagar(...chavesDoRanking(dia.participante.desafioId));
  }

  private async rejeitar(fotoId: string, diaId: string, chave: string, motivo: string): Promise<ResultadoProcessamento> {
    this.logger.warn(`Foto ${fotoId} rejeitada: ${motivo}`);
    await this.prisma.$transaction(async (tx) => {
      const r = await tx.fotoProva.updateMany({ where: { id: fotoId, status: 'ENVIADA' }, data: { status: 'REJEITADA' } });
      await recalcularDia(tx, diaId, { zerarConferencia: r.count > 0 });
    });
    await this.storage.apagar(chave);
    await this.invalidarRankingDoDia(diaId);
    return 'REJEITADA';
  }

  /**
   * 1) baixa o original; 2) valida o formato real; 3) gira/redimensiona para webp (remove EXIF/GPS);
   * 4) gera thumb; 5) sobe as duas, apaga o original e marca CONFIRMADA; 6) se inválida, REJEITADA.
   */
  async processar(fotoId: string): Promise<ResultadoProcessamento> {
    const foto = await this.prisma.fotoProva.findUnique({ where: { id: fotoId } });
    if (!foto || foto.status !== 'ENVIADA') return 'IGNORADA';
    const original = foto.storageKey;

    let bruto: Buffer;
    try {
      bruto = await this.storage.baixar(original);
    } catch (e) {
      const cab = await this.storage.cabecalho(original);
      if (!cab) return this.rejeitar(foto.id, foto.diaId, original, 'arquivo não existe no storage');
      throw e; // falha transitória: o BullMQ tenta de novo
    }

    let formato: string | undefined;
    try {
      formato = (await sharp(bruto).metadata()).format;
    } catch {
      return this.rejeitar(foto.id, foto.diaId, original, 'não é uma imagem válida');
    }
    if (!formato || !FORMATOS_ACEITOS.has(formato)) {
      return this.rejeitar(foto.id, foto.diaId, original, `formato não aceito (${formato ?? 'desconhecido'})`);
    }

    let cheia: Buffer;
    let thumb: Buffer;
    try {
      // sharp não copia metadados (EXIF/GPS/ICC) para a saída, a menos que se peça.
      cheia = await sharp(bruto)
        .rotate()
        .resize({ width: LADO_MAX_FOTO, height: LADO_MAX_FOTO, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      thumb = await sharp(bruto)
        .rotate()
        .resize({ width: LADO_THUMB, height: LADO_THUMB, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer();
    } catch {
      return this.rejeitar(foto.id, foto.diaId, original, 'falha ao decodificar a imagem');
    }

    const chaves = chavesProcessadas(original);
    await Promise.all([
      this.storage.enviar(chaves.cheia, cheia, 'image/webp'),
      this.storage.enviar(chaves.thumb, thumb, 'image/webp'),
    ]);

    const atualizadas = await this.prisma.$transaction(async (tx) => {
      const r = await tx.fotoProva.updateMany({
        where: { id: foto.id, status: 'ENVIADA', storageKey: original },
        data: {
          storageKey: chaves.cheia,
          thumbKey: chaves.thumb,
          status: 'CONFIRMADA',
          mimeType: 'image/webp',
          tamanhoBytes: cheia.length,
        },
      });
      if (r.count > 0) await recalcularDia(tx, foto.diaId);
      return r.count;
    });

    if (atualizadas === 0) {
      // A foto foi removida ou trocada enquanto processava: descarta o que geramos.
      await this.storage.apagarVarios([chaves.cheia, chaves.thumb]);
      return 'IGNORADA';
    }
    await this.storage.apagar(original);
    await this.invalidarRankingDoDia(foto.diaId);
    return 'CONFIRMADA';
  }

  /** Apaga fotos PENDENTE (upload nunca confirmado) com mais de 1 hora. */
  async limparPendentes(agora = new Date()): Promise<number> {
    const limite = new Date(agora.getTime() - IDADE_MAX_PENDENTE_MS);
    const velhas = await this.prisma.fotoProva.findMany({
      where: { status: 'PENDENTE', criadoEm: { lt: limite } },
      select: { id: true, storageKey: true, thumbKey: true },
    });
    if (velhas.length === 0) return 0;
    await this.storage.apagarVarios(velhas.flatMap((f) => [f.storageKey, f.thumbKey]));
    const r = await this.prisma.fotoProva.deleteMany({
      where: { id: { in: velhas.map((f) => f.id) }, status: 'PENDENTE' },
    });
    return r.count;
  }
}
