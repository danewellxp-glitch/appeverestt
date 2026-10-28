import { Injectable } from '@nestjs/common';
import type { Desafio, FotoProva, Participante, Prisma, PrismaClient } from '@prisma/client';
import {
  TIPOS_FOTO,
  calcularConcluido,
  calcularEvolucao,
  calcularMelhorSequencia,
  calcularSequenciaAtual,
  dataDoDia,
  requisitosPendentes,
  type CheckinInput,
  type DiaDetalhe,
  type DiaResumo,
  type FotoDia,
  type MeuProgresso,
  type SituacaoDia,
  type TipoFoto,
} from '@everest/shared';
import { ErroApp } from '../../common/erros';
import { AppConfig } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService, chaveRanking } from '../../redis/redis.module';
import { StorageService } from '../../storage/storage.service';
import { type InfoTempo, dataIso, infoTempo } from '../desafios/desafio.service';

type Cliente = PrismaClient | Prisma.TransactionClient;

const STATUS_VALIDOS = ['ENVIADA', 'CONFIRMADA'] as const;

/** Dia de referência para a sequência atual (antes do início: 0; depois do fim: conta até o último dia). */
export function diaReferenciaSequencia(info: InfoTempo, totalDias: number): number {
  if (info.status === 'EM_ANDAMENTO') return info.diaAtual ?? 0;
  if (info.status === 'ENCERRADO') return totalDias + 1;
  return 0;
}

/** Recalcula `concluido` a partir do banco (fotos ENVIADA/CONFIRMADA). Única fonte do campo. */
export async function recalcularDia(db: Cliente, diaId: string): Promise<boolean> {
  const dia = await db.diaDesafio.findUnique({
    where: { id: diaId },
    include: { fotos: { where: { status: { in: [...STATUS_VALIDOS] } }, select: { tipo: true } } },
  });
  if (!dia) return false;
  const concluido = calcularConcluido({
    aguaMl: dia.aguaMl,
    exercicio: dia.exercicio,
    paginasLidas: dia.paginasLidas,
    storyPostado: dia.storyPostado,
    invalidado: dia.invalidado,
    fotosValidas: dia.fotos.map((f) => f.tipo),
  });
  if (concluido !== dia.concluido) {
    await db.diaDesafio.update({ where: { id: diaId }, data: { concluido } });
  }
  return concluido;
}

@Injectable()
export class DiaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly storage: StorageService,
    private readonly config: AppConfig,
  ) {}

  validarNumeroDia(desafio: Desafio, numeroDia: number): void {
    if (numeroDia < 1 || numeroDia > desafio.totalDias) {
      throw new ErroApp('NAO_ENCONTRADO', `O desafio tem ${desafio.totalDias} dias.`);
    }
  }

  ehEditavel(desafio: Desafio, numeroDia: number, agora = new Date()): boolean {
    const t = infoTempo(desafio, agora);
    if (t.status !== 'EM_ANDAMENTO' || t.diaAtual === null) return false;
    if (numeroDia === t.diaAtual) return true;
    return this.config.get('PERMITIR_EDITAR_DIAS_ANTERIORES') && numeroDia < t.diaAtual;
  }

  /** Janela de edição (X1): só o dia atual, a menos que PERMITIR_EDITAR_DIAS_ANTERIORES. */
  exigirEditavel(desafio: Desafio, numeroDia: number, agora = new Date()): void {
    this.validarNumeroDia(desafio, numeroDia);
    const t = infoTempo(desafio, agora);
    if (t.status === 'NAO_INICIADO') throw new ErroApp('DESAFIO_NAO_INICIADO');
    if (t.status === 'ENCERRADO') throw new ErroApp('DESAFIO_ENCERRADO');
    if (!this.ehEditavel(desafio, numeroDia, agora)) {
      throw new ErroApp(
        'DIA_NAO_EDITAVEL',
        numeroDia > (t.diaAtual ?? 0) ? 'Este dia ainda não chegou.' : 'Só o dia de hoje pode ser editado.',
      );
    }
  }

  async invalidarRanking(desafioId: string): Promise<void> {
    await this.cache.apagar(chaveRanking(desafioId));
  }

  async salvarCheckin(
    desafio: Desafio,
    participante: Participante,
    numeroDia: number,
    dados: CheckinInput,
  ): Promise<void> {
    this.exigirEditavel(desafio, numeroDia);
    await this.prisma.$transaction(async (tx) => {
      const dia = await tx.diaDesafio.upsert({
        where: { participanteId_numeroDia: { participanteId: participante.id, numeroDia } },
        update: {
          aguaMl: dados.aguaMl,
          exercicio: dados.exercicio,
          paginasLidas: dados.paginasLidas,
          storyPostado: dados.storyPostado,
        },
        create: {
          participanteId: participante.id,
          numeroDia,
          aguaMl: dados.aguaMl,
          exercicio: dados.exercicio,
          paginasLidas: dados.paginasLidas,
          storyPostado: dados.storyPostado,
        },
      });
      await recalcularDia(tx, dia.id);
    });
    await this.invalidarRanking(desafio.id);
  }

  async progresso(desafio: Desafio, participanteId: string, agora = new Date()): Promise<MeuProgresso> {
    const t = infoTempo(desafio, agora);
    const registros = await this.prisma.diaDesafio.findMany({
      where: { participanteId },
      select: { numeroDia: true, concluido: true, invalidado: true },
    });
    const porDia = new Map(registros.map((r) => [r.numeroDia, r]));
    const dataInicio = dataIso(desafio.dataInicio);

    const dias: DiaResumo[] = [];
    for (let n = 1; n <= desafio.totalDias; n++) {
      const r = porDia.get(n);
      const concluido = r?.concluido === true && !r.invalidado;
      let situacao: SituacaoDia;
      if (r?.invalidado) situacao = 'INVALIDADO';
      else if (concluido) situacao = 'CONCLUIDO';
      else if (t.status === 'NAO_INICIADO') situacao = 'FUTURO';
      else if (t.status === 'ENCERRADO') situacao = 'NAO_CONCLUIDO';
      else if (n === t.diaAtual) situacao = 'HOJE';
      else if (n < (t.diaAtual ?? 0)) situacao = 'NAO_CONCLUIDO';
      else situacao = 'FUTURO';
      dias.push({ numeroDia: n, data: dataDoDia(dataInicio, n), situacao, concluido, invalidado: r?.invalidado ?? false });
    }

    const concluidos = dias.map((d) => d.concluido);
    const diasConcluidos = concluidos.filter(Boolean).length;
    return {
      diaAtual: t.diaAtual,
      status: t.status,
      totalDias: desafio.totalDias,
      dias,
      diasConcluidos,
      evolucao: calcularEvolucao(diasConcluidos, desafio.totalDias),
      melhorSequencia: calcularMelhorSequencia(concluidos),
      sequenciaAtual: calcularSequenciaAtual(concluidos, diaReferenciaSequencia(t, desafio.totalDias)),
    };
  }

  /** URLs assinadas (GET, 10 min). `url` = imagem cheia (ou original enquanto processa). */
  private async fotoParaResposta(f: FotoProva): Promise<FotoDia> {
    const valida = f.status === 'ENVIADA' || f.status === 'CONFIRMADA';
    const thumbUrl =
      f.status === 'CONFIRMADA' && f.thumbKey ? await this.storage.urlLeitura(f.thumbKey) : null;
    const url = valida ? await this.storage.urlLeitura(f.storageKey) : null;
    return { id: f.id, tipo: f.tipo, status: f.status, thumbUrl, url };
  }

  async detalhe(
    desafio: Desafio,
    participanteId: string,
    numeroDia: number,
  ): Promise<DiaDetalhe & { diaId: string | null; invalidadoEm: string | null }> {
    this.validarNumeroDia(desafio, numeroDia);
    const dia = await this.prisma.diaDesafio.findUnique({
      where: { participanteId_numeroDia: { participanteId, numeroDia } },
      include: { fotos: true },
    });
    const fotosOrdenadas = (dia?.fotos ?? []).sort(
      (a, b) => TIPOS_FOTO.indexOf(a.tipo) - TIPOS_FOTO.indexOf(b.tipo),
    );
    const fotos = await Promise.all(
      fotosOrdenadas.map((f) => this.fotoParaResposta(f)),
    );
    const fotosValidas: TipoFoto[] = fotos
      .filter((f) => f.status === 'ENVIADA' || f.status === 'CONFIRMADA')
      .map((f) => f.tipo);
    const base = {
      aguaMl: dia?.aguaMl ?? 0,
      exercicio: dia?.exercicio ?? false,
      paginasLidas: dia?.paginasLidas ?? 0,
      storyPostado: dia?.storyPostado ?? false,
    };
    return {
      diaId: dia?.id ?? null,
      numeroDia,
      data: dataDoDia(dataIso(desafio.dataInicio), numeroDia),
      ...base,
      concluido: dia?.concluido ?? false,
      invalidado: dia?.invalidado ?? false,
      motivoInvalidacao: dia?.motivoInvalidacao ?? null,
      invalidadoEm: dia?.invalidadoEm?.toISOString() ?? null,
      editavel: this.ehEditavel(desafio, numeroDia),
      requisitosPendentes: requisitosPendentes({ ...base, fotosValidas }),
      fotos,
    };
  }
}
