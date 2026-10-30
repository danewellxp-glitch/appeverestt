import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  cadastroSchema,
  loginSchema,
  sessaoSchema,
  type CadastroInput,
  type LoginInput,
  type MeResposta,
  type SessaoInput,
} from '@everest/shared';
import { ErroApp } from '../../common/erros';
import { UsuarioAtual } from '../../common/decorators/usuario-atual.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodBody } from '../../common/swagger';
import { AppConfig } from '../../config/app-config.service';
import { AuthService } from './auth.service';
import { COOKIE_SESSAO, opcoesCookie, type UsuarioSessao } from './sessao';

const LIMITE_AUTH = { default: { limit: 5, ttl: 60_000 } };
const LIMITE_SESSAO = { default: { limit: 10, ttl: 60_000 } };

export const EXEMPLO_ME: MeResposta = {
  usuario: {
    id: 'ckx...',
    nome: 'Maria Souza',
    email: 'maria@exemplo.com',
    papel: 'USUARIO',
    fotoUrl: 'https://lh3.googleusercontent.com/a/...',
    perfilCompleto: true,
    instagram: 'maria.souza',
    dataNascimento: '1995-04-12',
    whatsapp: '11987654321',
    bairro: 'Pinheiros',
    cidade: 'São Paulo',
    uf: 'SP',
    aceitouMarketing: true,
  },
  participacao: null,
};

/** Grava o cookie de sessão (mesmas opções em todo lugar). */
export function gravarCookieSessao(res: Response, token: string, producao: boolean): void {
  res.cookie(COOKIE_SESSAO, token, opcoesCookie(producao));
}

export function limparCookieSessao(res: Response, producao: boolean): void {
  const { maxAge: _maxAge, ...opcoes } = opcoesCookie(producao);
  res.clearCookie(COOKIE_SESSAO, opcoes);
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: AppConfig,
  ) {}

  private gravarCookie(res: Response, token: string): void {
    gravarCookieSessao(res, token, this.config.producao);
  }

  /** Cadastro/login por senha local só existem com AUTH_SENHA_LEGADO=true. */
  private exigirLegado(): void {
    if (!this.config.get('AUTH_SENHA_LEGADO')) throw new ErroApp('NAO_ENCONTRADO');
  }

  @Post('sessao')
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_SESSAO)
  @ApiZodBody(sessaoSchema, { idToken: 'eyJhbGciOiJSUzI1NiIs...' })
  @ApiOkResponse({
    description:
      'Troca o idToken do Firebase (login de no máximo 5 min atrás) pelo cookie httpOnly `everest_sessao`. ' +
      'Vincula contas existentes só com e-mail verificado.',
    schema: { example: EXEMPLO_ME },
  })
  async sessao(
    @Body(new ZodValidationPipe(sessaoSchema)) body: SessaoInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MeResposta> {
    const { token, usuarioId } = await this.auth.sessao(body.idToken);
    this.gravarCookie(res, token);
    return this.auth.me(usuarioId);
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
    this.exigirLegado();
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
    this.exigirLegado();
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
    limparCookieSessao(res, this.config.producao);
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
