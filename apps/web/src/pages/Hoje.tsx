import { requisitosPendentes, type DesafioAtual, type DiaDetalhe, type MeuProgresso } from '@everest/shared';
import { GridDias } from '../components/GridDias';
import { Botao } from '../components/ui/Botao';
import { Alerta, Skeleton } from '../components/ui/basicos';
import { CabecalhoDia } from '../features/checkin/CabecalhoDia';
import { CardAgua } from '../features/checkin/CardAgua';
import { CardExercicio } from '../features/checkin/CardExercicio';
import { CardLeitura } from '../features/checkin/CardLeitura';
import { CardStory } from '../features/checkin/CardStory';
import { IndicadorSalvamento } from '../features/checkin/IndicadorSalvamento';
import { ResumoDia } from '../features/checkin/ResumoDia';
import { TelaAntesInicio } from '../features/checkin/TelaAntesInicio';
import { TelaEncerrado } from '../features/checkin/TelaEncerrado';
import { useCheckin } from '../features/checkin/useCheckin';
import { useDiaSelecionado } from '../features/checkin/useDiaSelecionado';
import { CardFotos } from '../features/fotos/CardFotos';
import { tiposFotosValidas } from '../features/fotos/fotosValidas';
import { usePollingFotos } from '../features/fotos/usePollingFotos';
import { ehApiError } from '../lib/api';
import { useDesafioAtual, useDia, useMe, useMeuProgresso } from '../lib/queries';
import { useOnline } from '../lib/useOnline';

function mensagemFalha(e: unknown, padrao: string): string {
  return ehApiError(e) ? e.message : padrao;
}

function EsqueletoCards() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <Skeleton className="h-16" />
      <Skeleton className="h-44" />
      <Skeleton className="h-24" />
      <Skeleton className="h-36" />
      <Skeleton className="h-72" />
    </div>
  );
}

function EsqueletoHoje() {
  return (
    <div role="status" aria-label="Carregando o seu dia" className="flex flex-col gap-5">
      <h1 className="sr-only">Hoje</h1>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-5 w-56" />
      </div>
      <Skeleton className="h-64" />
      <EsqueletoCards />
    </div>
  );
}

/** Avisos de por que o dia está em modo leitura, offline ou invalidado. */
function AvisosDia({ dia, online }: { dia: DiaDetalhe; online: boolean }) {
  return (
    <>
      {dia.invalidado && (
        <Alerta tipo="aviso">
          <strong>Dia invalidado pelo embaixador.</strong>
          {dia.motivoInvalidacao ? ` Motivo: ${dia.motivoInvalidacao}` : ''} Ele não conta para o ranking.
        </Alerta>
      )}
      {!dia.editavel ? (
        <Alerta tipo="info">Dias anteriores ficam só para consulta.</Alerta>
      ) : (
        !online && (
          <Alerta tipo="aviso">Você está offline. A edição volta quando a conexão voltar.</Alerta>
        )
      )}
    </>
  );
}

function ConteudoDia({
  slug,
  dia,
  online,
  desafio,
}: {
  slug: string;
  dia: DiaDetalhe;
  online: boolean;
  desafio: DesafioAtual | undefined;
}) {
  const editavel = dia.editavel && online;
  const checkin = useCheckin(slug, dia, editavel);
  usePollingFotos(slug, dia);

  const valores = checkin.valores;
  if (!valores) return <EsqueletoCards />;

  const pendentes = requisitosPendentes({
    ...valores,
    fotosValidas: tiposFotosValidas(dia.fotos),
    invalidado: dia.invalidado,
  });
  // O banner só aparece com a confirmação do servidor e se a prévia local concordar.
  const concluido = dia.concluido && pendentes.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <AvisosDia dia={dia} online={online} />
      <ResumoDia pendentes={pendentes} concluido={concluido} />
      {dia.editavel && (
        <IndicadorSalvamento
          estado={checkin.estado}
          erro={checkin.erro}
          aguardandoConexao={checkin.aguardandoConexao}
          aoTentarDeNovo={checkin.tentarDeNovo}
        />
      )}
      <CardAgua
        aguaMl={valores.aguaMl}
        editavel={editavel}
        aoAlterar={(fn) => checkin.alterar((v) => ({ ...v, aguaMl: fn(v.aguaMl) }))}
      />
      <CardExercicio
        exercicio={valores.exercicio}
        editavel={editavel}
        aoAlterar={(feito) => checkin.alterar((v) => ({ ...v, exercicio: feito }))}
      />
      <CardLeitura
        paginas={valores.paginasLidas}
        editavel={editavel}
        aoAlterar={(fn) => checkin.alterar((v) => ({ ...v, paginasLidas: fn(v.paginasLidas) }))}
      />
      <CardFotos slug={slug} numeroDia={dia.numeroDia} fotos={dia.fotos} editavel={editavel} />
      <CardStory
        storyPostado={valores.storyPostado}
        editavel={editavel}
        aoAlterar={(postado) => checkin.alterar((v) => ({ ...v, storyPostado: postado }))}
        instagramHandle={desafio?.instagramHandle}
        hashtag={desafio?.hashtag}
      />
    </div>
  );
}

function DiaEmAndamento({
  slug,
  progresso,
  diaAtual,
  desafio,
}: {
  slug: string;
  progresso: MeuProgresso;
  diaAtual: number;
  desafio: DesafioAtual | undefined;
}) {
  const { selecionado, selecionar } = useDiaSelecionado(progresso);
  const numeroDia = selecionado ?? diaAtual;
  const diaQ = useDia(slug, numeroDia);
  const online = useOnline();
  const resumo = progresso.dias.find((d) => d.numeroDia === numeroDia);

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoDia
        numeroDia={numeroDia}
        totalDias={progresso.totalDias}
        data={diaQ.data?.data ?? resumo?.data}
        ehHoje={numeroDia === diaAtual}
      />
      <GridDias
        dias={progresso.dias}
        selecionado={numeroDia}
        aoSelecionar={selecionar}
        rotulo="Dias do desafio: toque em um dia para abrir"
      />
      {diaQ.isPending ? (
        <EsqueletoCards />
      ) : diaQ.isError ? (
        <Alerta
          tipo="erro"
          acao={
            <Botao variante="secundario" onClick={() => void diaQ.refetch()} className="shrink-0">
              Tentar de novo
            </Botao>
          }
        >
          {mensagemFalha(diaQ.error, 'Não foi possível carregar este dia.')}
        </Alerta>
      ) : (
        // key: estado local dos cards (uploads, campo de páginas) é por dia.
        <ConteudoDia key={numeroDia} slug={slug} dia={diaQ.data} online={online} desafio={desafio} />
      )}
    </div>
  );
}

/** /hoje — check-in diário. */
export default function Hoje() {
  const { data: me } = useMe();
  const slug = me?.participacao?.desafioSlug;
  const progressoQ = useMeuProgresso(slug);
  const desafioQ = useDesafioAtual();

  if (!slug || progressoQ.isPending) return <EsqueletoHoje />;

  if (progressoQ.isError) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">Hoje</h1>
        <Alerta
          tipo="erro"
          acao={
            <Botao variante="secundario" onClick={() => void progressoQ.refetch()} className="shrink-0">
              Tentar de novo
            </Botao>
          }
        >
          {mensagemFalha(progressoQ.error, 'Não foi possível carregar o seu progresso.')}
        </Alerta>
      </div>
    );
  }

  const progresso = progressoQ.data;
  if (progresso.status === 'NAO_INICIADO') {
    return (
      <TelaAntesInicio
        desafio={desafioQ.data}
        falhou={desafioQ.isError}
        aoTentarDeNovo={() => void desafioQ.refetch()}
        progresso={progresso}
      />
    );
  }
  if (progresso.status === 'ENCERRADO' || progresso.diaAtual === null) {
    return <TelaEncerrado progresso={progresso} />;
  }
  return <DiaEmAndamento slug={slug} progresso={progresso} diaAtual={progresso.diaAtual} desafio={desafioQ.data} />;
}
