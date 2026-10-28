import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { type DadosProcessarFoto, FILA_FOTOS, JOB_LIMPAR, JOB_PROCESSAR } from './fotos.constantes';
import { ProcessamentoFotoService } from './processamento.service';

@Processor(FILA_FOTOS, { concurrency: 2 })
export class FotosProcessor extends WorkerHost {
  private readonly logger = new Logger(FotosProcessor.name);

  constructor(private readonly processamento: ProcessamentoFotoService) {
    super();
  }

  async process(job: Job<DadosProcessarFoto>): Promise<string | number> {
    switch (job.name) {
      case JOB_PROCESSAR:
        return this.processamento.processar(job.data.fotoId);
      case JOB_LIMPAR: {
        const n = await this.processamento.limparPendentes();
        if (n > 0) this.logger.log(`Limpeza: ${n} foto(s) pendente(s) removida(s).`);
        return n;
      }
      default:
        this.logger.warn(`Job desconhecido na fila ${FILA_FOTOS}: ${job.name}`);
        return 'IGNORADO';
    }
  }
}
