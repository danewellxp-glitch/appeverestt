import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiConflictResponse, ApiCookieAuth, ApiForbiddenResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { acaoRapidaSchema, type AcaoRapida, type AcaoRapidaResposta } from '@everest/shared';
import { z } from 'zod';
import { UsuarioAtual } from '../../common/decorators/usuario-atual.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodBody } from '../../common/swagger';
import type { UsuarioSessao } from '../auth/sessao';
import { AcoesRapidasService } from './acoes-rapidas.service';

const corpoAcaoSchema = z.object({ acao: acaoRapidaSchema });

/** Botões das notificações (R22): o service worker chama com o cookie da sessão. */
@ApiTags('check-in')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller('acoes-rapidas')
export class AcoesRapidasController {
  constructor(private readonly acoes: AcoesRapidasService) {}

  @Post()
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiZodBody(corpoAcaoSchema, { acao: 'agua' })
  @ApiOkResponse({
    description:
      'Aplica a ação no dia de hoje do desafio ativo (água +250 ml, treino feito, leitura na meta) pelo mesmo ' +
      'caminho do PUT /desafios/:slug/dias/:n. `mudou: false` quando já estava marcado (idempotente).',
    schema: { example: { mensagem: '+250 ml registrados. Total: 1.250 ml.', mudou: true, dia: { numeroDia: 4 } } },
  })
  @ApiForbiddenResponse({ description: 'NAO_INSCRITO, PAGAMENTO_PENDENTE ou PERFIL_INCOMPLETO.' })
  @ApiConflictResponse({ description: 'DESAFIO_NAO_INICIADO, DESAFIO_ENCERRADO ou DIA_NAO_EDITAVEL.' })
  aplicar(
    @Body(new ZodValidationPipe(corpoAcaoSchema)) body: { acao: AcaoRapida },
    @UsuarioAtual() usuario: UsuarioSessao,
  ): Promise<AcaoRapidaResposta> {
    return this.acoes.aplicar(usuario.id, body.acao);
  }
}
