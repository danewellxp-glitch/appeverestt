import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

    // A foto já recebida do mesmo tipo continua valendo até a nova ser confirmada (R17): se o envio
    // da nova falhar, o dia não perde a prova. Só um pedido pendente por tipo: o anterior sai.
    const pendentesAntigas = await this.prisma.$transaction(async (tx) => {
      const dia = await tx.diaDesafio.upsert({
        where: { participanteId_numeroDia: { participanteId: participante.id, numeroDia } },
        update: {},
        create: { participanteId: participante.id, numeroDia },
      });
      const pendentes = await tx.fotoProva.findMany({
        where: { diaId: dia.id, tipo: body.tipo, status: 'PENDENTE' },
        select: { id: true, storageKey: true, thumbKey: true },
      });
      if (pendentes.length > 0) {
        await tx.fotoProva.deleteMany({ where: { id: { in: pendentes.map((f) => f.id) }, status: 'PENDENTE' } });
      }
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
      return pendentes.flatMap((f) => [f.storageKey, f.thumbKey]);
    });
    if (pendentesAntigas.length > 0) await this.storage.apagarVarios(pendentesAntigas);

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

    const descartar = async (): Promise<void> => {
      await this.storage.apagar(foto.storageKey);
      await this.prisma.$transaction(async (tx) => {
        await tx.fotoProva.deleteMany({ where: { id: foto.id } });
        await recalcularDia(tx, foto.diaId);
      });
    };
    // A janela vale também na confirmação: o upload pedido às 23:59 não vira prova do dia anterior
    // depois da tolerância da virada (X18).
    try {
      this.dias.exigirEditavel(desafio, numeroDia);
    } catch (e) {
      await descartar();
      throw e;
    }

    const cab = await this.storage.cabecalho(foto.storageKey);
    if (!cab) throw new ErroApp('FOTO_INVALIDA', 'Não recebemos o arquivo. Tente enviar de novo.');
    if (cab.tamanhoBytes > TAMANHO_MAX_FOTO_BYTES) {
      await descartar();
      throw new ErroApp('FOTO_GRANDE_DEMAIS');
    }
    const tipoRecebido = (cab.contentType ?? '').split(';')[0]?.trim().toLowerCase();
    if (cab.tamanhoBytes === 0 || tipoRecebido !== foto.mimeType) {
      await descartar();
      throw new ErroApp('FOTO_INVALIDA');
    }

    // Troca (X19): a foto já recebida do mesmo tipo sai na mesma transação em que a nova entra.
    // Trava primeiro a nova: se ela sumiu nesse meio-tempo (outro pedido de troca, limpeza horária)
    // ou outra confirmação chegou antes, nada é apagado. As antigas também são travadas, para ler as
    // chaves já atualizadas pelo worker (senão o .webp processado ficaria órfão no storage).
    let substituidas: (string | null)[] = [];
    let confirmou: boolean;
    try {
      confirmou = await this.prisma.$transaction(async (tx) => {
        const nova = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM "FotoProva" WHERE id = ${foto.id} AND status = 'PENDENTE' FOR UPDATE`;
        if (nova.length === 0) return false;
        const antigas = await tx.$queryRaw<{ id: string; storageKey: string; thumbKey: string | null }[]>`
          SELECT id, "storageKey", "thumbKey" FROM "FotoProva"
          WHERE "diaId" = ${foto.diaId} AND tipo = ${foto.tipo}::"TipoFoto" AND id <> ${foto.id}
            AND status <> 'PENDENTE'
          FOR UPDATE`;
        if (antigas.length > 0) {
          await tx.fotoProva.deleteMany({ where: { id: { in: antigas.map((f) => f.id) } } });
        }
        await tx.fotoProva.update({
          where: { id: foto.id },
          data: { status: 'ENVIADA', tamanhoBytes: cab.tamanhoBytes },
        });
        await recalcularDia(tx, foto.diaId, { zerarConferencia: true });
        substituidas = antigas.flatMap((f) => [f.storageKey, f.thumbKey]);
        return true;
      });
    } catch (e) {
      // Duas fotos do mesmo tipo confirmadas ao mesmo tempo: o índice único segura a segunda.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ErroApp('FOTO_INVALIDA', 'Outra foto deste tipo chegou ao mesmo tempo. Tente de novo.');
      }
      throw e;
    }
    if (!confirmou) {
      const atual = await this.prisma.fotoProva.findUnique({ where: { id: foto.id }, select: { status: true } });
      if (atual) return { fotoId: foto.id, status: atual.status };
      throw new ErroApp('NAO_ENCONTRADO', 'Esta foto foi trocada por um envio mais novo.');
    }

    // Primeiro o que não pode falhar em silêncio (processar a nova: tira o EXIF, gera a miniatura);
    // apagar os arquivos da antiga vem depois e não derruba a resposta.
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
    if (substituidas.length > 0) {
      try {
        await this.storage.apagarVarios(substituidas);
      } catch (e) {
        this.logger.error(`Não foi possível apagar a foto substituída (${substituidas.join(', ')}): ${String(e)}`);
      }
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
      // A recebida e um eventual envio pendente do mesmo tipo saem juntos.
      const fotos = dia
        ? await tx.fotoProva.findMany({
            where: { diaId: dia.id, tipo },
            select: { id: true, storageKey: true, thumbKey: true },
          })
        : [];
      if (!dia || fotos.length === 0) throw new ErroApp('NAO_ENCONTRADO', 'Não há foto desse tipo neste dia.');
      await tx.fotoProva.deleteMany({ where: { id: { in: fotos.map((f) => f.id) } } });
      await recalcularDia(tx, dia.id, { zerarConferencia: true });
      return fotos.flatMap((f) => [f.storageKey, f.thumbKey]);
    });
    await this.storage.apagarVarios(chaves);
    await this.dias.invalidarRanking(desafio.id);
    return { ok: true };
  }
}
