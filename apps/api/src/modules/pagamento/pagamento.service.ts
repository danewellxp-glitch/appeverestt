import { Injectable } from '@nestjs/common';
import type { Desafio, Participante } from '@prisma/client';
import type { PagamentoResposta } from '@everest/shared';
import { ErroApp } from '../../common/erros';
import { PrismaService } from '../../prisma/prisma.service';
import { DesafioService } from '../desafios/desafio.service';
import { PixService } from './pix.service';

/** Pagamento da inscrição por Pix manual (X12), do lado do participante. */
@Injectable()
export class PagamentoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly desafios: DesafioService,
    private readonly pix: PixService,
  ) {}

  private resposta(desafio: Desafio, p: Participante): PagamentoResposta {
    return {
      status: p.pagamentoStatus,
      vagaNumero: p.vagaNumero,
      informadoEm: p.pagamentoInformadoEm?.toISOString() ?? null,
      confirmadoEm: p.pagamentoConfirmadoEm?.toISOString() ?? null,
      pix: this.pix.pix,
      contatoInstagram: desafio.instagramHandle,
    };
  }

  /** Sem gate de pagamento: é a tela de quem ainda não pagou. */
  async obter(slug: string, usuarioId: string): Promise<PagamentoResposta> {
    const { desafio, participante } = await this.desafios.exigirParticipante(slug, usuarioId, {
      exigirPagamento: false,
    });
    return this.resposta(desafio, participante);
  }

  /**
   * "Já fiz o pagamento": PENDENTE → INFORMADO. Idempotente (INFORMADO de novo não mexe em
   * `informadoEm`); CONFIRMADO → 409 PAGAMENTO_JA_CONFIRMADO; sem Pix configurado → 503.
   */
  async informar(slug: string, usuarioId: string): Promise<PagamentoResposta> {
    const { desafio, participante } = await this.desafios.exigirParticipante(slug, usuarioId, {
      exigirPagamento: false,
    });
    if (participante.pagamentoStatus === 'CONFIRMADO') throw new ErroApp('PAGAMENTO_JA_CONFIRMADO');
    if (!this.pix.pix) throw new ErroApp('PAGAMENTO_INDISPONIVEL');

    // Condição no próprio UPDATE: corrida com a confirmação do admin não volta o status.
    await this.prisma.participante.updateMany({
      where: { id: participante.id, pagamentoStatus: 'PENDENTE' },
      data: { pagamentoStatus: 'INFORMADO', pagamentoInformadoEm: new Date() },
    });
    const atual = await this.prisma.participante.findUnique({ where: { id: participante.id } });
    if (!atual) throw new ErroApp('NAO_INSCRITO');
    if (atual.pagamentoStatus === 'CONFIRMADO') throw new ErroApp('PAGAMENTO_JA_CONFIRMADO');
    return this.resposta(desafio, atual);
  }
}
