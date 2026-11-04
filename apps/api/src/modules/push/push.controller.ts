import { Body, Controller, Delete, Get, Header, HttpCode, Put, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiNoContentResponse, ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import {
  pushEndpointSchema,
  pushInscricaoSchema,
  type PushChavePublica,
  type PushEstado,
  type PushInscricaoInput,
} from '@everest/shared';
import { UsuarioAtual } from '../../common/decorators/usuario-atual.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodBody } from '../../common/swagger';
import type { UsuarioSessao } from '../auth/sessao';
import { PushService } from './push.service';

const ENDPOINT_EXEMPLO = 'https://fcm.googleapis.com/fcm/send/abc123';

/** Inscrição do aparelho nas notificações push (R22). */
@ApiTags('push')
@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Get('chave-publica')
  @ApiOkResponse({
    description: 'Chave pública VAPID (applicationServerKey do PushManager.subscribe). Não exige login.',
    schema: { example: { chave: 'BIrDb0zAnpObJ4Zp...' } satisfies PushChavePublica },
  })
  @ApiServiceUnavailableResponse({ description: 'PUSH_NAO_CONFIGURADO: VAPID ausente neste ambiente.' })
  chavePublica(): PushChavePublica {
    return { chave: this.push.chavePublica() };
  }

  @Get('inscricao')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({
    description: '`inscrito` só é true se esse endpoint estiver ligado à conta logada.',
    schema: { example: { inscrito: true } satisfies PushEstado },
  })
  async estado(
    @Query(new ZodValidationPipe(pushEndpointSchema)) q: { endpoint: string },
    @UsuarioAtual() usuario: UsuarioSessao,
  ): Promise<PushEstado> {
    return { inscrito: await this.push.inscrito(usuario.id, q.endpoint) };
  }

  @Put('inscricao')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiZodBody(pushInscricaoSchema, {
    endpoint: ENDPOINT_EXEMPLO,
    chaves: { p256dh: 'BNc...', auth: 'tBH...' },
    userAgent: 'Mozilla/5.0 (Linux; Android 14)',
  })
  @ApiOkResponse({
    description: 'Upsert pelo endpoint. Se o aparelho estava ligado a outra conta, passa para a conta logada.',
    schema: { example: { inscrito: true } satisfies PushEstado },
  })
  async inscrever(
    @Body(new ZodValidationPipe(pushInscricaoSchema)) body: PushInscricaoInput,
    @UsuarioAtual() usuario: UsuarioSessao,
  ): Promise<PushEstado> {
    await this.push.inscrever(usuario.id, body);
    return { inscrito: true };
  }

  @Delete('inscricao')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @HttpCode(204)
  @ApiZodBody(pushEndpointSchema, { endpoint: ENDPOINT_EXEMPLO })
  @ApiNoContentResponse({ description: 'Desliga o push neste aparelho (idempotente; só apaga se for da conta logada).' })
  async remover(
    @Body(new ZodValidationPipe(pushEndpointSchema)) body: { endpoint: string },
    @UsuarioAtual() usuario: UsuarioSessao,
  ): Promise<void> {
    await this.push.remover(usuario.id, body.endpoint);
  }
}
