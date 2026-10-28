import { Global, Module } from '@nestjs/common';
import { DiaService } from './dia.service';
import { DiasController } from './dias.controller';

@Global()
@Module({
  controllers: [DiasController],
  providers: [DiaService],
  exports: [DiaService],
})
export class DiasModule {}
