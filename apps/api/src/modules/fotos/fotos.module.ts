import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { FILA_FOTOS } from './fotos.constantes';
import { FotosController } from './fotos.controller';
import { FotosProcessor } from './fotos.processor';
import { FotosService } from './fotos.service';
import { ProcessamentoFotoService } from './processamento.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: FILA_FOTOS }),
  ],
  controllers: [FotosController],
  providers: [FotosService, ProcessamentoFotoService, FotosProcessor],
  exports: [ProcessamentoFotoService],
})
export class FotosModule {}
