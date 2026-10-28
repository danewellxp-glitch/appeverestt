import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { RankingResposta } from '@everest/shared';
import { UsuarioAtual } from '../../common/decorators/usuario-atual.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { UsuarioSessao } from '../auth/sessao';
import { DesafioService } from '../desafios/desafio.service';
import { RankingService } from './ranking.service';

const EXEMPLO: RankingResposta = {
  minhaPosicao: 2,
  itens: [
    {
      posicao: 1,
      participanteId: 'ckx1',
      nomeExibicao: 'Maria L.',
      ehEmbaixador: false,
      diasConcluidos: 4,
      melhorSequencia: 4,
      sequenciaAtual: 4,
      dataInscricao: '2026-10-20T12:00:00.000Z',
    },
  ],
};

@ApiTags('ranking')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller('desafios/:slug/ranking')
export class RankingController {
  constructor(
    private readonly desafios: DesafioService,
    private readonly ranking: RankingService,
  ) {}

  @Get()
  @ApiOkResponse({
    description: 'Critério: dias concluídos; desempate: melhor sequência → sequência atual → inscrição mais antiga.',
    schema: { example: EXEMPLO },
  })
  async obter(@Param('slug') slug: string, @UsuarioAtual() usuario: UsuarioSessao): Promise<RankingResposta> {
    const { desafio, participante } = await this.desafios.exigirParticipante(slug, usuario.id);
    return this.ranking.ranking(desafio, participante.id);
  }
}
