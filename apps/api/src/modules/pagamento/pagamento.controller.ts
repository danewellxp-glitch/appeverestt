import { Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { PagamentoResposta } from '@everest/shared';
import { UsuarioAtual } from '../../common/decorators/usuario-atual.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { UsuarioSessao } from '../auth/sessao';
import { PagamentoService } from './pagamento.service';

const EXEMPLO = {
  status: 'PENDENTE',
  vagaNumero: 9,
  informadoEm: null,
  confirmadoEm: null,
  pix: {
    copiaECola:
      '00020101021126560014br.gov.bcb.pix0115pix@exemplo.dev0215DESAFIO 30 DIAS520400005303986540550.005802BR5912EVEREST DEMO6009SAO PAULO62150511EVERESTDEMO63048FC9',
    chave: 'pix@exemplo.dev',
    nomeRecebedor: 'EVEREST DEMO',
    valorCentavos: 5000,
  },
  contatoInstagram: 'everest',
} satisfies PagamentoResposta;

@ApiTags('pagamento')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller('desafios/:slug/pagamento')
export class PagamentoController {
  constructor(private readonly pagamentos: PagamentoService) {}

  @Get()
  @ApiOkResponse({
    description:
      'Status do pagamento da inscrição + Pix fixo (QR / copia e cola). Sem gate de pagamento. ' +
      '`pix: null` quando PIX_COPIA_E_COLA não está configurado (só fora de produção).',
    schema: { example: EXEMPLO },
  })
  @ApiForbiddenResponse({ description: 'NAO_INSCRITO (inclusive inscrição removida pelo admin).' })
  obter(@Param('slug') slug: string, @UsuarioAtual() usuario: UsuarioSessao): Promise<PagamentoResposta> {
    return this.pagamentos.obter(slug, usuario.id);
  }

  @Post('informar')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description:
      '"Já fiz o pagamento": PENDENTE → INFORMADO. Idempotente (INFORMADO de novo mantém `informadoEm`).',
    schema: { example: { ...EXEMPLO, status: 'INFORMADO', informadoEm: '2026-10-30T18:02:00.000Z' } },
  })
  @ApiForbiddenResponse({ description: 'NAO_INSCRITO.' })
  @ApiConflictResponse({ description: 'PAGAMENTO_JA_CONFIRMADO.' })
  @ApiServiceUnavailableResponse({ description: 'PAGAMENTO_INDISPONIVEL: Pix não configurado neste ambiente.' })
  informar(@Param('slug') slug: string, @UsuarioAtual() usuario: UsuarioSessao): Promise<PagamentoResposta> {
    return this.pagamentos.informar(slug, usuario.id);
  }
}
