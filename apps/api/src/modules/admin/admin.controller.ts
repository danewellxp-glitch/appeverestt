import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import {
  adicionarParticipanteSchema,
  conferenciaSchema,
  invalidacaoSchema,
  numeroDiaSchema,
  pagamentoAdminSchema,
  type AdicionarParticipanteInput,
  type AdminDiaDetalhe,
  type AdminFeedbacksResposta,
  type AdminPagamento,
  type AdminParticipante,
  type AdminParticipanteDetalhe,
  type AdminParticipantesResposta,
  type ConferenciaInput,
  type ConferenciaResposta,
  type InvalidacaoInput,
  type InvalidacaoResposta,
  type PagamentoAdminInput,
} from '@everest/shared';
import { UsuarioAtual } from '../../common/decorators/usuario-atual.decorator';
import { AdminGuard } from '../../common/guards/admin.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodBody } from '../../common/swagger';
import type { UsuarioSessao } from '../auth/sessao';
import { AdminService } from './admin.service';
import { nomeArquivoCsv } from './csv';

const EXEMPLO_PARTICIPANTE = {
  participanteId: 'ckx1',
  usuarioId: 'ckx2',
  nome: 'Maria Souza Lima',
  email: 'maria@exemplo.com',
  instagram: 'maria.lima',
  whatsapp: '11987654321',
  vagaNumero: 2,
  ehEmbaixador: false,
  dataInscricao: '2026-10-20T12:00:00.000Z',
  pagamentoStatus: 'INFORMADO',
  pagamentoInformadoEm: '2026-10-20T12:07:00.000Z',
  pagamentoConfirmadoEm: null,
  contaExcluida: false,
  diasConcluidos: 3,
  diasInvalidados: 0,
  paraRevisar: 2,
  diasFotoParecida: [3],
  temFeedback: false,
} satisfies AdminParticipante;

const EXEMPLO_FEEDBACK = {
  nota: 5,
  oQueAchou: 'Foi puxado, mas o grupo ajudou demais a não largar no meio.',
  oQueMudou: 'Passei a dormir melhor e a ler todo dia antes de deitar.',
  autorizaDivulgacao: true,
  atualizadoEm: '2026-11-30T22:15:00.000Z',
};

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
        participantes: [EXEMPLO_PARTICIPANTE],
        totalParaRevisar: 2,
        totalPagamentosInformados: 1,
      } satisfies AdminParticipantesResposta,
    },
  })
  participantes(@Param('slug') slug: string): Promise<AdminParticipantesResposta> {
    return this.admin.participantes(slug);
  }

  @Post('desafios/:slug/participantes')
  @ApiZodBody(adicionarParticipanteSchema, { email: 'maria@exemplo.com', pagamentoStatus: 'CONFIRMADO' })
  @ApiCreatedResponse({
    description:
      'Inscreve quem já tem conta no app (pelo e-mail), na menor vaga livre, mesmo com as inscrições ' +
      'fechadas ou o perfil incompleto. Padrão: pagamento CONFIRMADO (grava quando e qual admin); ' +
      'INFORMADO grava o aviso agora.',
    schema: {
      example: {
        ...EXEMPLO_PARTICIPANTE,
        pagamentoStatus: 'CONFIRMADO',
        pagamentoInformadoEm: null,
        pagamentoConfirmadoEm: '2026-10-20T12:00:00.000Z',
        diasConcluidos: 0,
        paraRevisar: 0,
        diasFotoParecida: [],
      } satisfies AdminParticipante,
    },
  })
  @ApiNotFoundResponse({ description: 'NAO_ENCONTRADO: desafio inexistente ou nenhuma conta com esse e-mail.' })
  @ApiConflictResponse({ description: 'JA_INSCRITO, VAGAS_ESGOTADAS ou DESAFIO_ENCERRADO.' })
  adicionar(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(adicionarParticipanteSchema)) body: AdicionarParticipanteInput,
    @UsuarioAtual() usuario: UsuarioSessao,
  ): Promise<AdminParticipante> {
    return this.admin.adicionar(slug, usuario.id, body);
  }

  // Declarada ANTES de `participantes/:id` (senão "participantes.csv" cairia no :id).
  @Get('desafios/:slug/participantes.csv')
  @Header('Cache-Control', 'no-store')
  @ApiProduces('text/csv')
  @ApiOkResponse({
    description:
      'Dados de todos os participantes (UTF-8 com BOM, separador ";", CRLF; abre direto no Excel). ' +
      'Colunas: vaga, nome, e-mail, instagram, whatsapp, nascimento, bairro, cidade, UF, inscrição, pagamento, ' +
      'informado em, confirmado em, dias concluídos, dias invalidados, marketing, nota do feedback, ' +
      'autoriza divulgação, conta excluída.',
    schema: { type: 'string', example: '﻿Vaga;Nome;E-mail;...\r\n2;Maria Souza Lima;maria@exemplo.com;...\r\n' },
  })
  async participantesCsv(
    @Param('slug') slug: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const { conteudo, slug: slugReal } = await this.admin.csv(slug);
    res.type('text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivoCsv(slugReal)}"`);
    return conteudo;
  }

  @Get('desafios/:slug/participantes/:id')
  @ApiOkResponse({
    description:
      'Dados de cadastro, pagamento, feedback e progresso. `removivel` = pode remover a inscrição ' +
      '(não é do embaixador e não tem check-ins).',
    schema: {
      example: {
        participante: EXEMPLO_PARTICIPANTE,
        dados: {
          email: 'maria@exemplo.com',
          instagram: 'maria.lima',
          whatsapp: '11987654321',
          dataNascimento: '1995-04-12',
          idade: 31,
          bairro: 'Pinheiros',
          cidade: 'São Paulo',
          uf: 'SP',
          aceitouTermosEm: '2026-10-20T11:58:00.000Z',
          aceitouMarketingEm: null,
          criadoEm: '2026-10-20T11:55:00.000Z',
          excluidoEm: null,
        },
        pagamento: { status: 'INFORMADO', informadoEm: '2026-10-20T12:07:00.000Z', confirmadoEm: null },
        feedback: null,
        progresso: {
          diaAtual: 4,
          status: 'EM_ANDAMENTO',
          totalDias: 30,
          dias: [],
          diasConcluidos: 3,
          evolucao: 10,
          melhorSequencia: 3,
          sequenciaAtual: 3,
        },
        removivel: false,
      } satisfies AdminParticipanteDetalhe,
    },
  })
  @ApiNotFoundResponse({ description: 'NAO_ENCONTRADO.' })
  participante(@Param('slug') slug: string, @Param('id') id: string): Promise<AdminParticipanteDetalhe> {
    return this.admin.participante(slug, id);
  }

  @Patch('desafios/:slug/participantes/:id/pagamento')
  @ApiZodBody(pagamentoAdminSchema, { status: 'CONFIRMADO' })
  @ApiOkResponse({
    description:
      'Confere o Pix (idempotente). CONFIRMADO libera o acesso; PENDENTE ("Não recebi") zera a confirmação e ' +
      'mantém `informadoEm`. 409 VALIDACAO ao tentar voltar o embaixador para PENDENTE.',
    schema: {
      example: {
        status: 'CONFIRMADO',
        informadoEm: '2026-10-20T12:07:00.000Z',
        confirmadoEm: '2026-10-20T15:30:00.000Z',
      } satisfies AdminPagamento,
    },
  })
  @ApiNotFoundResponse({ description: 'NAO_ENCONTRADO.' })
  pagamento(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(pagamentoAdminSchema)) body: PagamentoAdminInput,
    @UsuarioAtual() usuario: UsuarioSessao,
  ): Promise<AdminPagamento> {
    return this.admin.pagamento(slug, id, usuario.id, body);
  }

  @Delete('desafios/:slug/participantes/:id')
  @ApiOkResponse({
    description:
      'Remove uma inscrição sem check-ins, paga ou não (libera a vaga; o número volta a ser o menor livre). ' +
      'O feedback vai junto.',
    schema: { example: { ok: true } },
  })
  @ApiConflictResponse({ description: 'PARTICIPANTE_NAO_REMOVIVEL: embaixador ou com check-ins.' })
  @ApiNotFoundResponse({ description: 'NAO_ENCONTRADO.' })
  remover(@Param('slug') slug: string, @Param('id') id: string): Promise<{ ok: true }> {
    return this.admin.remover(slug, id);
  }

  @Get('desafios/:slug/feedbacks')
  @ApiOkResponse({
    description: 'Feedbacks do desafio, mais recentes primeiro. `media` com 1 casa (null sem feedbacks).',
    schema: {
      example: {
        feedbacks: [
          { ...EXEMPLO_FEEDBACK, participanteId: 'ckx1', nome: 'Maria Souza Lima', instagram: 'maria.lima', vagaNumero: 2 },
        ],
        total: 1,
        media: 5,
      } satisfies AdminFeedbacksResposta,
    },
  })
  feedbacks(@Param('slug') slug: string): Promise<AdminFeedbacksResposta> {
    return this.admin.feedbacks(slug);
  }

  @Get('desafios/:slug/participantes/:id/dias/:n')
  @ApiOkResponse({
    description:
      'Dia do participante para a conferência. Cada foto traz `parecida`: a foto mais parecida já enviada no ' +
      'desafio (hash perceptual, até 5 de 64 bits de diferença), de qualquer participante (`mesmaPessoa` quando é ' +
      'do próprio), ou null. Só um sinal para a revisão manual (X20): nada é rejeitado ou invalidado sozinho.',
  })
  @ApiNotFoundResponse({ description: 'NAO_ENCONTRADO.' })
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
}
