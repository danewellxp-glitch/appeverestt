import { Injectable, Logger } from '@nestjs/common';
import { Prisma, type Desafio, type Participante } from '@prisma/client';
import { modeloCutucada, nomeExibicao, type CutucadaResposta } from '@everest/shared';
import { ErroApp } from '../../common/erros';
import { PrismaService } from '../../prisma/prisma.service';
import { infoTempo } from '../desafios/desafio.service';
import { PushService } from '../push/push.service';

/**
 * Cutucada (R23, X21): lembra alguém da turma de fechar o dia, por push. Uma por remetente,
 * destinatário e dia (único no banco). Sem push ativo do outro lado, fica registrada e devolve
 * `entregue: false`.
 */
@Injectable()
export class CutucadaService {
  private readonly logger = new Logger(CutucadaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  async cutucar(
    desafio: Desafio,
    remetente: Participante,
    paraId: string,
    agora = new Date(),
  ): Promise<CutucadaResposta> {
    const t = infoTempo(desafio, agora);
    if (t.status === 'NAO_INICIADO') throw new ErroApp('DESAFIO_NAO_INICIADO');
    if (t.status === 'ENCERRADO' || t.diaAtual === null) throw new ErroApp('DESAFIO_ENCERRADO');
    const numeroDia = t.diaAtual;

    if (paraId === remetente.id) {
      throw new ErroApp('VALIDACAO', 'Você não pode cutucar a si mesmo.', { participanteId: 'Escolha outra pessoa.' });
    }

    const destinatario = await this.prisma.participante.findFirst({
      where: { id: paraId, desafioId: desafio.id, pagamentoStatus: 'CONFIRMADO', usuario: { excluidoEm: null } },
      select: {
        usuarioId: true,
        usuario: { select: { aceitaCutucadas: true } },
        dias: { where: { numeroDia }, select: { concluido: true, invalidado: true } },
      },
    });
    if (!destinatario) throw new ErroApp('NAO_ENCONTRADO', 'Participante não encontrado.');
    if (!destinatario.usuario.aceitaCutucadas) {
      throw new ErroApp('CUTUCADA_RECUSADA', 'Essa pessoa não recebe cutucadas.');
    }
    const dia = destinatario.dias[0];
    if (dia?.concluido && !dia.invalidado) throw new ErroApp('CUTUCADA_RECUSADA', 'Essa pessoa já fechou o dia.');

    try {
      await this.prisma.cutucada.create({ data: { deId: remetente.id, paraId, numeroDia } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ErroApp('JA_CUTUCOU');
      throw e;
    }

    return { entregue: await this.entregar(remetente, destinatario.usuarioId, numeroDia) };
  }

  /** Push para os aparelhos do destinatário. Falha no envio não desfaz a cutucada. */
  private async entregar(remetente: Participante, usuarioId: string, numeroDia: number): Promise<boolean> {
    if (!this.push.configurado) return false;
    const aparelhos = await this.push.aparelhosDoUsuario(usuarioId);
    if (aparelhos.length === 0) return false;
    const u = await this.prisma.usuario.findUnique({ where: { id: remetente.usuarioId }, select: { nome: true } });
    const payload = modeloCutucada(nomeExibicao(u?.nome ?? ''), numeroDia, remetente.id);
    try {
      const r = await this.push.enviar(aparelhos, payload);
      return r.entregues > 0;
    } catch (e) {
      this.logger.warn(`Cutucada não entregue para ${usuarioId}: ${String(e)}`);
      return false;
    }
  }
}
