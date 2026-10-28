import { Module } from '@nestjs/common';
import { InscricoesController } from './inscricoes.controller';

@Module({ controllers: [InscricoesController] })
export class InscricoesModule {}
