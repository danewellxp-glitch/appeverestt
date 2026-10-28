import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { DesafioAtual } from '@everest/shared';
import { DesafioService } from './desafio.service';

const EXEMPLO: DesafioAtual = {
  id: 'ckx...',
  nome: 'Desafio 30 Dias Everest',
  slug: 'desafio-30-everest',
  dataInicio: '2026-11-01',
  dataFim: '2026-11-30',
  totalDias: 30,
  status: 'NAO_INICIADO',
  diaAtual: null,
  diasParaInicio: 5,
  totalVagas: 50,
  vagasDisponiveis: 42,
  inscricoesAbertas: true,
  instagramHandle: 'everest',
  hashtag: 'DESAFIO30EVEREST',
  timezone: 'America/Sao_Paulo',
};

@ApiTags('desafios')
@Controller('desafios')
export class DesafiosController {
  constructor(private readonly desafios: DesafioService) {}

  @Get('atual')
  @ApiOkResponse({ description: 'Desafio ativo (público).', schema: { example: EXEMPLO } })
  atual(): Promise<DesafioAtual> {
    return this.desafios.atual();
  }
}
