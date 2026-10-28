import { Global, Module } from '@nestjs/common';
import { DesafioService } from './desafio.service';
import { DesafiosController } from './desafios.controller';

@Global()
@Module({
  controllers: [DesafiosController],
  providers: [DesafioService],
  exports: [DesafioService],
})
export class DesafiosModule {}
