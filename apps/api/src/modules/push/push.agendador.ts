import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { AppConfig } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  FILA_PUSH,
  JOB_LEMBRETE,
  PREFIXO_LEMBRETE,
  agendamentosDosLembretes,
  type AgendamentoLembrete,
  type DadosLembrete,
} from './push.constantes';

/**
 * Agenda os lembretes fixos (LEMBRETES_PUSH) como job schedulers do BullMQ, em cron no fuso do
 * desafio ativo. Os ids são estáveis (`lembrete-agua-10`), então sincronizar de novo só troca o fuso.
 * Roda no boot e quando o admin ativa/desativa um desafio. Se o desafio não estiver EM_ANDAMENTO na
 * hora, o job não envia nada (PushService.enviarLembrete).
 */
@Injectable()
export class PushAgendador implements OnModuleInit {
  private readonly logger = new Logger(PushAgendador.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
    @InjectQueue(FILA_PUSH) private readonly fila: Queue<DadosLembrete>,
  ) {}

  async onModuleInit(): Promise<void> {
    // Nos testes automatizados os agendamentos só são criados quando o teste pede (sincronizar()).
    if (this.config.get('NODE_ENV') === 'test') return;
    await this.sincronizarSemFalhar();
  }

  /** Recria os agendamentos e apaga os que não existem mais. Devolve o que ficou agendado. */
  async sincronizar(): Promise<AgendamentoLembrete[]> {
    const desafio = await this.prisma.desafio.findFirst({ where: { ativo: true }, select: { timezone: true } });
    const desejados = agendamentosDosLembretes(desafio?.timezone);
    for (const a of desejados) {
      await this.fila.upsertJobScheduler(
        a.id,
        { pattern: a.pattern, tz: a.tz },
        { name: JOB_LEMBRETE, data: { acao: a.acao }, opts: { removeOnComplete: 50, removeOnFail: 50 } },
      );
    }
    const ids = new Set(desejados.map((a) => a.id));
    const existentes = await this.fila.getJobSchedulers();
    for (const s of existentes) {
      const id = s.key;
      if (id.startsWith(PREFIXO_LEMBRETE) && !ids.has(id)) await this.fila.removeJobScheduler(id);
    }
    return desejados;
  }

  /** Para os hooks (boot, admin): uma falha no Redis não pode derrubar a requisição nem o boot. */
  async sincronizarSemFalhar(): Promise<void> {
    try {
      const a = await this.sincronizar();
      this.logger.log(`Lembretes push agendados (${a.length}) no fuso ${a[0]?.tz ?? '-'}.`);
    } catch (e) {
      this.logger.error(`Não foi possível agendar os lembretes push: ${String(e)}`);
    }
  }
}
