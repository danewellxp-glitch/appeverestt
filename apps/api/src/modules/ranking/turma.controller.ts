import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  cutucadaSchema,
  numeroDiaSchema,
  poseDiaSchema,
  type CutucadaInput,
  type CutucadaResposta,
  type PoseDiaInput,
  type PoseDiaResposta,
  type TreinosTurmaResposta,
  type TurmaHojeResposta,
} from '@everest/shared';
import { UsuarioAtual } from '../../common/decorators/usuario-atual.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodBody } from '../../common/swagger';
import type { UsuarioSessao } from '../auth/sessao';
import { DesafioService } from '../desafios/desafio.service';
import { CutucadaService } from './cutucada.service';
import { TreinosService } from './treinos.service';
import { TurmaService } from './turma.service';

const PESSOA = { nomeExibicao: 'Maria L.', iniciais: 'ML', fotoUrl: 'https://lh3.googleusercontent.com/a/...' };

const EXEMPLO_HOJE: TurmaHojeResposta = {
  diaAtual: 12,
  status: 'EM_ANDAMENTO',
  totalParticipantes: 2,
  fecharam: [{ participanteId: 'ckx1', ...PESSOA, concluidoEm: '2026-11-12T10:42:00.000Z', aceitaCutucadas: true }],
  faltam: [
    { participanteId: 'ckx2', nomeExibicao: 'João P.', iniciais: 'JP', fotoUrl: null, concluidoEm: null, aceitaCutucadas: true },
  ],
  minhasCutucadasHoje: ['ckx2'],
};

const EXEMPLO_POSE = { texto: 'Flexão segurando o livro', autor: PESSOA, criadoEm: '2026-11-12T09:10:00.000Z' };

const EXEMPLO_TREINOS: TreinosTurmaResposta = {
  diaAtual: 12,
  dia: 12,
  status: 'EM_ANDAMENTO',
  pose: EXEMPLO_POSE,
  possoSugerirPose: false,
  fotos: [
    {
      participanteId: 'ckx1',
      ...PESSOA,
      thumbUrl: 'https://storage/...thumb.webp',
      url: 'https://storage/...webp',
      concluidoDia: true,
      minha: false,
    },
  ],
};

const pipeDiaOpcional = new ZodValidationPipe(numeroDiaSchema.optional());

/** Hub da turma (R23): aba Hoje (cutucadas) e aba Treinos (fotos do treino e pose do dia). */
@ApiTags('ranking')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller('desafios/:slug')
export class TurmaController {
  constructor(
    private readonly desafios: DesafioService,
    private readonly turma: TurmaService,
    private readonly cutucadas: CutucadaService,
    private readonly treinos: TreinosService,
  ) {}

  @Get('turma/hoje')
  @ApiOkResponse({
    description:
      'Quem fechou o dia atual (mais recentes primeiro) e quem falta (ordem do ranking, sem contas excluídas). ' +
      'Só pagamento confirmado. Cache de 60 s (menos `minhasCutucadasHoje`).',
    schema: { example: EXEMPLO_HOJE },
  })
  async hoje(@Param('slug') slug: string, @UsuarioAtual() usuario: UsuarioSessao): Promise<TurmaHojeResposta> {
    const { desafio, participante } = await this.desafios.exigirParticipante(slug, usuario.id);
    return this.turma.hoje(desafio, participante.id);
  }

  @Post('cutucadas')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiZodBody(cutucadaSchema, { participanteId: 'ckx2' })
  @ApiOkResponse({
    description:
      'Cutuca quem ainda não fechou o dia (push). 1 por pessoa por dia (409 JA_CUTUCOU); 409 CUTUCADA_RECUSADA ' +
      'se a pessoa desligou as cutucadas ou já fechou. `entregue: false` = sem push ativo (fica registrada).',
    schema: { example: { entregue: true } satisfies CutucadaResposta },
  })
  async cutucar(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(cutucadaSchema)) body: CutucadaInput,
    @UsuarioAtual() usuario: UsuarioSessao,
  ): Promise<CutucadaResposta> {
    const { desafio, participante } = await this.desafios.exigirParticipante(slug, usuario.id);
    return this.cutucadas.cutucar(desafio, participante, body.participanteId);
  }

  @Get('turma/treinos')
  @ApiQuery({ name: 'dia', required: false, type: Number, description: 'Padrão: o dia atual. De 1 até o dia atual.' })
  @ApiOkResponse({
    description:
      'Fotos do treino que a turma pode ver (URLs assinadas de 10 min; cache de 60 s) e a pose do dia. ' +
      'Água e leitura nunca aparecem.',
    schema: { example: EXEMPLO_TREINOS },
  })
  async listarTreinos(
    @Param('slug') slug: string,
    @Query('dia', pipeDiaOpcional) dia: number | undefined,
    @UsuarioAtual() usuario: UsuarioSessao,
  ): Promise<TreinosTurmaResposta> {
    const { desafio, participante } = await this.desafios.exigirParticipante(slug, usuario.id);
    return this.treinos.treinos(desafio, participante.id, dia);
  }

  @Post('turma/pose')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiZodBody(poseDiaSchema, { texto: 'Flexão segurando o livro' })
  @ApiOkResponse({
    description:
      'Sugere a pose do dia atual. Só quem já mandou a foto do treino hoje (403 POSE_SEM_TREINO) e só a ' +
      'primeira (409 POSE_JA_DEFINIDA).',
    schema: { example: { pose: EXEMPLO_POSE } satisfies PoseDiaResposta },
  })
  async sugerirPose(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(poseDiaSchema)) body: PoseDiaInput,
    @UsuarioAtual() usuario: UsuarioSessao,
  ): Promise<PoseDiaResposta> {
    const { desafio, participante } = await this.desafios.exigirParticipante(slug, usuario.id);
    return this.treinos.sugerirPose(desafio, participante, body);
  }
}
