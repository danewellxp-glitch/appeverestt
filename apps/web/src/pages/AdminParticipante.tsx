import type { MeuProgresso } from '@everest/shared';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router';
import { GridDias } from '../components/GridDias';
import { Botao } from '../components/ui/Botao';
import { Alerta, Card, Skeleton } from '../components/ui/basicos';
import { formatarDataHora, useAdminParticipante, useSlugAdmin } from '../features/admin/consultas';
import { PainelDia } from '../features/admin/PainelDia';
import { CartoesProgresso, LegendaGrid } from '../features/ranking/ResumoProgresso';
import { SeloEmbaixador } from '../features/ranking/TabelaRanking';
import { ehApiError } from '../lib/api';

/** Dia aberto por padrão: o dia atual ou, fora dele, o último dia que já chegou. */
function diaPadrao(progresso: MeuProgresso): number | null {
  if (progresso.diaAtual !== null) return progresso.diaAtual;
  const passados = progresso.dias.filter((d) => d.situacao !== 'FUTURO');
  return passados.at(-1)?.numeroDia ?? null;
}

/** Lê ?dia=N, aceitando só dias que existem e já chegaram. */
function diaDaUrl(valor: string | null, progresso: MeuProgresso): number | null {
  if (!valor) return null;
  const n = Number(valor);
  const dia = progresso.dias.find((d) => d.numeroDia === n);
  return dia && dia.situacao !== 'FUTURO' ? n : null;
}

function LinkVoltar() {
  return (
    <Link
      to="/admin"
      className="inline-flex min-h-11 items-center gap-1 self-start rounded-xl pr-2 text-sm font-semibold text-texto-2 hover:text-texto"
    >
      <ArrowLeft className="size-4" aria-hidden />
      Participantes
    </Link>
  );
}

export default function AdminParticipante() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { slug, carregando, erro, tentarDeNovo } = useSlugAdmin();
  const consulta = useAdminParticipante(slug, id);

  if (erro) {
    return (
      <div className="flex flex-col gap-4">
        <LinkVoltar />
        <h1 className="text-2xl font-bold">Participante</h1>
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
      </div>
    );
  }

  if (carregando || consulta.isPending) {
    return (
      <div role="status" aria-label="Carregando participante" className="flex flex-col gap-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-16" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (consulta.isError) {
    const naoEncontrado = ehApiError(consulta.error, 'NAO_ENCONTRADO');
    return (
      <div className="flex flex-col gap-4">
        <LinkVoltar />
        <h1 className="text-2xl font-bold">Participante</h1>
        <Alerta
          tipo="erro"
          acao={
            naoEncontrado ? undefined : (
              <Botao variante="secundario" onClick={() => void consulta.refetch()}>
                Tentar de novo
              </Botao>
            )
          }
        >
          {naoEncontrado ? 'Participante não encontrado neste desafio.' : consulta.error.message}
        </Alerta>
      </div>
    );
  }

  const { participante, progresso } = consulta.data;
  const selecionado = diaDaUrl(params.get('dia'), progresso) ?? diaPadrao(progresso);

  function selecionar(n: number) {
    setParams(
      (atual) => {
        const proximo = new URLSearchParams(atual);
        proximo.set('dia', String(n));
        return proximo;
      },
      { replace: true, preventScrollReset: true },
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <LinkVoltar />

      <header className="flex flex-col gap-1">
        <p className="rotulo">Vaga {participante.vagaNumero ?? '—'}</p>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
          {participante.nome}
          {participante.ehEmbaixador && <SeloEmbaixador />}
        </h1>
        <p className="text-sm break-all text-texto-2">{participante.email}</p>
        <p className="text-xs text-texto-2">
          Inscrição em {formatarDataHora(participante.dataInscricao)}
        </p>
        {participante.diasInvalidados > 0 && (
          <p className="text-sm text-amber-200">
            {participante.diasInvalidados}{' '}
            {participante.diasInvalidados === 1 ? 'dia invalidado' : 'dias invalidados'}
          </p>
        )}
      </header>

      <section aria-label="Resumo do progresso">
        <CartoesProgresso progresso={progresso} />
      </section>

      <section aria-labelledby="titulo-grade">
        <Card className="flex flex-col gap-4">
          <div>
            <h2 id="titulo-grade" className="text-lg font-bold">
              Dias
            </h2>
            <p className="text-sm text-texto-2">Escolha um dia para ver as fotos e os valores.</p>
          </div>
          <GridDias
            dias={progresso.dias}
            selecionado={selecionado}
            aoSelecionar={selecionar}
            rotulo={`Dias de ${participante.nome}`}
          />
          <LegendaGrid />
        </Card>
      </section>

      {selecionado === null ? (
        <Card>
          <p className="text-sm text-texto-2">
            O desafio ainda não começou: nenhum dia para revisar.
          </p>
        </Card>
      ) : slug && id ? (
        <PainelDia key={selecionado} slug={slug} participanteId={id} numeroDia={selecionado} />
      ) : null}
    </div>
  );
}
