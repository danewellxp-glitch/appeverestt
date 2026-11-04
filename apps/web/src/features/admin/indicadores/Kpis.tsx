import type { AdminMetricas } from '@everest/shared';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { LinkNav } from '../../../components/layout/LinkNav';
import { Contador } from '../../../components/ui/Contador';
import { Medidor } from '../graficos/Barras';
import { percentual } from '../graficos/escalas';
import {
  formatarDecimal,
  formatarDuracaoHoras,
  formatarPct,
  formatarReaisCurto,
  plural,
} from '../graficos/formato';
import { adesaoDoDia, diaMaisRecente, invictosAtuais, mediaDiasConcluidos } from './derivar';

function Kpi({
  rotulo,
  valor,
  complemento,
  alerta = false,
  rodape,
}: {
  rotulo: string;
  valor: ReactNode;
  complemento?: ReactNode;
  /** Pede ação (ex.: pagamentos esperando): número em vermelho. */
  alerta?: boolean;
  rodape?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-[22px] bg-superficie p-3.5 shadow-[inset_0_0_0_1px_var(--borda)]">
      <dt className="text-[10px] font-semibold tracking-[0.12em] text-texto-2 uppercase">
        {rotulo}
      </dt>
      <dd className="flex flex-1 flex-col gap-1.5">
        <span
          className={`flex flex-wrap items-baseline gap-x-1 font-display text-[32px] leading-[0.9] font-extrabold [overflow-wrap:anywhere] ${alerta ? 'text-vermelho-texto' : ''}`}
        >
          {valor}
        </span>
        {complemento && <span className="text-xs leading-snug text-texto-2">{complemento}</span>}
        {rodape}
      </dd>
    </div>
  );
}

function Fracao({ de }: { de: number | string }) {
  return <small className="font-sans text-base font-semibold text-texto-2">/{de}</small>;
}

/** Linha de números grandes: o resumo do desafio em 8 cartões (2 por linha no celular, 4 no desktop). */
export function Kpis({ m }: { m: AdminMetricas }) {
  const semPix = m.desafio.valorInscricaoCentavos === null;
  const adesao = adesaoDoDia(diaMaisRecente(m));
  const invictos = invictosAtuais(m);
  const media = mediaDiasConcluidos(m.distribuicaoDiasConcluidos);
  const encerrado = m.desafio.status === 'ENCERRADO';
  const naoIniciado = m.desafio.status === 'NAO_INICIADO';
  const aguardando = m.pagamentos.aguardandoConferencia;
  const diasPassados = adesao?.dia.dia ?? 0;

  return (
    <section aria-label="Números principais">
      <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi
          rotulo="Vagas"
          valor={
            <>
              <Contador valor={m.vagas.ocupadas} />
              <Fracao de={m.vagas.total} />
            </>
          }
          complemento={
            m.vagas.livres > 0
              ? `${plural(m.vagas.livres, 'vaga livre', 'vagas livres')}`
              : 'Esgotadas'
          }
          rodape={
            <Medidor
              valor={m.vagas.ocupadas}
              maximo={m.vagas.total}
              rotulo="Vagas ocupadas"
              className="mt-auto"
            />
          }
        />
        <Kpi
          rotulo="Confirmados"
          valor={<Contador valor={m.funil.confirmados} />}
          complemento={
            m.funil.inscritos > 0
              ? `${formatarPct(percentual(m.funil.confirmados, m.funil.inscritos))} dos ${plural(m.funil.inscritos, 'inscrito')}`
              : 'Ninguém inscrito ainda'
          }
        />
        <Kpi
          rotulo="Receita confirmada"
          valor={semPix ? '—' : formatarReaisCurto(m.receita.confirmadaCentavos)}
          complemento={
            semPix
              ? 'Pix não configurado neste ambiente'
              : m.receita.pendenteCentavos > 0
                ? `+ ${formatarReaisCurto(m.receita.pendenteCentavos)} em vagas sem aviso`
                : 'Nenhuma vaga sem aviso de pagamento'
          }
        />
        <Kpi
          rotulo="Aguardando conferência"
          alerta={aguardando > 0}
          valor={
            semPix ? (
              <Contador valor={aguardando} />
            ) : (
              formatarReaisCurto(m.receita.aguardandoConferenciaCentavos)
            )
          }
          complemento={
            aguardando > 0
              ? `${plural(aguardando, 'aviso')} · o mais antigo há ${formatarDuracaoHoras(m.pagamentos.horasEsperaMaisAntiga)}`
              : 'Nenhum Pix esperando você'
          }
          rodape={
            aguardando > 0 ? (
              <LinkNav
                to="/admin/participantes"
                direcao="aba"
                className="mt-auto inline-flex min-h-11 items-center gap-1 self-start text-sm font-semibold text-vermelho-texto underline-offset-4 hover:underline"
              >
                Conferir agora
                <ArrowRight className="size-4" aria-hidden />
              </LinkNav>
            ) : null
          }
        />
        <Kpi
          rotulo={encerrado ? 'Adesão no último dia' : 'Adesão hoje'}
          valor={adesao ? formatarPct(adesao.pctConcluidos) : '—'}
          complemento={
            adesao
              ? `${adesao.dia.concluidos} de ${plural(adesao.dia.ativos, 'ativo')} concluíram · ${formatarPct(adesao.pctCheckin)} abriram o dia`
              : naoIniciado
                ? 'Aparece a partir do dia 1'
                : 'Sem dados'
          }
        />
        <Kpi
          rotulo="Invictos"
          valor={invictos ? <Contador valor={invictos.participantes} /> : '—'}
          complemento={
            invictos
              ? `${formatarPct(invictos.pct)} dos ativos sem falhar nenhum dia até o dia ${invictos.dia}`
              : 'Quem concluiu todos os dias até hoje'
          }
        />
        <Kpi
          rotulo="Média de dias concluídos"
          valor={
            media === null || naoIniciado ? (
              '—'
            ) : (
              <>
                {formatarDecimal(media)}
                <Fracao de={diasPassados || m.desafio.totalDias} />
              </>
            )
          }
          complemento="Por participante ativo"
        />
        <Kpi
          rotulo="Nota do feedback"
          valor={
            m.feedback.notaMedia === null ? (
              '—'
            ) : (
              <>
                {formatarDecimal(m.feedback.notaMedia)}
                <Fracao de={5} />
              </>
            )
          }
          complemento={
            m.feedback.respostas > 0
              ? plural(m.feedback.respostas, 'resposta')
              : 'Ainda sem respostas'
          }
        />
      </dl>
    </section>
  );
}
