import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  cadastroSchema,
  loginSchema,
  type CadastroInput,
  type LoginInput,
  type MeResposta,
} from '@everest/shared';
import { UsuarioAtual } from '../../common/decorators/usuario-atual.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodBody } from '../../common/swagger';
import { AppConfig } from '../../config/app-config.service';
import { AuthService } from './auth.service';
import { COOKIE_SESSAO, opcoesCookie, type UsuarioSessao } from './sessao';

const LIMITE_AUTH = { default: { limit: 5, ttl: 60_000 } };

const EXEMPLO_ME: MeResposta = {
  usuario: { id: 'ckx...', nome: 'Maria Souza', email: 'maria@exemplo.com', papel: 'USUARIO' },
  participacao: null,
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: AppConfig,
  ) {}

  private gravarCookie(res: Response, token: string): void {
    res.cookie(COOKIE_SESSAO, token, opcoesCookie(this.config.producao));
  }

  @Post('cadastro')
  @Throttle(LIMITE_AUTH)
  @ApiZodBody(cadastroSchema, {
    nome: 'Maria Souza',
    email: 'maria@exemplo.com',
    senha: 'senha-forte-123',
    aceitouTermos: true,
  })
  @ApiOkResponse({ schema: { example: EXEMPLO_ME } })
  async cadastro(
    @Body(new ZodValidationPipe(cadastroSchema)) body: CadastroInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MeResposta> {
    const { token, usuarioId } = await this.auth.cadastrar(body);
    this.gravarCookie(res, token);
    return this.auth.me(usuarioId);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_AUTH)
  @ApiZodBody(loginSchema, { email: 'maria@exemplo.com', senha: 'senha-forte-123' })
  @ApiOkResponse({ schema: { example: EXEMPLO_ME } })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MeResposta> {
    const { token, usuarioId } = await this.auth.login(body);
    this.gravarCookie(res, token);
    return this.auth.me(usuarioId);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOkResponse({ schema: { example: { ok: true } } })
  logout(@Res({ passthrough: true }) res: Response): { ok: true } {
    const { maxAge: _maxAge, ...opcoes } = opcoesCookie(this.config.producao);
    res.clearCookie(COOKIE_SESSAO, opcoes);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOkResponse({ schema: { example: EXEMPLO_ME } })
  me(@UsuarioAtual() usuario: UsuarioSessao): Promise<MeResposta> {
    return this.auth.me(usuario.id);
  }
}
