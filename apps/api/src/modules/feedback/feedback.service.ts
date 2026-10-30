import { Injectable } from '@nestjs/common';
import type { Feedback as FeedbackDb } from '@prisma/client';
import type { Feedback, FeedbackInput, FeedbackResposta } from '@everest/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { DesafioService } from '../desafios/desafio.service';

export function paraFeedback(f: FeedbackDb): Feedback {
  return {
    nota: f.nota,
    oQueAchou: f.oQueAchou,
    oQueMudou: f.oQueMudou,
    autorizaDivulgacao: f.autorizaDivulgacao,
    atualizadoEm: f.atualizadoEm.toISOString(),
  };
}

/** Feedback do participante (X13): 1 por participante, editável. Exige pagamento confirmado. */
@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly desafios: DesafioService,
  ) {}

  async obter(slug: string, usuarioId: string): Promise<FeedbackResposta> {
    const { participante } = await this.desafios.exigirParticipante(slug, usuarioId);
    const f = await this.prisma.feedback.findUnique({ where: { participanteId: participante.id } });
    return { feedback: f ? paraFeedback(f) : null };
  }

  async salvar(slug: string, usuarioId: string, input: FeedbackInput): Promise<FeedbackResposta> {
    const { participante } = await this.desafios.exigirParticipante(slug, usuarioId);
    const f = await this.prisma.feedback.upsert({
      where: { participanteId: participante.id },
      create: { participanteId: participante.id, ...input },
      update: input,
    });
    return { feedback: paraFeedback(f) };
  }
}
