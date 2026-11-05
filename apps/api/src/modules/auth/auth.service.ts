import { Inject, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, type Usuario } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import {
  LIMITES,
  ehNomeCompleto,
  type AtualizarPerfilInput,
  type CadastroInput,
  type LoginInput,
  type MeResposta,
  type ParticipacaoResumo,
} from '@everest/shared';
import { ErroApp } from '../../common/erros';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService, chaveTurma, chaveVagas, chavesDoRanking } from '../../redis/redis.module';
import { StorageService } from '../../storage/storage.service';
import type { PayloadSessao } from './sessao';
import { type DadosToken, VERIFICADOR_FIREBASE, type VerificadorFirebase } from './verificador-firebase';

/** Login no Firebase precisa ser recente para virar sessão (token roubado não serve depois). */
export const IDADE_MAX_LOGIN_S = 300;
export const NOME_REMOVIDO = 'Participante removido';

function ehP2002(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

type CamposPerfil = Pick<
  Usuario,
  'nome' | 'aceitouTermosEm' | 'excluidoEm' | 'instagram' | 'dataNascimento' | 'whatsapp' | 'bairro' | 'cidade' | 'uf'
>;

/** Perfil completo = aceitou os termos, tem nome e sobrenome e todos os dados de cadastro (Q7). */
export function perfilEstaCompleto(u: CamposPerfil): boolean {
  return (
    u.excluidoEm === null &&
    u.aceitouTermosEm !== null &&
    ehNomeCompleto(u.nome) &&
    Boolean(u.instagram && u.dataNascimento && u.whatsapp && u.bairro && u.cidade && u.uf)
  );
}

function nomeInicial(d: DadosToken, email: string): string {
  const base = d.nome ?? email.split('@')[0] ?? 'Participante';
  return base.trim().slice(0, LIMITES.nomeMax) || 'Participante';
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  // Hash de uma senha aleatória: o login gasta o mesmo tempo quando o e-mail não existe.
  private readonly hashFicticio = argon2.hash(randomBytes(32).toString('hex'), {
    type: argon2.argon2id,
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly cache: CacheService,
    private readonly storage: StorageService,
    @Inject(VERIFICADOR_FIREBASE) private readonly verificador: VerificadorFirebase,
  ) {}

  // ---------------------------------------------------------------- Firebase

  /** POST /auth/sessao: troca o idToken do Firebase pelo cookie de sessão da API. */
  async sessao(idToken: string, agora = new Date()): Promise<{ token: string; usuarioId: string }> {
    const dados = await this.verificador.verificar(idToken);
    if (!dados.email) {
      throw new ErroApp('NAO_AUTENTICADO', 'Sua conta precisa ter um e-mail. Entre de outro jeito.');
    }
    const agoraS = Math.floor(agora.getTime() / 1000);
    if (agoraS - dados.authTime > IDADE_MAX_LOGIN_S) {
      throw new ErroApp('NAO_AUTENTICADO', 'Sua sessão expirou. Entre de novo.');
    }

    let usuario: Usuario;
    try {
      usuario = await this.encontrarOuCriar(dados, dados.email);
    } catch (e) {
      // Duas trocas simultâneas do mesmo login novo: a segunda encontra o que a primeira criou.
      if (!ehP2002(e)) throw e;
      usuario = await this.encontrarOuCriar(dados, dados.email);
    }

    if (usuario.excluidoEm) throw new ErroApp('NAO_AUTENTICADO', 'Conta excluída.');
    if (dados.foto && dados.foto !== usuario.fotoUrl) {
      usuario = await this.prisma.usuario.update({ where: { id: usuario.id }, data: { fotoUrl: dados.foto } });
    }
    return { token: await this.emitirToken(usuario), usuarioId: usuario.id };
  }

  private async encontrarOuCriar(d: DadosToken, email: string): Promise<Usuario> {
    const porUid = await this.prisma.usuario.findUnique({ where: { firebaseUid: d.uid } });
    if (porUid) return porUid;

    const porEmail = await this.prisma.usuario.findUnique({ where: { email } });
    if (porEmail) {
      // Só vincula com e-mail verificado: senão qualquer um tomaria a conta de outra pessoa.
      // Com e-mail verificado, revincula mesmo que outro uid estivesse ligado (conta recriada no
      // Firebase): a posse do e-mail está provada e a pessoa não fica trancada para sempre.
      if (!d.emailVerificado) {
        throw new ErroApp('EMAIL_EM_USO', 'Este e-mail já tem conta. Entre com ele.');
      }
      return this.prisma.usuario.update({ where: { id: porEmail.id }, data: { firebaseUid: d.uid } });
    }

    return this.prisma.usuario.create({
      data: {
        nome: nomeInicial(d, email),
        email,
        firebaseUid: d.uid,
        fotoUrl: d.foto,
        senhaHash: null,
        aceitouTermosEm: null,
      },
    });
  }

  /**
   * PATCH /me: nome completo, dados de cadastro (Q7), aceite, consentimento de marketing (X9) e
   * cutucadas da turma (R23).
   */
  async atualizarPerfil(usuarioId: string, input: AtualizarPerfilInput): Promise<void> {
    const atual = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { participacoes: { select: { desafioId: true } } },
    });
    if (!atual || atual.excluidoEm) throw new ErroApp('NAO_AUTENTICADO');
    const agora = new Date();
    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        nome: input.nome,
        instagram: input.instagram,
        dataNascimento: new Date(`${input.dataNascimento}T00:00:00Z`),
        whatsapp: input.whatsapp,
        bairro: input.bairro,
        cidade: input.cidade,
        uf: input.uf,
        aceitouTermosEm: atual.aceitouTermosEm ?? agora,
        // true: guarda a data do 1º consentimento; false: revoga; omitido: mantém.
        aceitouMarketingEm:
          input.aceitouMarketing === undefined
            ? atual.aceitouMarketingEm
            : input.aceitouMarketing
              ? (atual.aceitouMarketingEm ?? agora)
              : null,
        // Omitido: mantém.
        ...(input.aceitaCutucadas === undefined ? {} : { aceitaCutucadas: input.aceitaCutucadas }),
      },
    });
    // A aba Hoje da turma mostra quem não recebe cutucadas (cache de 60 s).
    if (input.aceitaCutucadas !== undefined && input.aceitaCutucadas !== atual.aceitaCutucadas) {
      await this.cache.apagar(...atual.participacoes.map((p) => chaveTurma(p.desafioId)));
    }
  }

  /** Inscrição exige perfil completo (aceite + dados de cadastro). */
  async exigirPerfilCompleto(usuarioId: string): Promise<void> {
    const u = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!u || u.excluidoEm) throw new ErroApp('NAO_AUTENTICADO');
    if (!perfilEstaCompleto(u)) throw new ErroApp('PERFIL_INCOMPLETO');
  }

  /**
   * DELETE /me (X5): apaga as fotos e anonimiza o usuário. Participante e dias ficam,
   * para a vaga continuar ocupada (a numeração das vagas é `count + 1`).
   */
  async excluirConta(usuarioId: string): Promise<void> {
    const resultado = await this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.findUnique({
        where: { id: usuarioId },
        include: { participacoes: { select: { desafioId: true } } },
      });
      if (!usuario || usuario.excluidoEm) throw new ErroApp('NAO_AUTENTICADO');
      const fotos = await tx.fotoProva.findMany({
        where: { dia: { participante: { usuarioId } } },
        select: { id: true, storageKey: true, thumbKey: true },
      });
      await tx.fotoProva.deleteMany({ where: { id: { in: fotos.map((f) => f.id) } } });
      // O depoimento é texto pessoal: some junto com a conta (a vaga continua ocupada — X5).
      await tx.feedback.deleteMany({ where: { participante: { usuarioId } } });
      // Aparelhos com push (R22): o usuário fica (anonimizado), então o CASCADE não cobre.
      await tx.pushInscricao.deleteMany({ where: { usuarioId } });
      await tx.usuario.update({
        where: { id: usuarioId },
        data: {
          nome: NOME_REMOVIDO,
          email: `removido+${usuarioId}@everest.invalid`,
          firebaseUid: null,
          fotoUrl: null,
          senhaHash: null,
          instagram: null,
          dataNascimento: null,
          whatsapp: null,
          bairro: null,
          cidade: null,
          uf: null,
          aceitouMarketingEm: null,
          excluidoEm: new Date(),
          tokenVersao: { increment: 1 },
        },
      });
      return {
        uid: usuario.firebaseUid,
        chaves: fotos.flatMap((f) => [f.storageKey, f.thumbKey]),
        desafios: [...new Set(usuario.participacoes.map((p) => p.desafioId))],
      };
    });

    // Depois do commit: storage e Firebase não são transacionais. Falhas aqui não revivem a conta.
    try {
      await this.storage.apagarVarios(resultado.chaves);
    } catch (e) {
      this.logger.error(`Falha ao apagar fotos da conta excluída ${usuarioId}: ${String(e)}`);
    }
    if (resultado.uid) {
      try {
        await this.verificador.excluir(resultado.uid);
      } catch {
        // já registrado pelo verificador; a conta local já está anonimizada
      }
    }
    await this.cache.apagar(...resultado.desafios.flatMap((id) => [chaveVagas(id), ...chavesDoRanking(id)]));
  }

  // ---------------------------------------------------------------- legado (AUTH_SENHA_LEGADO)

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
      if (ehP2002(e)) throw new ErroApp('EMAIL_EM_USO');
      throw e;
    }
  }

  async login(input: LoginInput): Promise<{ token: string; usuarioId: string }> {
    const usuario = await this.prisma.usuario.findUnique({ where: { email: input.email } });
    const hash = usuario?.senhaHash ?? (await this.hashFicticio);
    const ok = await argon2.verify(hash, input.senha).catch(() => false);
    if (!usuario || !usuario.senhaHash || usuario.excluidoEm || !ok) {
      throw new ErroApp('CREDENCIAIS_INVALIDAS');
    }
    return { token: await this.emitirToken(usuario), usuarioId: usuario.id };
  }

  // ---------------------------------------------------------------- comum

  emitirToken(u: { id: string; papel: PayloadSessao['papel']; tokenVersao: number }): Promise<string> {
    const payload: PayloadSessao = { sub: u.id, papel: u.papel, v: u.tokenVersao };
    return this.jwt.signAsync(payload);
  }

  async me(usuarioId: string): Promise<MeResposta> {
    const u = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!u || u.excluidoEm) throw new ErroApp('NAO_AUTENTICADO');
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
          pagamentoStatus: p.pagamentoStatus,
        }
      : null;
    return {
      usuario: {
        id: u.id,
        nome: u.nome,
        email: u.email,
        papel: u.papel,
        fotoUrl: u.fotoUrl,
        perfilCompleto: perfilEstaCompleto(u),
        instagram: u.instagram,
        dataNascimento: u.dataNascimento ? u.dataNascimento.toISOString().slice(0, 10) : null,
        whatsapp: u.whatsapp,
        bairro: u.bairro,
        cidade: u.cidade,
        uf: u.uf,
        aceitouMarketing: u.aceitouMarketingEm !== null,
        aceitaCutucadas: u.aceitaCutucadas,
      },
      participacao,
    };
  }
}
