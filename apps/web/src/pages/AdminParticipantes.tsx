import { Download, MessageSquareHeart } from 'lucide-react';
import type { ReactNode } from 'react';
import { LinkNav } from '../components/layout/LinkNav';
import { Alerta, Skeleton } from '../components/ui/basicos';
import { Botao } from '../components/ui/Botao';
import { Contador } from '../components/ui/Contador';
import { AdicionarParticipante } from '../features/admin/AdicionarParticipante';
import { caminhoCsvParticipantes, useAdminParticipantes } from '../features/admin/consultas';
import { FilaPagamentos } from '../features/admin/FilaPagamentos';
import { CLASSE_LINK_SECUNDARIO, useContextoPainel } from '../features/admin/LayoutPainel';
import { ListaParticipantes } from '../features/admin/ListaParticipantes';
import { ToggleInscricoes } from '../features/admin/ToggleInscricoes';
import { useFeed } from '../lib/queries';

function Tile({
  rotulo,
  destaque = false,
  children,
}: {
  rotulo: string;
  destaque?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1 rounded-[22px] bg-superficie p-3 shadow-[inset_0_0_0_1px_var(--borda)]">
      <span className="text-[10px] font-semibold tracking-[0.12em] text-texto-2 uppercase">
        {rotulo}
      </span>
      <span
        className={`flex items-baseline gap-0.5 font-display text-[30px] leading-[0.9] font-extrabold tabular-nums ${destaque ? 'text-vermelho-texto' : ''}`}
      >
        {children}
      </span>
    </div>
  );
}

/**
 * /admin/participantes (docs/FRONTEND.md §9.11): números do dia, pagamentos a confirmar,
 * inscrições, adicionar participante, CSV, feedbacks e a lista (fila de conferência).
 */
export default function AdminParticipantes() {
  const { desafio } = useContextoPainel();
  const slug = desafio.slug;
  const lista = useAdminParticipantes(slug);
  const feed = useFeed(slug);

  if (lista.isPending) {
    return (
      <div role="status" aria-label="Carregando participantes" className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-[22px]" />
          ))}
        </div>
        <Skeleton className="h-14 rounded-2xl" />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-16 rounded-[20px]" />
        ))}
      </div>
    );
  }
  if (lista.isError) {
    return (
      <Alerta
        tipo="erro"
        acao={
          <Botao variante="secundario" tamanho="sm" onClick={() => void lista.refetch()}>
            Tentar de novo
          </Botao>
        }
      >
        {lista.error.message}
      </Alerta>
    );
  }

  const dados = lista.data;
  const ocupadas = dados.participantes.filter((p) => p.vagaNumero !== null).length;
  const totalFeedbacks = dados.participantes.filter((p) => p.temFeedback).length;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-6">
      <div className="flex min-w-0 flex-col gap-4">
        <section aria-label="Números do desafio" className="grid grid-cols-2 gap-2">
          <Tile rotulo="Vagas">
            <Contador valor={ocupadas} />
            <small className="text-base text-texto-2">/{dados.desafio.totalVagas}</small>
          </Tile>
          <Tile rotulo="Fecharam hoje">
            {feed.data ? <Contador valor={feed.data.fecharamHoje} /> : '—'}
          </Tile>
          <Tile rotulo="Para revisar" destaque={dados.totalParaRevisar > 0}>
            <Contador valor={dados.totalParaRevisar} />
          </Tile>
          <Tile rotulo="Pagamentos" destaque={dados.totalPagamentosInformados > 0}>
            <Contador valor={dados.totalPagamentosInformados} />
          </Tile>
        </section>

        <FilaPagamentos slug={slug} participantes={dados.participantes} />

        <ToggleInscricoes slug={slug} abertas={dados.desafio.inscricoesAbertas} />

        <nav aria-label="Ações e dados do desafio" className="flex flex-wrap gap-2">
          <AdicionarParticipante slug={slug} />
          <a
            href={caminhoCsvParticipantes(slug)}
            download
            className={`${CLASSE_LINK_SECUNDARIO} flex-auto`}
          >
            <Download className="size-4" aria-hidden />
            Baixar CSV (dados de todos)
          </a>
          <LinkNav to="/admin/feedbacks" className={`${CLASSE_LINK_SECUNDARIO} flex-auto`}>
            <MessageSquareHeart className="size-4" aria-hidden />
            Feedbacks ({totalFeedbacks})
          </LinkNav>
        </nav>
      </div>

      <section aria-labelledby="titulo-participantes" className="flex min-w-0 flex-col gap-3">
        <h2
          id="titulo-participantes"
          className="mt-1.5 text-[13px] font-semibold tracking-[0.14em] text-texto-2 uppercase"
        >
          Participantes
        </h2>
        <ListaParticipantes participantes={dados.participantes} />
      </section>
    </div>
  );
}
