import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PushInscricao } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import {
  MODELOS_AVISO,
  urlDaAcaoRapida,
  type AcaoRapida,
  type AvisoPushInput,
  type AvisoPushResultado,
  type PayloadPush,
  type PushInscricaoInput,
  type PushResumoAdmin,
} from '@everest/shared';
import { ErroApp } from '../../common/erros';
import { AppConfig } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DesafioService, infoTempo } from '../desafios/desafio.service';
import {
  CONCORRENCIA_ENVIO,
  MAX_FALHAS_PUSH,
  TTL_PUSH_S,
  WEB_PUSH,
  type ClienteWebPush,
} from './push.constantes';

interface Vapid {
  subject: string;
  publicKey: string;
  privateKey: string;
}

export type Destino = Pick<PushInscricao, 'id' | 'usuarioId' | 'endpoint' | 'p256dh' | 'auth'>;

/** Status HTTP de um erro do web-push (WebPushError.statusCode), se houver. */
function statusDoErro(e: unknown): number | null {
  if (typeof e !== 'object' || e === null) return null;
  const s = (e as { statusCode?: unknown }).statusCode;
  return typeof s === 'number' ? s : null;
}

/** Roda `fn` sobre os itens com no máximo `limite` ao mesmo tempo (ordem dos resultados preservada). */
async function emLotes<T, R>(itens: T[], limite: number, fn: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const resultados: PromiseSettledResult<R>[] = new Array<PromiseSettledResult<R>>(itens.length);
  let proximo = 0;
  const trabalhador = async (): Promise<void> => {
    while (proximo < itens.length) {
      const i = proximo++;
      try {
        resultados[i] = { status: 'fulfilled', value: await fn(itens[i] as T) };
      } catch (reason) {
        resultados[i] = { status: 'rejected', reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, trabalhador));
  return resultados;
}

/** Notificações push (R22): inscrições dos aparelhos, lembretes e avisos do admin. */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
    private readonly desafios: DesafioService,
    @Inject(WEB_PUSH) private readonly webPush: ClienteWebPush,
  ) {}

  /** Par VAPID completo, ou null fora de produção sem configuração. */
  private vapid(): Vapid | null {
    const publicKey = this.config.get('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get('VAPID_PRIVATE_KEY');
    const subject = this.config.get('VAPID_SUBJECT');
    return publicKey && privateKey && subject ? { publicKey, privateKey, subject } : null;
  }

  get configurado(): boolean {
    return this.vapid() !== null;
  }

  chavePublica(): string {
    const v = this.vapid();
    if (!v) throw new ErroApp('PUSH_NAO_CONFIGURADO');
    return v.publicKey;
  }

  async inscrito(usuarioId: string, endpoint: string): Promise<boolean> {
    const n = await this.prisma.pushInscricao.count({ where: { endpoint, usuarioId } });
    return n > 0;
  }

  /** Upsert pelo endpoint: se outra pessoa entrou no mesmo aparelho, a inscrição passa para quem está logado. */
  async inscrever(usuarioId: string, input: PushInscricaoInput): Promise<void> {
    const dados = {
      usuarioId,
      p256dh: input.chaves.p256dh,
      auth: input.chaves.auth,
      userAgent: input.userAgent ?? null,
      falhas: 0,
    };
    await this.prisma.pushInscricao.upsert({
      where: { endpoint: input.endpoint },
      create: { endpoint: input.endpoint, ...dados },
      update: dados,
    });
  }

  /** Só apaga a inscrição se for do usuário (idempotente). */
  async remover(usuarioId: string, endpoint: string): Promise<void> {
    await this.prisma.pushInscricao.deleteMany({ where: { endpoint, usuarioId } });
  }

  /** Aparelhos de quem participa do desafio com pagamento confirmado e conta não excluída. */
  async destinatarios(desafioId: string): Promise<Destino[]> {
    return this.prisma.pushInscricao.findMany({
      where: {
        usuario: {
          excluidoEm: null,
          participacoes: { some: { desafioId, pagamentoStatus: 'CONFIRMADO' } },
        },
      },
      select: { id: true, endpoint: true, p256dh: true, auth: true, usuarioId: true },
      orderBy: { criadoEm: 'asc' },
    });
  }

  /** Aparelhos de uma pessoa (cutucada, R23). Conta excluída não tem inscrições (apagadas na exclusão). */
  async aparelhosDoUsuario(usuarioId: string): Promise<Destino[]> {
    return this.prisma.pushInscricao.findMany({
      where: { usuarioId, usuario: { excluidoEm: null } },
      select: { id: true, endpoint: true, p256dh: true, auth: true, usuarioId: true },
      orderBy: { criadoEm: 'asc' },
    });
  }

  async resumo(slug: string): Promise<PushResumoAdmin> {
    const desafio = await this.desafios.porSlug(slug);
    const inscricoes = await this.destinatarios(desafio.id);
    return { pessoas: new Set(inscricoes.map((i) => i.usuarioId)).size, aparelhos: inscricoes.length };
  }

  /**
   * Envia o mesmo payload para cada inscrição. 404/410 (inscrição vencida) apaga a linha; outros
   * erros somam `falhas` e a linha some ao chegar a MAX_FALHAS_PUSH. Entrega zera as falhas.
   */
  async enviar(inscricoes: Destino[], payload: PayloadPush): Promise<AvisoPushResultado> {
    const vapid = this.vapid();
    if (!vapid) throw new ErroApp('PUSH_NAO_CONFIGURADO');
    const corpo = JSON.stringify(payload);
    const resultados = await emLotes(inscricoes, CONCORRENCIA_ENVIO, (i) =>
      this.webPush.sendNotification({ endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } }, corpo, {
        vapidDetails: vapid,
        TTL: TTL_PUSH_S,
        urgency: 'high',
      }),
    );

    const entregues: string[] = [];
    const vencidas: string[] = [];
    const comErro: string[] = [];
    resultados.forEach((r, n) => {
      const id = (inscricoes[n] as Destino).id;
      if (r.status === 'fulfilled') {
        entregues.push(id);
        return;
      }
      const status = statusDoErro(r.reason);
      if (status === 404 || status === 410) vencidas.push(id);
      else {
        comErro.push(id);
        this.logger.warn(`Push falhou (${status ?? 'sem status'}) para a inscrição ${id}: ${String(r.reason)}`);
      }
    });

    let removidas = 0;
    if (entregues.length > 0) {
      await this.prisma.pushInscricao.updateMany({
        where: { id: { in: entregues } },
        data: { ultimoEnvioEm: new Date(), falhas: 0 },
      });
    }
    if (vencidas.length > 0) {
      removidas += (await this.prisma.pushInscricao.deleteMany({ where: { id: { in: vencidas } } })).count;
    }
    if (comErro.length > 0) {
      await this.prisma.pushInscricao.updateMany({ where: { id: { in: comErro } }, data: { falhas: { increment: 1 } } });
      await this.prisma.pushInscricao.deleteMany({ where: { id: { in: comErro }, falhas: { gte: MAX_FALHAS_PUSH } } });
    }
    return { destinatarios: inscricoes.length, entregues: entregues.length, removidas, falhas: comErro.length };
  }

  /** Payload de um lembrete/aviso pronto: o botão de ação registra direto no Android. */
  static payloadDaAcao(acao: AcaoRapida, tag: string): PayloadPush {
    const m = MODELOS_AVISO[acao];
    return { titulo: m.titulo, corpo: m.corpo, url: urlDaAcaoRapida(acao), acao, botao: m.botao, tag };
  }

  /**
   * Lembrete automático (job agendado): só com desafio ativo EM_ANDAMENTO e push configurado.
   * Devolve null quando não há o que enviar.
   */
  async enviarLembrete(acao: AcaoRapida, agora = new Date()): Promise<AvisoPushResultado | null> {
    if (!this.configurado) {
      this.logger.warn(`Lembrete "${acao}" ignorado: VAPID não configurado.`);
      return null;
    }
    const desafio = await this.prisma.desafio.findFirst({ where: { ativo: true } });
    if (!desafio || infoTempo(desafio, agora).status !== 'EM_ANDAMENTO') return null;
    const inscricoes = await this.destinatarios(desafio.id);
    if (inscricoes.length === 0) return { destinatarios: 0, entregues: 0, removidas: 0, falhas: 0 };
    const r = await this.enviar(inscricoes, PushService.payloadDaAcao(acao, `lembrete-${acao}`));
    this.logger.log(`Lembrete "${acao}": ${r.entregues}/${r.destinatarios} entregues, ${r.removidas} removidas, ${r.falhas} falhas.`);
    return r;
  }

  /** Aviso do admin para os participantes confirmados do desafio. Modelo pronto ou texto livre (abre /hoje). */
  async enviarAviso(slug: string, input: AvisoPushInput): Promise<AvisoPushResultado> {
    if (!this.configurado) throw new ErroApp('PUSH_NAO_CONFIGURADO');
    const desafio = await this.desafios.porSlug(slug);
    const tag = `aviso-${randomUUID().slice(0, 8)}`;
    const payload: PayloadPush =
      input.modelo === 'livre'
        ? { titulo: input.titulo ?? '', corpo: input.corpo ?? '', url: '/hoje', tag }
        : PushService.payloadDaAcao(input.modelo, tag);
    const inscricoes = await this.destinatarios(desafio.id);
    if (inscricoes.length === 0) return { destinatarios: 0, entregues: 0, removidas: 0, falhas: 0 };
    return this.enviar(inscricoes, payload);
  }
}
