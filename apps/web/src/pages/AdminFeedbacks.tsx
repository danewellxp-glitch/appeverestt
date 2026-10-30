import type { AdminFeedback } from '@everest/shared';
import { Megaphone } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { BotaoVoltar } from '../components/layout/BotaoVoltar';
import { Alerta, Skeleton } from '../components/ui/basicos';
import { Botao } from '../components/ui/Botao';
import { formatarDataHora, useAdminFeedbacks, useSlugAdmin } from '../features/admin/consultas';
import { NotaEstrelas } from '../features/feedback/Estrelas';
import { marcarDirecao } from '../lib/transicoes';

const MEDIA = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function Topo() {
  return (
    <header className="surgir flex items-center gap-3">
      <BotaoVoltar para="/admin" />
      <div className="min-w-0 flex-1">
        <p className="rotulo">Embaixador</p>
        <h1 className="font-display text-[38px] leading-[0.9] font-black uppercase">Feedbacks</h1>
      </div>
    </header>
  );
}

function Numero({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 rounded-[22px] bg-superficie p-3 shadow-[inset_0_0_0_1px_var(--borda)]">
      <dt className="text-[10px] font-semibold tracking-[0.12em] text-texto-2 uppercase">{rotulo}</dt>
      <dd className="font-display text-[30px] leading-[0.9] font-extrabold tabular-nums">{children}</dd>
    </div>
  );
}

function CartaoFeedback({ f }: { f: AdminFeedback }) {
  return (
    <li className="grid gap-3 rounded-3xl bg-superficie p-[18px] shadow-[inset_0_0_0_1px_var(--borda)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid min-w-0">
          <Link
            to={`/admin/participantes/${f.participanteId}`}
            viewTransition
            onClick={() => marcarDirecao('avancar')}
            className="truncate font-semibold underline-offset-4 hover:underline"
          >
            {f.nome}
          </Link>
          <small className="text-xs text-texto-2">
            {[f.instagram ? `@${f.instagram}` : null, f.vagaNumero !== null ? `Vaga nº ${f.vagaNumero}` : null]
              .filter(Boolean)
              .join(' · ')}
          </small>
        </div>
        <NotaEstrelas nota={f.nota} />
      </div>
      <dl className="grid gap-2.5">
        <div>
          <dt className="rotulo">O que achou</dt>
          <dd className="text-[15px] whitespace-pre-line [overflow-wrap:anywhere]">{f.oQueAchou}</dd>
        </div>
        <div>
          <dt className="rotulo">O que mudou</dt>
          <dd className="text-[15px] whitespace-pre-line [overflow-wrap:anywhere]">{f.oQueMudou}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {f.autorizaDivulgacao ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-vermelho px-2.5 py-1 text-xs font-bold text-sobre-vermelho">
            <Megaphone className="size-3.5" aria-hidden />
            Autorizou divulgação
          </span>
        ) : (
          <span className="rounded-full bg-superficie-2 px-2.5 py-1 text-xs font-semibold text-texto-2">
            Sem autorização para divulgar
          </span>
        )}
        <small className="text-xs text-texto-2">{formatarDataHora(f.atualizadoEm)}</small>
      </div>
    </li>
  );
}

/** /admin/feedbacks (X13): média, total e a lista de depoimentos. */
export default function AdminFeedbacks() {
  const { slug, carregando, erro, tentarDeNovo } = useSlugAdmin();
  const consulta = useAdminFeedbacks(slug);

  return (
    <div className="flex flex-col gap-4">
      <Topo />
      {erro ? (
        <Alerta
          tipo="erro"
          acao={
            <Botao variante="secundario" tamanho="sm" onClick={tentarDeNovo}>
              Tentar de novo
            </Botao>
          }
        >
          Não foi possível identificar o desafio ativo.
        </Alerta>
      ) : !carregando && !slug ? (
        <p className="rounded-3xl bg-superficie p-5 text-sm text-texto-2 shadow-[inset_0_0_0_1px_var(--borda)]">
          Nenhum desafio ativo no momento.
        </p>
      ) : carregando || consulta.isPending ? (
        <div role="status" aria-label="Carregando os feedbacks" className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-20 rounded-[22px]" />
            <Skeleton className="h-20 rounded-[22px]" />
          </div>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-44 rounded-3xl" />
          ))}
        </div>
      ) : consulta.isError ? (
        <Alerta
          tipo="erro"
          acao={
            <Botao variante="secundario" tamanho="sm" onClick={() => void consulta.refetch()}>
              Tentar de novo
            </Botao>
          }
        >
          {consulta.error.message}
        </Alerta>
      ) : (
        <>
          <dl aria-label="Resumo dos feedbacks" className="grid grid-cols-2 gap-2">
            <Numero rotulo="Média">
              {consulta.data.media === null ? '—' : MEDIA.format(consulta.data.media)}
              {consulta.data.media !== null && <small className="text-base text-texto-2">/5</small>}
            </Numero>
            <Numero rotulo="Total">{consulta.data.total}</Numero>
          </dl>
          {consulta.data.feedbacks.length === 0 ? (
            <p className="rounded-3xl bg-superficie p-6 text-center text-sm text-texto-2 shadow-[inset_0_0_0_1px_var(--borda)]">
              Nenhum feedback ainda.
            </p>
          ) : (
            <ul className="grid gap-3">
              {consulta.data.feedbacks.map((f) => (
                <CartaoFeedback key={f.participanteId} f={f} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
