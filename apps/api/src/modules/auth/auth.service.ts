import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import type { CadastroInput, LoginInput, MeResposta, ParticipacaoResumo } from '@everest/shared';
import { ErroApp } from '../../common/erros';
import { PrismaService } from '../../prisma/prisma.service';
import type { PayloadSessao } from './sessao';


@Injectable()
export class AuthService {
  // Hash de uma senha aleatória: o login gasta o mesmo tempo quando o e-mail não existe.
  private readonly hashFicticio = argon2.hash(randomBytes(32).toString('hex'), {
    type: argon2.argon2id,
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async cadastrar(input: CadastroInput): Promise<{ token: string; usuarioId: string }> {
    const senhaHash = await argon2.hash(input.senha, { type: argon2.argon2id });
    try {
      const usuario = await this.prisma.usuario.create({
        data: {
          nome: input.nome,
          email: input.email,
          senhaHash,
          aceitouTermosEm: new Date(),
        },
      });
      return { token: await this.emitirToken(usuario), usuarioId: usuario.id };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ErroApp('EMAIL_EM_USO');
      }
      throw e;
    }
  }

  async login(input: LoginInput): Promise<{ token: string; usuarioId: string }> {
    const usuario = await this.prisma.usuario.findUnique({ where: { email: input.email } });
    const hash = usuario?.senhaHash ?? (await this.hashFicticio);
    const ok = await argon2.verify(hash, input.senha).catch(() => false);
    if (!usuario || !ok) throw new ErroApp('CREDENCIAIS_INVALIDAS');
    return { token: await this.emitirToken(usuario), usuarioId: usuario.id };
  }

  emitirToken(u: { id: string; papel: PayloadSessao['papel']; tokenVersao: number }): Promise<string> {
    const payload: PayloadSessao = { sub: u.id, papel: u.papel, v: u.tokenVersao };
    return this.jwt.signAsync(payload);
  }

  async me(usuarioId: string): Promise<MeResposta> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true, nome: true, email: true, papel: true },
    });
    if (!usuario) throw new ErroApp('NAO_AUTENTICADO');
    const p = await this.prisma.participante.findFirst({
      where: { usuarioId, desafio: { ativo: true } },
      include: { desafio: { select: { slug: true } } },
    });
    const participacao: ParticipacaoResumo | null = p
      ? {
          participanteId: p.id,
          desafioId: p.desafioId,
          desafioSlug: p.desafio.slug,
          vagaNumero: p.vagaNumero,
          ehEmbaixador: p.ehEmbaixador,
          dataInscricao: p.dataInscricao.toISOString(),
        }
      : null;
    return { usuario, participacao };
  }
}
