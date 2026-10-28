import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import {
  TAMANHO_MAX_FOTO_BYTES,
  uploadUrlSchema,
  type ConfirmarFotoResposta,
  type TipoFoto,
  type UploadUrlResposta,
} from '@everest/shared';
import { ErroApp } from '../../common/erros';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import type { UsuarioSessao } from '../auth/sessao';
import { DesafioService } from '../desafios/desafio.service';
import { DiaService, recalcularDia } from '../dias/dia.service';
import {
  type DadosProcessarFoto,
  FILA_FOTOS,
  JOB_LIMPAR,
  JOB_PROCESSAR,
  chaveOriginal,
} from './fotos.constantes';

const pipeUpload = new ZodValidationPipe(uploadUrlSchema);

function tamanhoDeclarado(body: unknown): number | null {
  if (typeof body !== 'object' || body === null) return null;
  const v = (body as Record<string, unknown>).tamanhoBytes;
  return typeof v === 'number' ? v : null;
}

@Injectable()
export class FotosService implements OnModuleInit {
  private readonly logger = new Logger(FotosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly desafios: DesafioService,
    private readonly dias: DiaService,
    @InjectQueue(FILA_FOTOS) private readonly fila: Queue<DadosProcessarFoto>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.fila.upsertJobScheduler(JOB_LIMPAR, { every: 60 * 60 * 1000 }, { name: JOB_LIMPAR });
    } catch (e) {
      this.logger.error(`Não foi possível agendar a limpeza de fotos: ${String(e)}`);
    }
  }

  async solicitarUpload(
    slug: string,
    usuario: UsuarioSessao,
    numeroDia: number,
    corpo: unknown,
  ): Promise<UploadUrlResposta> {
    const declarado = tamanhoDeclarado(corpo);
    if (declarado !== null && declarado > TAMANHO_MAX_FOTO_BYTES) throw new ErroApp('FOTO_GRANDE_DEMAIS');
    const body = pipeUpload.transform(corpo);

    const { desafio, participante } = await this.desafios.exigirParticipante(slug, usuario.id);
    this.dias.exigirEditavel(desafio, numeroDia);

    const fotoId = randomUUID().replace(/-/g, '');
    const storageKey = chaveOriginal({
      desafioId: desafio.id,
      participanteId: participante.id,
      numeroDia,
      tipo: body.tipo,
      fotoId,
      mimeType: body.mimeType,
    });

    // Substitui a foto anterior do mesmo tipo (única por dia+tipo).
    const antigas = await this.prisma.$transaction(async (tx) => {
      const dia = await tx.diaDesafio.upsert({
        where: { participanteId_numeroDia: { participanteId: participante.id, numeroDia } },
        update: {},
        create: { participanteId: participante.id, numeroDia },
      });
      const anterior = await tx.fotoProva.findUnique({
        where: { diaId_tipo: { diaId: dia.id, tipo: body.tipo } },
      });
      if (anterior) await tx.fotoProva.delete({ where: { id: anterior.id } });
      await tx.fotoProva.create({
        data: {
          id: fotoId,
          diaId: dia.id,
          tipo: body.tipo,
          storageKey,
          mimeType: body.mimeType,
          tamanhoBytes: body.tamanhoBytes,
          status: 'PENDENTE',
        },
      });
      await recalcularDia(tx, dia.id);
      return anterior ? [anterior.storageKey, anterior.thumbKey] : [];
    });
    if (antigas.length > 0) {
      await this.storage.apagarVarios(antigas);
      await this.dias.invalidarRanking(desafio.id);
    }

    const uploadUrl = await this.storage.urlUpload(storageKey, body.mimeType);
    return { fotoId, uploadUrl, headers: { 'Content-Type': body.mimeType } };
  }

  private async fotoDoParticipante(slug: string, usuario: UsuarioSessao, numeroDia: number, fotoId: string) {
    const { desafio, participante } = await this.desafios.exigirParticipante(slug, usuario.id);
    this.dias.validarNumeroDia(desafio, numeroDia);
    const foto = await this.prisma.fotoProva.findUnique({ where: { id: fotoId }, include: { dia: true } });
    if (!foto || foto.dia.participanteId !== participante.id || foto.dia.numeroDia !== numeroDia) {
      throw new ErroApp('NAO_ENCONTRADO', 'Foto não encontrada.');
    }
    return { desafio, foto };
  }

  async confirmar(
    slug: string,
    usuario: UsuarioSessao,
    numeroDia: number,
    fotoId: string,
  ): Promise<ConfirmarFotoResposta> {
    const { desafio, foto } = await this.fotoDoParticipante(slug, usuario, numeroDia, fotoId);
    if (foto.status !== 'PENDENTE') return { fotoId: foto.id, status: foto.status };

    const cab = await this.storage.cabecalho(foto.storageKey);
    if (!cab) throw new ErroApp('FOTO_INVALIDA', 'Não recebemos o arquivo. Tente enviar de novo.');

    const descartar = async (): Promise<void> => {
      await this.storage.apagar(foto.storageKey);
      await this.prisma.$transaction(async (tx) => {
        await tx.fotoProva.deleteMany({ where: { id: foto.id } });
        await recalcularDia(tx, foto.diaId);
      });
    };
    if (cab.tamanhoBytes > TAMANHO_MAX_FOTO_BYTES) {
      await descartar();
      throw new ErroApp('FOTO_GRANDE_DEMAIS');
    }
    const tipoRecebido = (cab.contentType ?? '').split(';')[0]?.trim().toLowerCase();
    if (cab.tamanhoBytes === 0 || tipoRecebido !== foto.mimeType) {
      await descartar();
      throw new ErroApp('FOTO_INVALIDA');
    }

    const atualizadas = await this.prisma.$transaction(async (tx) => {
      const r = await tx.fotoProva.updateMany({
        where: { id: foto.id, status: 'PENDENTE' },
        data: { status: 'ENVIADA', tamanhoBytes: cab.tamanhoBytes },
      });
      await recalcularDia(tx, foto.diaId);
      return r.count;
    });
    if (atualizadas > 0) {
      await this.fila.add(
        JOB_PROCESSAR,
        { fotoId: foto.id },
        {
          jobId: `foto-${foto.id}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2_000 },
          removeOnComplete: true,
          removeOnFail: 100,
        },
      );
      await this.dias.invalidarRanking(desafio.id);
    }
    return { fotoId: foto.id, status: 'ENVIADA' };
  }

  async remover(slug: string, usuario: UsuarioSessao, numeroDia: number, tipo: TipoFoto): Promise<{ ok: true }> {
    const { desafio, participante } = await this.desafios.exigirParticipante(slug, usuario.id);
    this.dias.exigirEditavel(desafio, numeroDia);
    const chaves = await this.prisma.$transaction(async (tx) => {
      const dia = await tx.diaDesafio.findUnique({
        where: { participanteId_numeroDia: { participanteId: participante.id, numeroDia } },
      });
      const foto = dia
        ? await tx.fotoProva.findUnique({ where: { diaId_tipo: { diaId: dia.id, tipo } } })
        : null;
      if (!dia || !foto) throw new ErroApp('NAO_ENCONTRADO', 'Não há foto desse tipo neste dia.');
      await tx.fotoProva.delete({ where: { id: foto.id } });
      await recalcularDia(tx, dia.id);
      return [foto.storageKey, foto.thumbKey];
    });
    await this.storage.apagarVarios(chaves);
    await this.dias.invalidarRanking(desafio.id);
    return { ok: true };
  }
}
