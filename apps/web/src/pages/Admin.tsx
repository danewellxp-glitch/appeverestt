import { Suspense, type CSSProperties } from 'react';
import { Outlet } from 'react-router';
import { BotaoVoltar } from '../components/layout/BotaoVoltar';
import { Alerta, Skeleton } from '../components/ui/basicos';
import { Botao } from '../components/ui/Botao';
import { useAdminDesafios, useAdminParticipantes } from '../features/admin/consultas';
import { SelosDesafio, SemDesafioAtivo } from '../features/admin/desafio/ListaDesafios';
import { AbasPainel, LarguraPainel, type ContextoPainel } from '../features/admin/LayoutPainel';

function CarregandoAba() {
  return (
    <div role="status" aria-label="Carregando a seção" className="grid gap-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-[22px]" />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    </div>
  );
}

/**
 * /admin: layout do painel do embaixador. Mostra o desafio ativo e as abas Indicadores (padrão),
 * Participantes, Desafio e Avisos. Sem desafio ativo, mostra a lista para ativar e o "Criar desafio".
 */
export default function Admin() {
  const consulta = useAdminDesafios();
  const desafios = consulta.data?.desafios ?? [];
  const ativo = desafios.find((d) => d.ativo) ?? null;
  // Selo de pendências na aba Participantes (mesma consulta da aba: o cache é compartilhado).
  const participantes = useAdminParticipantes(ativo?.slug);
  const pendencias =
    (participantes.data?.totalPagamentosInformados ?? 0) +
    (participantes.data?.totalParaRevisar ?? 0);

  return (
    <LarguraPainel className="flex flex-col gap-4">
      <header className="surgir flex items-center gap-3">
        <BotaoVoltar para="/perfil" />
        <div className="min-w-0 flex-1">
          <p className="rotulo">Embaixador</p>
          <h1 className="font-display text-[38px] leading-[0.9] font-black uppercase">Painel</h1>
        </div>
      </header>

      {consulta.isPending ? (
        <div role="status" aria-label="Carregando o painel" className="grid gap-3">
          <Skeleton className="h-6 w-2/3 max-w-sm" />
          <Skeleton className="h-[52px] max-w-xl rounded-full" />
          <CarregandoAba />
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
          Não foi possível carregar os desafios. {consulta.error.message}
        </Alerta>
      ) : !ativo ? (
        <SemDesafioAtivo desafios={desafios} />
      ) : (
        <>
          <div
            className="surgir -mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5"
            style={{ '--i': 1 } as CSSProperties}
          >
            <p className="text-[15px] font-semibold [overflow-wrap:anywhere]">{ativo.nome}</p>
            <SelosDesafio d={ativo} />
          </div>
          <AbasPainel pendencias={pendencias} />
          <Suspense fallback={<CarregandoAba />}>
            <Outlet context={{ desafio: ativo, desafios } satisfies ContextoPainel} />
          </Suspense>
        </>
      )}
    </LarguraPainel>
  );
}
