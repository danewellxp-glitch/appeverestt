import { Global, Module } from '@nestjs/common';
import { PagamentoController } from './pagamento.controller';
import { PagamentoService } from './pagamento.service';
import { PixService } from './pix.service';

/** Global para o `DesafioService` (também global) receber o `PixService` sem import circular. */
@Global()
@Module({
  controllers: [PagamentoController],
  providers: [PixService, PagamentoService],
  exports: [PixService],
})
export class PagamentoModule {}
