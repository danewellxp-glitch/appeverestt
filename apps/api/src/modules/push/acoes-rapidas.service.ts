import { Injectable } from '@nestjs/common';
import { aplicarAcaoRapida, type AcaoRapida, type AcaoRapidaResposta, type DiaDetalhe } from '@everest/shared';
import { ErroApp } from '../../common/erros';
import { DesafioService, infoTempo } from '../desafios/desafio.service';
import { DiaService } from '../dias/dia.service';

/**
 * Ação rápida (R22): o botão da notificação registra um hábito no dia de hoje do desafio ativo, pelo
 * mesmo caminho do PUT /desafios/:slug/dias/:n (gate do pagamento, janela de edição, recálculo).
 */
@Injectable()
export class AcoesRapidasService {
  constructor(
    private readonly desafios: DesafioService,
    private readonly dias: DiaService,
  ) {}

  async aplicar(usuarioId: string, acao: AcaoRapida, agora = new Date()): Promise<AcaoRapidaResposta> {
    const ativo = await this.desafios.ativo();
    const { desafio, participante } = await this.desafios.exigirParticipante(ativo.slug, usuarioId);
    const t = infoTempo(desafio, agora);
    if (t.status === 'NAO_INICIADO') throw new ErroApp('DESAFIO_NAO_INICIADO');
    if (t.status === 'ENCERRADO' || t.diaAtual === null) throw new ErroApp('DESAFIO_ENCERRADO');
    const n = t.diaAtual;
    this.dias.exigirEditavel(desafio, n, agora);

    const antes = await this.dias.detalhe(desafio, participante.id, n);
    const r = aplicarAcaoRapida(acao, {
      aguaMl: antes.aguaMl,
      exercicio: antes.exercicio,
      paginasLidas: antes.paginasLidas,
      storyPostado: antes.storyPostado,
    });
    if (r.mudou) await this.dias.salvarCheckin(desafio, participante, n, r.valores);

    const { diaId: _diaId, invalidadoEm: _invalidadoEm, conferidoEm: _conferidoEm, ...dia } = r.mudou
      ? await this.dias.detalhe(desafio, participante.id, n)
      : antes;
    return { dia: dia satisfies DiaDetalhe, mensagem: r.mensagem, mudou: r.mudou };
  }
}
