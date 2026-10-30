import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiForbiddenResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { feedbackSchema, type FeedbackInput, type FeedbackResposta } from '@everest/shared';
import { UsuarioAtual } from '../../common/decorators/usuario-atual.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodBody } from '../../common/swagger';
import type { UsuarioSessao } from '../auth/sessao';
import { FeedbackService } from './feedback.service';

const EXEMPLO = {
  feedback: {
    nota: 5,
    oQueAchou: 'Foi puxado, mas o grupo ajudou demais a não largar no meio.',
    oQueMudou: 'Passei a dormir melhor e a ler todo dia antes de deitar.',
    autorizaDivulgacao: true,
    atualizadoEm: '2026-11-30T22:15:00.000Z',
  },
} satisfies FeedbackResposta;

@ApiTags('feedback')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller('desafios/:slug/feedback')
export class FeedbackController {
  constructor(private readonly feedbacks: FeedbackService) {}

  @Get()
  @ApiOkResponse({ description: 'Feedback do participante (`feedback: null` se ainda não enviou).', schema: { example: EXEMPLO } })
  @ApiForbiddenResponse({ description: 'NAO_INSCRITO ou PAGAMENTO_PENDENTE.' })
  obter(@Param('slug') slug: string, @UsuarioAtual() usuario: UsuarioSessao): Promise<FeedbackResposta> {
    return this.feedbacks.obter(slug, usuario.id);
  }

  @Put()
  @ApiZodBody(feedbackSchema, {
    nota: 5,
    oQueAchou: 'Foi puxado, mas o grupo ajudou demais a não largar no meio.',
    oQueMudou: 'Passei a dormir melhor e a ler todo dia antes de deitar.',
    autorizaDivulgacao: true,
  })
  @ApiOkResponse({ description: 'Cria ou atualiza (1 por participante).', schema: { example: EXEMPLO } })
  @ApiForbiddenResponse({ description: 'NAO_INSCRITO ou PAGAMENTO_PENDENTE.' })
  salvar(
    @Param('slug') slug: string,
    @UsuarioAtual() usuario: UsuarioSessao,
    @Body(new ZodValidationPipe(feedbackSchema)) body: FeedbackInput,
  ): Promise<FeedbackResposta> {
    return this.feedbacks.salvar(slug, usuario.id, body);
  }
}
