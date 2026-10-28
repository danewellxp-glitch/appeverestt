import { TOTAL_DIAS_PADRAO } from '@everest/shared';
import { Botao } from '../components/ui/Botao';
import { Alerta, Card, Skeleton } from '../components/ui/basicos';
import { useAdminParticipantes, useSlugAdmin } from '../features/admin/consultas';
import { ListaParticipantes } from '../features/admin/ListaParticipantes';
import { ToggleInscricoes } from '../features/admin/ToggleInscricoes';
import { useDesafioAtual } from '../lib/queries';

function EsqueletoAdmin() {
  return (
    <div role="status" aria-label="Carregando participantes" className="flex flex-col gap-3">
      <Skeleton className="h-24" />
      <Skeleton className="h-11" />
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-20" />
      ))}
    </div>
  );
}

export default function Admin() {
  const { slug, carregando, erro, tentarDeNovo } = useSlugAdmin();
  const { data: desafioAtual } = useDesafioAtual();
  const lista = useAdminParticipantes(slug);

  const totalVagas = lista.data?.desafio.totalVagas;
  const ocupadas = lista.data?.participantes.filter((p) => p.vagaNumero !== null).length ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="rotulo">Painel do embaixador</p>
        <h1 className="text-3xl font-bold">{lista.data?.desafio.nome ?? 'Admin'}</h1>
        {totalVagas !== undefined && (
          <p className="text-sm text-texto-2">
            {ocupadas} de {totalVagas} vagas ocupadas
          </p>
        )}
      </header>

      {erro ? (
        <Alerta
          tipo="erro"
          acao={
            <Botao variante="secundario" onClick={tentarDeNovo}>
              Tentar de novo
            </Botao>
          }
        >
          Não foi possível identificar o desafio ativo.
        </Alerta>
      ) : !carregando && !slug ? (
        <Card>
          <p className="text-sm text-texto-2">Nenhum desafio ativo no momento.</p>
        </Card>
      ) : carregando || lista.isPending ? (
        <EsqueletoAdmin />
      ) : lista.isError ? (
        <Alerta
          tipo="erro"
          acao={
            <Botao variante="secundario" onClick={() => void lista.refetch()}>
              Tentar de novo
            </Botao>
          }
        >
          {lista.error.message}
        </Alerta>
      ) : (
        <>
          <ToggleInscricoes
            slug={lista.data.desafio.slug}
            abertas={lista.data.desafio.inscricoesAbertas}
          />
          <section aria-labelledby="titulo-participantes" className="flex flex-col gap-3">
            <h2 id="titulo-participantes" className="text-lg font-bold">
              Participantes
            </h2>
            <ListaParticipantes
              participantes={lista.data.participantes}
              totalDias={desafioAtual?.totalDias ?? TOTAL_DIAS_PADRAO}
            />
          </section>
        </>
      )}
    </div>
  );
}
