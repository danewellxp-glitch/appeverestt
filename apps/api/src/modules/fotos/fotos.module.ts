import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AppConfig } from '../../config/app-config.service';
import { opcoesRedis } from '../../redis/conexao';
import { FILA_FOTOS } from './fotos.constantes';
import { FotosController } from './fotos.controller';
import { FotosProcessor } from './fotos.processor';
import { FotosService } from './fotos.service';
import { ProcessamentoFotoService } from './processamento.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [AppConfig],
      // Conexão separada do cache; o BullMQ exige maxRetriesPerRequest: null.
      useFactory: (config: AppConfig) => ({
        connection: { ...opcoesRedis(config.get('REDIS_URL')), maxRetriesPerRequest: null },
      }),
    }),
    BullModule.registerQueue({ name: FILA_FOTOS }),
  ],
  controllers: [FotosController],
  providers: [FotosService, ProcessamentoFotoService, FotosProcessor],
  exports: [ProcessamentoFotoService],
})
export class FotosModule {}
