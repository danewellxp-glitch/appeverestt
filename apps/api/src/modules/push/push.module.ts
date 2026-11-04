import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import webpush from 'web-push';
import { AcoesRapidasController } from './acoes-rapidas.controller';
import { AcoesRapidasService } from './acoes-rapidas.service';
import { PushAgendador } from './push.agendador';
import { FILA_PUSH, WEB_PUSH, type ClienteWebPush } from './push.constantes';
import { PushController } from './push.controller';
import { PushProcessor } from './push.processor';
import { PushService } from './push.service';

/** Notificações push (R22). A conexão do BullMQ (forRootAsync) fica no AppModule. */
@Module({
  imports: [BullModule.registerQueue({ name: FILA_PUSH })],
  controllers: [PushController, AcoesRapidasController],
  providers: [
    { provide: WEB_PUSH, useValue: webpush satisfies ClienteWebPush },
    PushService,
    PushAgendador,
    PushProcessor,
    AcoesRapidasService,
  ],
  exports: [PushService, PushAgendador],
})
export class PushModule {}
