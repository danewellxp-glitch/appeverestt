import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  numeroDiaSchema,
  tipoFotoSchema,
  uploadUrlSchema,
  visibilidadeFotoSchema,
  type VisibilidadeFotoInput,
  type ConfirmarFotoResposta,
  type TipoFoto,
  type UploadUrlResposta,
} from '@everest/shared';
import { UsuarioAtual } from '../../common/decorators/usuario-atual.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodBody } from '../../common/swagger';
import type { UsuarioSessao } from '../auth/sessao';
import { FotosService, type VisibilidadeFotoResposta } from './fotos.service';

@ApiTags('fotos')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller('desafios/:slug/dias/:n/fotos')
export class FotosController {
  constructor(private readonly fotos: FotosService) {}

  @Post('upload-url')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiZodBody(uploadUrlSchema, { tipo: 'AGUA', mimeType: 'image/jpeg', tamanhoBytes: 524288 })
  @ApiOkResponse({
    description: 'Faça PUT do arquivo em `uploadUrl` com os `headers` informados e depois chame /confirmar.',
    schema: {
      example: {
        fotoId: 'a1b2c3',
        uploadUrl: 'https://storage/...',
        headers: { 'Content-Type': 'image/jpeg' },
      } satisfies UploadUrlResposta,
    },
  })
  uploadUrl(
    @Param('slug') slug: string,
    @Param('n', new ZodValidationPipe(numeroDiaSchema)) n: number,
    @Body() body: unknown,
    @UsuarioAtual() usuario: UsuarioSessao,
  ): Promise<UploadUrlResposta> {
    return this.fotos.solicitarUpload(slug, usuario, n, body);
  }

  @Post(':fotoId/confirmar')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: { example: { fotoId: 'a1b2c3', status: 'ENVIADA' } satisfies ConfirmarFotoResposta } })
  confirmar(
    @Param('slug') slug: string,
    @Param('n', new ZodValidationPipe(numeroDiaSchema)) n: number,
    @Param('fotoId') fotoId: string,
    @UsuarioAtual() usuario: UsuarioSessao,
  ): Promise<ConfirmarFotoResposta> {
    return this.fotos.confirmar(slug, usuario, n, fotoId);
  }

  @Patch(':tipo/visibilidade')
  @ApiZodBody(visibilidadeFotoSchema, { visivel: false })
  @ApiOkResponse({
    description:
      'Mostra/esconde a foto do treino na aba Treinos da turma (R23). Só EXERCICIO; vale para qualquer dia do ' +
      'desafio (mesmo fora da janela de edição).',
    schema: { example: { visivelTurma: false } satisfies VisibilidadeFotoResposta },
  })
  visibilidade(
    @Param('slug') slug: string,
    @Param('n', new ZodValidationPipe(numeroDiaSchema)) n: number,
    @Param('tipo', new ZodValidationPipe(tipoFotoSchema)) tipo: TipoFoto,
    @Body(new ZodValidationPipe(visibilidadeFotoSchema)) body: VisibilidadeFotoInput,
    @UsuarioAtual() usuario: UsuarioSessao,
  ): Promise<VisibilidadeFotoResposta> {
    return this.fotos.alterarVisibilidade(slug, usuario, n, tipo, body.visivel);
  }

  @Delete(':tipo')
  @ApiOkResponse({ schema: { example: { ok: true } } })
  remover(
    @Param('slug') slug: string,
    @Param('n', new ZodValidationPipe(numeroDiaSchema)) n: number,
    @Param('tipo', new ZodValidationPipe(tipoFotoSchema)) tipo: TipoFoto,
    @UsuarioAtual() usuario: UsuarioSessao,
  ): Promise<{ ok: true }> {
    return this.fotos.remover(slug, usuario, n, tipo);
  }
}
