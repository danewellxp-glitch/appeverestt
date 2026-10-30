import { Controller, HttpStatus, Param, Post, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { InscricaoResposta } from '@everest/shared';
import { UsuarioAtual } from '../../common/decorators/usuario-atual.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService, chavesDoRanking, chaveVagas } from '../../redis/redis.module';
import type { UsuarioSessao } from '../auth/sessao';
import { inscrever } from './inscrever';

const EXEMPLO: InscricaoResposta = {
  criada: true,
  participacao: {
    participanteId: 'ckx...',
    desafioId: 'ckx...',
    desafioSlug: 'desafio-30-everest',
    vagaNumero: 9,
    ehEmbaixador: false,
    dataInscricao: '2026-10-27T12:00:00.000Z',
  },
};

@ApiTags('inscrições')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller('desafios/:slug/inscricao')
export class InscricoesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  @Post()
  @ApiCreatedResponse({ description: 'Inscrição criada.', schema: { example: EXEMPLO } })
  @ApiOkResponse({ description: 'Já inscrito (idempotente).', schema: { example: { ...EXEMPLO, criada: false } } })
  async inscrever(
    @Param('slug') slug: string,
    @UsuarioAtual() usuario: UsuarioSessao,
    @Res({ passthrough: true }) res: Response,
  ): Promise<InscricaoResposta> {
    const r = await inscrever(this.prisma, { slug, usuarioId: usuario.id });
    if (r.criada) {
      await this.cache.apagar(chaveVagas(r.desafioId), ...chavesDoRanking(r.desafioId));
    }
    res.status(r.criada ? HttpStatus.CREATED : HttpStatus.OK);
    const p = r.participante;
    return {
      criada: r.criada,
      participacao: {
        participanteId: p.id,
        desafioId: p.desafioId,
        desafioSlug: slug,
        vagaNumero: p.vagaNumero,
        ehEmbaixador: p.ehEmbaixador,
        dataInscricao: p.dataInscricao.toISOString(),
      },
    };
  }
}
