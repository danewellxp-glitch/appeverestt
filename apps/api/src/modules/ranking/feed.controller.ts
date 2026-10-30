import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { FeedResposta } from '@everest/shared';
import { UsuarioAtual } from '../../common/decorators/usuario-atual.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { UsuarioSessao } from '../auth/sessao';
import { DesafioService } from '../desafios/desafio.service';
import { FeedService } from './feed.service';

const EXEMPLO: FeedResposta = {
  diaAtual: 17,
  fecharamHoje: 23,
  avataresHoje: [
    { nomeExibicao: 'Maria L.', iniciais: 'ML', fotoUrl: 'https://lh3.googleusercontent.com/a/...' },
    { nomeExibicao: 'João P.', iniciais: 'JP', fotoUrl: null },
  ],
  maiorSequenciaAtiva: { nomeExibicao: 'Carla S.', dias: 16 },
  vagasOcupadas: 47,
  totalVagas: 50,
};

@ApiTags('ranking')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller('desafios/:slug/feed')
export class FeedController {
  constructor(
    private readonly desafios: DesafioService,
    private readonly feeds: FeedService,
  ) {}

  @Get()
  @ApiOkResponse({
    description: 'Atividade do grupo no dia atual. Inscrito ou admin. Cache de 60 s.',
    schema: { example: EXEMPLO },
  })
  async obter(@Param('slug') slug: string, @UsuarioAtual() usuario: UsuarioSessao): Promise<FeedResposta> {
    const desafio =
      usuario.papel === 'ADMIN'
        ? await this.desafios.porSlug(slug)
        : (await this.desafios.exigirParticipante(slug, usuario.id)).desafio;
    return this.feeds.feed(desafio);
  }
}
