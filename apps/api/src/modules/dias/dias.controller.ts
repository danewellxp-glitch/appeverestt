import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  checkinSchema,
  numeroDiaSchema,
  type CheckinInput,
  type DiaDetalhe,
  type MeuProgresso,
} from '@everest/shared';
import { UsuarioAtual } from '../../common/decorators/usuario-atual.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodBody } from '../../common/swagger';
import type { UsuarioSessao } from '../auth/sessao';
import { DesafioService } from '../desafios/desafio.service';
import { DiaService } from './dia.service';

const EXEMPLO_DIA: DiaDetalhe = {
  numeroDia: 4,
  data: '2026-11-04',
  aguaMl: 2250,
  exercicio: true,
  paginasLidas: 10,
  storyPostado: false,
  concluido: false,
  invalidado: false,
  motivoInvalidacao: null,
  editavel: true,
  requisitosPendentes: ['AGUA', 'FOTOS', 'STORY'],
  fotos: [{ id: 'ckx...', tipo: 'AGUA', status: 'CONFIRMADA', thumbUrl: 'https://...', url: 'https://...' }],
};

const EXEMPLO_PROGRESSO: MeuProgresso = {
  diaAtual: 4,
  status: 'EM_ANDAMENTO',
  totalDias: 30,
  dias: [
    { numeroDia: 1, data: '2026-11-01', situacao: 'CONCLUIDO', concluido: true, invalidado: false },
    { numeroDia: 4, data: '2026-11-04', situacao: 'HOJE', concluido: false, invalidado: false },
  ],
  diasConcluidos: 3,
  evolucao: 10,
  melhorSequencia: 3,
  sequenciaAtual: 3,
};

@ApiTags('check-in')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller('desafios/:slug')
export class DiasController {
  constructor(
    private readonly desafios: DesafioService,
    private readonly dias: DiaService,
  ) {}

  @Get('meu-progresso')
  @ApiOkResponse({ schema: { example: EXEMPLO_PROGRESSO } })
  async meuProgresso(
    @Param('slug') slug: string,
    @UsuarioAtual() usuario: UsuarioSessao,
  ): Promise<MeuProgresso> {
    const { desafio, participante } = await this.desafios.exigirParticipante(slug, usuario.id);
    return this.dias.progresso(desafio, participante.id);
  }

  @Get('dias/:n')
  @ApiOkResponse({ schema: { example: EXEMPLO_DIA } })
  async obter(
    @Param('slug') slug: string,
    @Param('n', new ZodValidationPipe(numeroDiaSchema)) n: number,
    @UsuarioAtual() usuario: UsuarioSessao,
  ): Promise<DiaDetalhe> {
    const { desafio, participante } = await this.desafios.exigirParticipante(slug, usuario.id);
    const { diaId: _diaId, invalidadoEm: _invalidadoEm, conferidoEm: _conferidoEm, ...dia } = await this.dias.detalhe(
      desafio,
      participante.id,
      n,
    );
    return dia;
  }

  @Put('dias/:n')
  @ApiZodBody(checkinSchema, { aguaMl: 2250, exercicio: true, paginasLidas: 10, storyPostado: false })
  @ApiOkResponse({ description: '`concluido` é sempre recalculado no servidor.', schema: { example: EXEMPLO_DIA } })
  async salvar(
    @Param('slug') slug: string,
    @Param('n', new ZodValidationPipe(numeroDiaSchema)) n: number,
    @Body(new ZodValidationPipe(checkinSchema)) body: CheckinInput,
    @UsuarioAtual() usuario: UsuarioSessao,
  ): Promise<DiaDetalhe> {
    const { desafio, participante } = await this.desafios.exigirParticipante(slug, usuario.id);
    await this.dias.salvarCheckin(desafio, participante, n, body);
    const { diaId: _diaId, invalidadoEm: _invalidadoEm, conferidoEm: _conferidoEm, ...dia } = await this.dias.detalhe(
      desafio,
      participante.id,
      n,
    );
    return dia;
  }
}
