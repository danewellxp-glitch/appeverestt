import { Injectable } from '@nestjs/common';
import type { Desafio, FotoProva, Participante, Prisma, PrismaClient } from '@prisma/client';
import {
  TIPOS_FOTO,
  TOLERANCIA_VIRADA_MS,
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
import { CacheService, chavesDoRanking } from '../../redis/redis.module';
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

/**
 * Uma foto por tipo para a tela: durante uma troca há a recebida e a nova PENDENTE (R17). Mostra a
 * recebida (é a que vale até a nova ser confirmada); só pendente, mostra a mais recente.
 */
export function umaFotoPorTipo<F extends Pick<FotoProva, 'tipo' | 'status' | 'criadoEm'>>(fotos: F[]): F[] {
  const porTipo = new Map<TipoFoto, F>();
  for (const f of fotos) {
    const atual = porTipo.get(f.tipo);
    const melhor =
      !atual ||
      (atual.status === 'PENDENTE' && f.status !== 'PENDENTE') ||
      (atual.status === 'PENDENTE' && f.status === 'PENDENTE' && f.criadoEm > atual.criadoEm);
    if (melhor) porTipo.set(f.tipo, f);
  }
  return [...porTipo.values()];
}

/** `numeroDia` é o dia corrente do desafio no instante `agora`. */
function ehDiaCorrente(desafio: Desafio, numeroDia: number, agora: Date): boolean {
  const t = infoTempo(desafio, agora);
  return t.status === 'EM_ANDAMENTO' && t.diaAtual === numeroDia;
}

export interface OpcoesRecalculo {
  /** Edição do dia (check-in, foto confirmada/removida/rejeitada, invalidação): volta para a fila de conferência (X8). */
  zerarConferencia?: boolean;
}

/** Recalcula `concluido` a partir do banco (fotos ENVIADA/CONFIRMADA). Única fonte do campo. */
export async function recalcularDia(db: Cliente, diaId: string, opcoes: OpcoesRecalculo = {}): Promise<boolean> {
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
  const zerar = opcoes.zerarConferencia === true && dia.conferidoEm !== null;
  if (concluido !== dia.concluido || zerar) {
    await db.diaDesafio.update({
      where: { id: diaId },
      data: { concluido, ...(zerar ? { conferidoEm: null, conferidoPorId: null } : {}) },
    });
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
    // O dia de hoje, ou o dia que era hoje há 5 min (tolerância da virada, X18). Cobre também o
    // último dia logo depois da meia-noite em que o desafio passa a ENCERRADO.
    if (ehDiaCorrente(desafio, numeroDia, agora)) return true;
    if (ehDiaCorrente(desafio, numeroDia, new Date(agora.getTime() - TOLERANCIA_VIRADA_MS))) return true;
    const t = infoTempo(desafio, agora);
    if (t.status !== 'EM_ANDAMENTO' || t.diaAtual === null) return false;
    return this.config.get('PERMITIR_EDITAR_DIAS_ANTERIORES') && numeroDia < t.diaAtual;
  }

  /**
   * Janela de edição (X1): só o dia atual (com a tolerância da virada, X18), a menos que
   * PERMITIR_EDITAR_DIAS_ANTERIORES.
   */
  exigirEditavel(desafio: Desafio, numeroDia: number, agora = new Date()): void {
    this.validarNumeroDia(desafio, numeroDia);
    if (this.ehEditavel(desafio, numeroDia, agora)) return;
    const t = infoTempo(desafio, agora);
    if (t.status === 'NAO_INICIADO') throw new ErroApp('DESAFIO_NAO_INICIADO');
    if (t.status === 'ENCERRADO') throw new ErroApp('DESAFIO_ENCERRADO');
    throw new ErroApp(
      'DIA_NAO_EDITAVEL',
      numeroDia > (t.diaAtual ?? 0) ? 'Este dia ainda não chegou.' : 'Só o dia de hoje pode ser editado.',
    );
  }

  async invalidarRanking(desafioId: string): Promise<void> {
    await this.cache.apagar(...chavesDoRanking(desafioId));
  }

  async salvarCheckin(
    desafio: Desafio,
    participante: Participante,
    numeroDia: number,
    dados: CheckinInput,
  ): Promise<void> {
    this.exigirEditavel(desafio, numeroDia);
    const mudou = await this.prisma.$transaction(async (tx) => {
      // Salvar o mesmo check-in de novo (autosave, outra aba) não é edição: não devolve o dia
      // aprovado para a fila de conferência (X8).
      const atual = await tx.diaDesafio.findUnique({
        where: { participanteId_numeroDia: { participanteId: participante.id, numeroDia } },
        select: { aguaMl: true, exercicio: true, paginasLidas: true, storyPostado: true },
      });
      if (
        atual &&
        atual.aguaMl === dados.aguaMl &&
        atual.exercicio === dados.exercicio &&
        atual.paginasLidas === dados.paginasLidas &&
        atual.storyPostado === dados.storyPostado
      ) {
        return false;
      }
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
      await recalcularDia(tx, dia.id, { zerarConferencia: true });
      return true;
    });
    if (mudou) await this.invalidarRanking(desafio.id);
  }

  /** `paraAdmin`: dias concluídos ainda não aprovados aparecem como AGUARDANDO_CONFERENCIA. */
  async progresso(
    desafio: Desafio,
    participanteId: string,
    agora = new Date(),
    opcoes: { paraAdmin?: boolean } = {},
  ): Promise<MeuProgresso> {
    const t = infoTempo(desafio, agora);
    const registros = await this.prisma.diaDesafio.findMany({
      where: { participanteId },
      select: { numeroDia: true, concluido: true, invalidado: true, conferidoEm: true },
    });
    const porDia = new Map(registros.map((r) => [r.numeroDia, r]));
    const dataInicio = dataIso(desafio.dataInicio);

    const dias: DiaResumo[] = [];
    for (let n = 1; n <= desafio.totalDias; n++) {
      const r = porDia.get(n);
      const concluido = r?.concluido === true && !r.invalidado;
      let situacao: SituacaoDia;
      if (r?.invalidado) situacao = 'INVALIDADO';
      else if (concluido) {
        situacao = opcoes.paraAdmin && r.conferidoEm === null ? 'AGUARDANDO_CONFERENCIA' : 'CONCLUIDO';
      }
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
  ): Promise<DiaDetalhe & { diaId: string | null; invalidadoEm: string | null; conferidoEm: string | null }> {
    this.validarNumeroDia(desafio, numeroDia);
    const dia = await this.prisma.diaDesafio.findUnique({
      where: { participanteId_numeroDia: { participanteId, numeroDia } },
      include: { fotos: true },
    });
    const fotosOrdenadas = umaFotoPorTipo(dia?.fotos ?? []).sort(
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
      conferidoEm: dia?.conferidoEm?.toISOString() ?? null,
      editavel: this.ehEditavel(desafio, numeroDia),
      requisitosPendentes: requisitosPendentes({ ...base, fotosValidas }),
      fotos,
    };
  }
}
