import type { ReactNode } from 'react';
import { BotaoVoltar } from '../components/layout/BotaoVoltar';
import { Alerta, Skeleton } from '../components/ui/basicos';
import { Botao } from '../components/ui/Botao';
import { Contador } from '../components/ui/Contador';
import { useAdminParticipantes, useSlugAdmin } from '../features/admin/consultas';
import { ListaParticipantes } from '../features/admin/ListaParticipantes';
import { ToggleInscricoes } from '../features/admin/ToggleInscricoes';
import { useFeed } from '../lib/queries';

function Tile({ rotulo, destaque = false, children }: { rotulo: string; destaque?: boolean; children: ReactNode }) {
  return (
    <div className="grid gap-1 rounded-[22px] bg-superficie p-3 shadow-[inset_0_0_0_1px_var(--borda)]">
      <span className="text-[10px] font-semibold tracking-[0.12em] text-texto-2 uppercase">{rotulo}</span>
      <span
        className={`flex items-baseline gap-0.5 font-display text-[30px] leading-[0.9] font-extrabold tabular-nums ${destaque ? 'text-vermelho-texto' : ''}`}
      >
        {children}
      </span>
    </div>
  );
}

/** /admin (docs/FRONTEND.md §9.11): números do dia, inscrições e a fila de conferência. */
export default function Admin() {
  const { slug, carregando, erro, tentarDeNovo } = useSlugAdmin();
  const lista = useAdminParticipantes(slug);
  const feed = useFeed(slug);

  const totalVagas = lista.data?.desafio.totalVagas ?? 0;
  const ocupadas = lista.data?.participantes.filter((p) => p.vagaNumero !== null).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <header className="surgir flex items-center gap-3">
        <BotaoVoltar para="/perfil" />
        <div className="min-w-0 flex-1">
          <p className="rotulo">Embaixador</p>
          <h1 className="font-display text-[38px] leading-[0.9] font-black uppercase">Painel</h1>
        </div>
      </header>

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
      ) : carregando || lista.isPending ? (
        <div role="status" aria-label="Carregando participantes" className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-20 rounded-[22px]" />
            ))}
          </div>
          <Skeleton className="h-14 rounded-2xl" />
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-[20px]" />
          ))}
        </div>
      ) : lista.isError ? (
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
      ) : (
        <>
          <section aria-label="Números do desafio" className="grid grid-cols-3 gap-2">
            <Tile rotulo="Vagas">
              <Contador valor={ocupadas} />
              <small className="text-base text-texto-2">/{totalVagas}</small>
            </Tile>
            <Tile rotulo="Fecharam hoje">
              {feed.data ? <Contador valor={feed.data.fecharamHoje} /> : '—'}
            </Tile>
            <Tile rotulo="Para revisar" destaque={lista.data.totalParaRevisar > 0}>
              <Contador valor={lista.data.totalParaRevisar} />
            </Tile>
          </section>

          <ToggleInscricoes slug={lista.data.desafio.slug} abertas={lista.data.desafio.inscricoesAbertas} />

          <section aria-labelledby="titulo-participantes" className="flex flex-col gap-3">
            <h2 id="titulo-participantes" className="mt-1.5 text-[13px] font-semibold tracking-[0.14em] text-texto-2 uppercase">
              Participantes
            </h2>
            <ListaParticipantes participantes={lista.data.participantes} />
          </section>
        </>
      )}
    </div>
  );
}
