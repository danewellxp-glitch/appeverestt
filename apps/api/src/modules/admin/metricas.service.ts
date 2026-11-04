import { Injectable } from '@nestjs/common';
import type { AdminMetricas } from '@everest/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { perfilEstaCompleto } from '../auth/auth.service';
import { DesafioService, dataIso } from '../desafios/desafio.service';
import { PixService } from '../pagamento/pix.service';
import { calcularMetricas } from './metricas';

/** Carrega as linhas do desafio e entrega o cálculo para `metricas.ts` (funções puras). */
@Injectable()
export class MetricasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly desafios: DesafioService,
    private readonly pix: PixService,
  ) {}

  async metricas(slug: string, agora = new Date()): Promise<AdminMetricas> {
    const d = await this.desafios.porSlug(slug);
    const [contas, candidatos, participantes, dias, feedbacks] = await Promise.all([
      this.prisma.usuario.count({ where: { excluidoEm: null } }),
      // O banco filtra o grosso; o nome completo é conferido pela mesma regra da inscrição.
      this.prisma.usuario.findMany({
        where: {
          excluidoEm: null,
          aceitouTermosEm: { not: null },
          instagram: { not: null },
          dataNascimento: { not: null },
          whatsapp: { not: null },
          bairro: { not: null },
          cidade: { not: null },
          uf: { not: null },
        },
        select: {
          nome: true,
          aceitouTermosEm: true,
          excluidoEm: true,
          instagram: true,
          dataNascimento: true,
          whatsapp: true,
          bairro: true,
          cidade: true,
          uf: true,
        },
      }),
      this.prisma.participante.findMany({
        where: { desafioId: d.id },
        select: {
          id: true,
          ehEmbaixador: true,
          vagaNumero: true,
          dataInscricao: true,
          pagamentoStatus: true,
          pagamentoInformadoEm: true,
          pagamentoConfirmadoEm: true,
          usuario: {
            select: {
              papel: true,
              nome: true,
              whatsapp: true,
              dataNascimento: true,
              cidade: true,
              uf: true,
              aceitouMarketingEm: true,
              excluidoEm: true,
            },
          },
        },
      }),
      this.prisma.diaDesafio.findMany({
        where: { participante: { desafioId: d.id } },
        select: {
          participanteId: true,
          numeroDia: true,
          aguaMl: true,
          exercicio: true,
          paginasLidas: true,
          storyPostado: true,
          concluido: true,
          invalidado: true,
          conferidoEm: true,
          atualizadoEm: true,
          // Mesmos status que o `recalcularDia` considera válidos.
          fotos: { where: { status: { in: ['ENVIADA', 'CONFIRMADA'] } }, select: { tipo: true } },
        },
      }),
      this.prisma.feedback.findMany({
        where: { participante: { desafioId: d.id } },
        select: { nota: true, autorizaDivulgacao: true },
      }),
    ]);

    return calcularMetricas({
      agora,
      desafio: {
        slug: d.slug,
        nome: d.nome,
        dataInicio: dataIso(d.dataInicio),
        totalDias: d.totalDias,
        totalVagas: d.totalVagas,
        timezone: d.timezone,
      },
      valorInscricaoCentavos: this.pix.inscricao?.valorCentavos ?? null,
      contas,
      cadastrosCompletos: candidatos.filter(perfilEstaCompleto).length,
      participantes: participantes.map((p) => ({
        id: p.id,
        nome: p.usuario.nome,
        whatsapp: p.usuario.whatsapp,
        ehEmbaixador: p.ehEmbaixador,
        // Admin que pagou pelo Pix (avisou) conta como pagante; promovido depois não some da receita.
        isento: p.ehEmbaixador || (p.usuario.papel === 'ADMIN' && p.pagamentoInformadoEm === null),
        vagaNumero: p.vagaNumero,
        dataInscricao: p.dataInscricao,
        pagamentoStatus: p.pagamentoStatus,
        pagamentoInformadoEm: p.pagamentoInformadoEm,
        pagamentoConfirmadoEm: p.pagamentoConfirmadoEm,
        dataNascimento: p.usuario.dataNascimento ? dataIso(p.usuario.dataNascimento) : null,
        cidade: p.usuario.cidade,
        uf: p.usuario.uf,
        aceitouMarketing: p.usuario.aceitouMarketingEm !== null,
        contaExcluida: p.usuario.excluidoEm !== null,
      })),
      dias: dias.map((x) => ({
        participanteId: x.participanteId,
        numeroDia: x.numeroDia,
        aguaMl: x.aguaMl,
        exercicio: x.exercicio,
        paginasLidas: x.paginasLidas,
        storyPostado: x.storyPostado,
        concluido: x.concluido,
        invalidado: x.invalidado,
        conferido: x.conferidoEm !== null,
        atualizadoEm: x.atualizadoEm,
        fotosValidas: x.fotos.map((f) => f.tipo),
      })),
      feedbacks,
    });
  }
}
