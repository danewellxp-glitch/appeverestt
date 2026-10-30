import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  atualizarDesafioSchema,
  conferenciaSchema,
  invalidacaoSchema,
  numeroDiaSchema,
  type AdminDiaDetalhe,
  type AdminParticipanteDetalhe,
  type AdminParticipantesResposta,
  type AtualizarDesafioInput,
  type ConferenciaInput,
  type ConferenciaResposta,
  type InvalidacaoInput,
  type InvalidacaoResposta,
} from '@everest/shared';
import { UsuarioAtual } from '../../common/decorators/usuario-atual.decorator';
import { AdminGuard } from '../../common/guards/admin.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodBody } from '../../common/swagger';
import type { UsuarioSessao } from '../auth/sessao';
import { AdminService } from './admin.service';

@ApiTags('admin')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('desafios/:slug/participantes')
  @ApiOkResponse({
    schema: {
      example: {
        desafio: { slug: 'desafio-30-everest', nome: 'Desafio 30 Dias Everest', inscricoesAbertas: true, totalVagas: 50 },
        participantes: [
          {
            participanteId: 'ckx1',
            usuarioId: 'ckx2',
            nome: 'Maria Souza Lima',
            email: 'maria@exemplo.com',
            vagaNumero: 2,
            ehEmbaixador: false,
            dataInscricao: '2026-10-20T12:00:00.000Z',
            diasConcluidos: 3,
            diasInvalidados: 0,
            paraRevisar: 2,
          },
        ],
        totalParaRevisar: 2,
      } satisfies AdminParticipantesResposta,
    },
  })
  participantes(@Param('slug') slug: string): Promise<AdminParticipantesResposta> {
    return this.admin.participantes(slug);
  }

  @Get('desafios/:slug/participantes/:id')
  participante(@Param('slug') slug: string, @Param('id') id: string): Promise<AdminParticipanteDetalhe> {
    return this.admin.participante(slug, id);
  }

  @Get('desafios/:slug/participantes/:id/dias/:n')
  dia(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @Param('n', new ZodValidationPipe(numeroDiaSchema)) n: number,
  ): Promise<AdminDiaDetalhe> {
    return this.admin.dia(slug, id, n);
  }

  @Patch('dias/:diaId/invalidacao')
  @ApiZodBody(invalidacaoSchema, { invalidado: true, motivo: 'Foto de leitura repetida do dia anterior.' })
  @ApiOkResponse({
    schema: {
      example: { diaId: 'ckx', invalidado: true, concluido: false, motivoInvalidacao: 'Foto repetida' } satisfies InvalidacaoResposta,
    },
  })
  invalidacao(
    @Param('diaId') diaId: string,
    @Body(new ZodValidationPipe(invalidacaoSchema)) body: InvalidacaoInput,
    @UsuarioAtual() usuario: UsuarioSessao,
  ): Promise<InvalidacaoResposta> {
    return this.admin.invalidacao(diaId, usuario.id, body);
  }

  @Patch('dias/:diaId/conferencia')
  @ApiZodBody(conferenciaSchema, { conferido: true })
  @ApiOkResponse({
    description:
      'Aprova um dia concluído (sai da fila "para revisar"). Qualquer edição posterior do dia o devolve à fila. ' +
      '409 VALIDACAO se o dia não estiver concluído ou estiver invalidado.',
    schema: { example: { diaId: 'ckx', conferidoEm: '2026-11-04T21:10:00.000Z' } satisfies ConferenciaResposta },
  })
  conferencia(
    @Param('diaId') diaId: string,
    @Body(new ZodValidationPipe(conferenciaSchema)) body: ConferenciaInput,
    @UsuarioAtual() usuario: UsuarioSessao,
  ): Promise<ConferenciaResposta> {
    return this.admin.conferencia(diaId, usuario.id, body);
  }

  @Patch('desafios/:slug')
  @ApiZodBody(atualizarDesafioSchema, { inscricoesAbertas: false })
  atualizarDesafio(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(atualizarDesafioSchema)) body: AtualizarDesafioInput,
  ): Promise<AdminParticipantesResposta['desafio']> {
    return this.admin.atualizarDesafio(slug, body);
  }
}
