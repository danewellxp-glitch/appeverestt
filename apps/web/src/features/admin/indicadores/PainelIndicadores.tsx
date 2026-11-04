import { TIMEZONE_PADRAO, type AdminMetricas } from '@everest/shared';
import { CalendarClock, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatarData } from '../../../lib/datas';
import { diasAteOInicio } from '../desafio/regras';
import { CLASSE_TOKENS_GRAFICO } from '../graficos/base';
import { formatarHoraMinuto, plural } from '../graficos/formato';
import { EmRisco } from './EmRisco';
import {
  CartaoAdesao,
  CartaoConferencia,
  CartaoDistribuicao,
  CartaoFeedback,
  CartaoHorario,
  CartaoImpacto,
  CartaoInvictos,
  CartaoPerfil,
  CartaoRequisitos,
} from './GraficosDesafio';
import { CartaoFunil, CartaoInscricoes } from './GraficosInscricao';
import { Kpis } from './Kpis';

function Secao({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2
        id={id}
        className="mt-2 text-[13px] font-semibold tracking-[0.14em] text-texto-2 uppercase"
      >
        {titulo}
      </h2>
      {children}
    </section>
  );
}

const GRADE = 'grid items-start gap-3 lg:grid-cols-2';

/**
 * Painel de indicadores ("Power BI" do embaixador): KPIs, quem está em risco e os gráficos de
 * inscrição, engajamento, conferência, perfil e feedback. Antes do dia 1, os gráficos de
 * engajamento dão lugar a um aviso único.
 */
export function PainelIndicadores({
  m,
  atualizando,
  aoAtualizar,
}: {
  m: AdminMetricas;
  atualizando: boolean;
  aoAtualizar: () => void;
}) {
  const naoIniciado = m.desafio.status === 'NAO_INICIADO';
  const emAndamento = m.desafio.status === 'EM_ANDAMENTO';
  const faltam = naoIniciado ? diasAteOInicio(m.desafio.dataInicio, TIMEZONE_PADRAO) : null;

  return (
    <div className={`flex flex-col gap-4 ${CLASSE_TOKENS_GRAFICO}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-texto-2" aria-live="polite">
          Atualizado às {formatarHoraMinuto(m.geradoEm)} · atualiza sozinho a cada minuto
        </p>
        <button
          type="button"
          onClick={aoAtualizar}
          disabled={atualizando}
          className="press inline-flex min-h-11 items-center gap-1.5 rounded-full bg-superficie-2 px-3.5 text-sm font-semibold disabled:opacity-60"
        >
          <RefreshCw className={`size-4 ${atualizando ? 'animate-spin' : ''}`} aria-hidden />
          {atualizando ? 'Atualizando…' : 'Atualizar'}
        </button>
      </div>

      <Kpis m={m} />

      {emAndamento && <EmRisco m={m} />}

      <Secao id="titulo-sec-inscricoes" titulo="Inscrições">
        <div className={GRADE}>
          <CartaoFunil m={m} />
          <CartaoInscricoes m={m} />
        </div>
      </Secao>

      {naoIniciado ? (
        <Secao id="titulo-sec-engajamento" titulo="Engajamento">
          <p className="flex items-start gap-3 rounded-3xl bg-superficie p-5 text-sm text-texto-2 shadow-[inset_0_0_0_1px_var(--borda)]">
            <CalendarClock className="mt-0.5 size-5 shrink-0 text-vermelho-texto" aria-hidden />
            <span>
              O desafio começa em {formatarData(m.desafio.dataInicio)}
              {faltam !== null && faltam > 0
                ? ` (${faltam === 1 ? 'amanhã' : `daqui a ${plural(faltam, 'dia')}`})`
                : ''}
              . Adesão, invictos, hábitos, horários e conferência aparecem a partir do dia 1.
            </span>
          </p>
        </Secao>
      ) : (
        <>
          <Secao id="titulo-sec-engajamento" titulo="Engajamento">
            <div className={GRADE}>
              <CartaoAdesao m={m} />
              <CartaoInvictos m={m} />
              <CartaoRequisitos m={m} />
              <CartaoDistribuicao m={m} />
              <CartaoHorario m={m} />
              <CartaoConferencia m={m} />
            </div>
          </Secao>
          <Secao id="titulo-sec-impacto" titulo="Impacto">
            <CartaoImpacto m={m} />
          </Secao>
        </>
      )}

      <Secao id="titulo-sec-pessoas" titulo="Pessoas">
        <div className={GRADE}>
          <CartaoPerfil m={m} />
          <CartaoFeedback m={m} />
        </div>
      </Secao>
    </div>
  );
}
