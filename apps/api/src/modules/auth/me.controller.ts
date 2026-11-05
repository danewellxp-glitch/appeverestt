import { Body, Controller, Delete, Patch, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { atualizarPerfilSchema, type AtualizarPerfilInput, type MeResposta } from '@everest/shared';
import { UsuarioAtual } from '../../common/decorators/usuario-atual.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodBody } from '../../common/swagger';
import { AppConfig } from '../../config/app-config.service';
import { EXEMPLO_ME, limparCookieSessao } from './auth.controller';
import { AuthService } from './auth.service';
import type { UsuarioSessao } from './sessao';

@ApiTags('auth')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller('me')
export class MeController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: AppConfig,
  ) {}

  @Patch()
  @ApiZodBody(atualizarPerfilSchema, {
    nome: 'Maria Souza Lima',
    instagram: '@maria.souza',
    dataNascimento: '1995-04-12',
    whatsapp: '(11) 98765-4321',
    bairro: 'Pinheiros',
    cidade: 'São Paulo',
    uf: 'SP',
    aceitouTermos: true,
    aceitouMarketing: true,
    aceitaCutucadas: true,
  })
  @ApiOkResponse({
    description:
      'Completa o perfil: nome completo, dados de cadastro (obrigatórios para a inscrição), aceite dos termos ' +
      'o consentimento de marketing (opcional; false revoga) e as cutucadas da turma (opcional).',
    schema: { example: EXEMPLO_ME },
  })
  async atualizar(
    @Body(new ZodValidationPipe(atualizarPerfilSchema)) body: AtualizarPerfilInput,
    @UsuarioAtual() usuario: UsuarioSessao,
  ): Promise<MeResposta> {
    await this.auth.atualizarPerfil(usuario.id, body);
    return this.auth.me(usuario.id);
  }

  @Delete()
  @ApiOkResponse({
    description:
      'Exclui a conta: apaga as fotos, anonimiza o usuário ("Participante removido") e encerra a sessão. ' +
      'A vaga continua ocupada (X5).',
    schema: { example: { ok: true } },
  })
  async excluir(
    @UsuarioAtual() usuario: UsuarioSessao,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    await this.auth.excluirConta(usuario.id);
    limparCookieSessao(res, this.config.producao);
    return { ok: true };
  }
}
