import { useNavigate } from 'react-router';
import { GridDias } from '../components/GridDias';
import { Botao } from '../components/ui/Botao';
import { Alerta, Card, Skeleton } from '../components/ui/basicos';
import { CartoesProgresso, LegendaGrid } from '../features/ranking/ResumoProgresso';
import { useMe, useMeuProgresso } from '../lib/queries';
import { caminhoDoDia } from '../features/desafio/navegacao';

function EsqueletoProgresso() {
  return (
    <div role="status" aria-label="Carregando seu progresso" className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

export default function Progresso() {
  const { data: me } = useMe();
  const slug = me?.participacao?.desafioSlug;
  const progresso = useMeuProgresso(slug);
  const navegar = useNavigate();

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="rotulo">Sua jornada</p>
        <h1 className="text-3xl font-bold">Progresso</h1>
      </header>

      {progresso.isPending ? (
        <EsqueletoProgresso />
      ) : progresso.isError ? (
        <Alerta
          tipo="erro"
          acao={
            <Botao variante="secundario" onClick={() => void progresso.refetch()}>
              Tentar de novo
            </Botao>
          }
        >
          {progresso.error.message}
        </Alerta>
      ) : (
        <>
          {progresso.data.status === 'NAO_INICIADO' && (
            <Alerta tipo="info">
              O desafio ainda não começou. Seu progresso aparece aqui a partir do dia 1.
            </Alerta>
          )}
          {progresso.data.status === 'ENCERRADO' && (
            <Alerta tipo="sucesso">
              O desafio terminou! Você concluiu {progresso.data.diasConcluidos} de{' '}
              {progresso.data.totalDias} dias.
            </Alerta>
          )}

          <section aria-labelledby="titulo-resumo">
            <h2 id="titulo-resumo" className="sr-only">
              Resumo
            </h2>
            <CartoesProgresso progresso={progresso.data} />
          </section>

          <section aria-labelledby="titulo-dias">
            <Card className="flex flex-col gap-4">
              <div>
                <h2 id="titulo-dias" className="text-lg font-bold">
                  Seus 30 dias
                </h2>
                <p className="text-sm text-texto-2">Toque em um dia para ver o check-in.</p>
              </div>
              <GridDias
                dias={progresso.data.dias}
                aoSelecionar={(n) => void navegar(caminhoDoDia(n))}
                rotulo="Seus dias no desafio"
              />
              <LegendaGrid />
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
