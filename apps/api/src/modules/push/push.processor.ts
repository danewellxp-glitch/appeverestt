import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ehAcaoRapida } from '@everest/shared';
import type { Job } from 'bullmq';
import { type DadosLembrete, FILA_PUSH, JOB_LEMBRETE } from './push.constantes';
import { PushService } from './push.service';

@Processor(FILA_PUSH, { concurrency: 1 })
export class PushProcessor extends WorkerHost {
  private readonly logger = new Logger(PushProcessor.name);

  constructor(private readonly push: PushService) {
    super();
  }

  async process(job: Job<DadosLembrete>): Promise<string | number> {
    if (job.name !== JOB_LEMBRETE || !ehAcaoRapida(job.data?.acao)) {
      this.logger.warn(`Job desconhecido na fila ${FILA_PUSH}: ${job.name}`);
      return 'IGNORADO';
    }
    const r = await this.push.enviarLembrete(job.data.acao);
    return r ? r.entregues : 'SEM_ENVIO';
  }
}
