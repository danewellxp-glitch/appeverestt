import { Injectable } from '@nestjs/common';
import type { Desafio, Participante } from '@prisma/client';
import { calcularDiaAtual, somarDias, type DesafioAtual, type StatusDesafio } from '@everest/shared';
import { ErroApp } from '../../common/erros';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService, chaveVagas } from '../../redis/redis.module';
import { PixService } from '../pagamento/pix.service';
import { perfilEstaCompleto } from '../auth/auth.service';

export const TTL_VAGAS_S = 30;

export interface InfoTempo {
  dataInicio: string;
  dataFim: string;
  status: StatusDesafio;
  diaAtual: number | null;
  diasParaInicio: number;
}

/** `@db.Date` volta como meia-noite UTC: nunca usar getDate()/toLocaleDateString aqui. */
export function dataIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Campos que decidem o perfil completo (`perfilEstaCompleto`). */
const CAMPOS_DO_PERFIL = {
  nome: true,
  aceitouTermosEm: true,
  excluidoEm: true,
  instagram: true,
  dataNascimento: true,
  whatsapp: true,
  bairro: true,
  cidade: true,
  uf: true,
} as const;

export function infoTempo(desafio: Desafio, agora = new Date()): InfoTempo {
  const dataInicio = dataIso(desafio.dataInicio);
  const r = calcularDiaAtual(dataInicio, agora, desafio.timezone, desafio.totalDias);
  return {
    dataInicio,
    dataFim: somarDias(dataInicio, desafio.totalDias - 1),
    status: r.status,
    diaAtual: r.numeroDia,
    diasParaInicio: r.diasParaInicio,
  };
}

@Injectable()
export class DesafioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly pix: PixService,
  ) {}

  async ativo(): Promise<Desafio> {
    const d = await this.prisma.desafio.findFirst({ where: { ativo: true } });
    if (!d) throw new ErroApp('NAO_ENCONTRADO', 'Nenhum desafio ativo no momento.');
    return d;
  }

  async porSlug(slug: string): Promise<Desafio> {
    const d = await this.prisma.desafio.findUnique({ where: { slug } });
    if (!d) throw new ErroApp('NAO_ENCONTRADO', 'Desafio não encontrado.');
    return d;
  }

  /**
   * Desafio + inscrição do usuário. Único ponto que resolve o participante (gate do pagamento, X12).
   * Lança NAO_INSCRITO se ele não participa e PAGAMENTO_PENDENTE se o Pix ainda não foi confirmado
   * (a não ser com `exigirPagamento: false`, usado só pelas rotas de pagamento). Para participar
   * (check-in, fotos, ranking, feed, feedback) também exige o perfil completo, com o aceite dos
   * termos (X11): vale para quem o embaixador inscreveu pelo painel antes de a pessoa terminar o
   * cadastro (o app já manda para a /bem-vindo; aqui é a garantia no servidor).
   */
  async exigirParticipante(
    slug: string,
    usuarioId: string,
    { exigirPagamento = true }: { exigirPagamento?: boolean } = {},
  ): Promise<{ desafio: Desafio; participante: Participante }> {
    const desafio = await this.porSlug(slug);
    const encontrado = await this.prisma.participante.findUnique({
      where: { desafioId_usuarioId: { desafioId: desafio.id, usuarioId } },
      include: { usuario: { select: CAMPOS_DO_PERFIL } },
    });
    if (!encontrado) throw new ErroApp('NAO_INSCRITO');
    const { usuario, ...participante } = encontrado;
    if (exigirPagamento) {
      if (participante.pagamentoStatus !== 'CONFIRMADO') throw new ErroApp('PAGAMENTO_PENDENTE');
      if (!perfilEstaCompleto(usuario)) {
        throw new ErroApp('PERFIL_INCOMPLETO', 'Complete seu cadastro (dados e aceite dos termos) para continuar.');
      }
    }
    return { desafio, participante };
  }

  /** Conta toda vaga reservada (pendente inclusive): o pagamento não muda a ocupação. */
  async vagasOcupadas(desafioId: string): Promise<number> {
    const emCache = await this.cache.obter<number>(chaveVagas(desafioId));
    if (typeof emCache === 'number') return emCache;
    const ocupadas = await this.prisma.participante.count({
      where: { desafioId, vagaNumero: { not: null } },
    });
    await this.cache.guardar(chaveVagas(desafioId), ocupadas, TTL_VAGAS_S);
    return ocupadas;
  }

  async atual(agora = new Date()): Promise<DesafioAtual> {
    const d = await this.ativo();
    const t = infoTempo(d, agora);
    const ocupadas = await this.vagasOcupadas(d.id);
    return {
      id: d.id,
      nome: d.nome,
      slug: d.slug,
      dataInicio: t.dataInicio,
      dataFim: t.dataFim,
      totalDias: d.totalDias,
      status: t.status,
      diaAtual: t.diaAtual,
      diasParaInicio: t.diasParaInicio,
      totalVagas: d.totalVagas,
      vagasDisponiveis: Math.max(0, d.totalVagas - ocupadas),
      inscricoesAbertas: d.inscricoesAbertas && t.status !== 'ENCERRADO',
      instagramHandle: d.instagramHandle,
      hashtag: d.hashtag,
      timezone: d.timezone,
      inscricao: this.pix.inscricao,
    };
  }
}
