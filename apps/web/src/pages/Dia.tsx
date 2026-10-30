import {
  METROS_POR_DIA,
  requisitosPendentes,
  type DesafioAtual,
  type DiaDetalhe,
  type MeuProgresso,
} from '@everest/shared';
import { Lock } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router';
import { BotaoVoltar } from '../components/layout/BotaoVoltar';
import { Alerta, Skeleton } from '../components/ui/basicos';
import { Botao } from '../components/ui/Botao';
import { useToast } from '../components/ui/Toast';
import { CardAgua } from '../features/checkin/CardAgua';
import { CardExercicio } from '../features/checkin/CardExercicio';
import { CardLeitura } from '../features/checkin/CardLeitura';
import { CardStory } from '../features/checkin/CardStory';
import { IndicadorSalvamento } from '../features/checkin/IndicadorSalvamento';
import { ResumoDia } from '../features/checkin/ResumoDia';
import { useCheckin } from '../features/checkin/useCheckin';
import { useDiaSelecionado } from '../features/checkin/useDiaSelecionado';
import { CardFotos } from '../features/fotos/CardFotos';
import { tiposFotosValidas } from '../features/fotos/fotosValidas';
import { usePollingFotos } from '../features/fotos/usePollingFotos';
import { ehApiError } from '../lib/api';
import { formatarDiaCurto } from '../lib/datas';
import { useDesafioAtual, useDia, useMe, useMeuProgresso } from '../lib/queries';
import { useOnline } from '../lib/useOnline';

function mensagemFalha(e: unknown, padrao: string): string {
  return ehApiError(e) ? e.message : padrao;
}

/** Topo: voltar, eyebrow, "DIA N" e o status de salvamento à direita. */
function Topo({ numeroDia, eyebrow, direita }: { numeroDia: number; eyebrow: string; direita?: ReactNode }) {
  return (
    <header className="flex items-center gap-3">
      <BotaoVoltar para="/desafio" />
      <div className="min-w-0 flex-1">
        <p className="rotulo">{eyebrow}</p>
        <h1 className="font-display text-[38px] leading-[0.9] font-black uppercase">Dia {numeroDia}</h1>
      </div>
      {direita}
    </header>
  );
}

function EsqueletoCards() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <Skeleton className="h-24 rounded-3xl" />
      <Skeleton className="h-44 rounded-3xl" />
      <Skeleton className="h-28 rounded-3xl" />
      <Skeleton className="h-32 rounded-3xl" />
      <Skeleton className="h-56 rounded-3xl" />
    </div>
  );
}

function ConteudoDia({
  slug,
  dia,
  eyebrow,
  totalDias,
  online,
  desafio,
}: {
  slug: string;
  dia: DiaDetalhe;
  eyebrow: string;
  totalDias: number;
  online: boolean;
  desafio: DesafioAtual | undefined;
}) {
  const { toast } = useToast();
  const editavel = dia.editavel && online;
  const checkin = useCheckin(slug, dia, editavel);
  usePollingFotos(slug, dia);

  const valores = checkin.valores;
  const pendentes = valores
    ? requisitosPendentes({ ...valores, fotosValidas: tiposFotosValidas(dia.fotos), invalidado: dia.invalidado })
    : dia.requisitosPendentes;
  // O banner só aparece com a confirmação do servidor e se a prévia local concordar.
  const concluido = dia.concluido && pendentes.length === 0;

  // Anima o banner (e mostra o toast) só na passagem de não concluído → concluído, não ao abrir.
  const concluidoAntes = useRef<boolean | null>(null);
  const [animar, setAnimar] = useState(false);
  useEffect(() => {
    if (concluidoAntes.current === false && concluido) {
      setAnimar(true);
      toast(`Dia ${dia.numeroDia} concluído. +${METROS_POR_DIA(totalDias)} m na escalada.`);
    }
    if (!concluido) setAnimar(false);
    concluidoAntes.current = concluido;
  }, [concluido, dia.numeroDia, totalDias, toast]);

  return (
    <div className="flex flex-col gap-4">
      <Topo
        numeroDia={dia.numeroDia}
        eyebrow={eyebrow}
        direita={
          dia.editavel ? (
            <IndicadorSalvamento
              estado={checkin.estado}
              erro={checkin.erro}
              aguardandoConexao={checkin.aguardandoConexao}
              online={online}
              aoTentarDeNovo={checkin.tentarDeNovo}
            />
          ) : undefined
        }
      />

      {dia.invalidado && (
        <Alerta tipo="aviso">
          <strong>Dia invalidado pelo embaixador.</strong>
          {dia.motivoInvalidacao ? ` Motivo: ${dia.motivoInvalidacao}` : ''} Ele não conta para o ranking.
        </Alerta>
      )}
      {!dia.editavel && (
        <p className="flex items-start gap-2 rounded-2xl bg-superficie-2 px-3.5 py-3 text-[13px] text-texto-2">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
          Só o dia de hoje pode ser editado. Este dia ficou {dia.concluido ? 'concluído' : 'incompleto'}.
        </p>
      )}
      {checkin.estado === 'erro' && checkin.erro && !checkin.erro.podeTentar && (
        <Alerta tipo="aviso">{checkin.erro.mensagem}</Alerta>
      )}

      <ResumoDia
        pendentes={pendentes}
        concluido={concluido}
        animarBanner={animar}
        editavel={dia.editavel}
        totalDias={totalDias}
      />
      {valores ? (
        <>
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
        </>
      ) : (
        <EsqueletoCards />
      )}
    </div>
  );
}

function TelaDia({
  slug,
  progresso,
  numeroDia,
  desafio,
}: {
  slug: string;
  progresso: MeuProgresso;
  numeroDia: number;
  desafio: DesafioAtual | undefined;
}) {
  const diaQ = useDia(slug, numeroDia);
  const online = useOnline();
  const resumo = progresso.dias.find((d) => d.numeroDia === numeroDia);
  const data = diaQ.data?.data ?? resumo?.data;
  const ehHoje = progresso.status === 'EM_ANDAMENTO' && numeroDia === progresso.diaAtual;
  const eyebrow = ehHoje
    ? `Hoje${data ? ` · ${formatarDiaCurto(data)}` : ''}`
    : `Dia encerrado${data ? ` · ${formatarDiaCurto(data)}` : ''}`;

  if (diaQ.isPending) {
    return (
      <div role="status" aria-label="Carregando o dia" className="flex flex-col gap-4">
        <Topo numeroDia={numeroDia} eyebrow={eyebrow} />
        <EsqueletoCards />
      </div>
    );
  }
  if (diaQ.isError) {
    return (
      <div className="flex flex-col gap-4">
        <Topo numeroDia={numeroDia} eyebrow={eyebrow} />
        <Alerta
          tipo="erro"
          acao={
            <Botao variante="secundario" tamanho="sm" onClick={() => void diaQ.refetch()}>
              Tentar de novo
            </Botao>
          }
        >
          {mensagemFalha(diaQ.error, 'Não foi possível carregar este dia.')}
        </Alerta>
      </div>
    );
  }
  // key: estado local dos cards (uploads, banner) é por dia.
  return (
    <ConteudoDia
      key={numeroDia}
      slug={slug}
      dia={diaQ.data}
      eyebrow={eyebrow}
      totalDias={progresso.totalDias}
      online={online}
      desafio={desafio}
    />
  );
}

/** /desafio/dia/:n: check-in do dia (docs/FRONTEND.md §9.5). */
export default function Dia() {
  const { data: me } = useMe();
  const slug = me?.participacao?.desafioSlug;
  const progressoQ = useMeuProgresso(slug);
  const desafioQ = useDesafioAtual();

  if (!slug || progressoQ.isPending) {
    return (
      <div role="status" aria-label="Carregando o dia" className="flex flex-col gap-4">
        <h1 className="sr-only">Check-in do dia</h1>
        <Skeleton className="h-12 w-2/3" />
        <EsqueletoCards />
      </div>
    );
  }
  if (progressoQ.isError) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-[38px] leading-[0.9] font-black uppercase">Check-in</h1>
        <Alerta
          tipo="erro"
          acao={
            <Botao variante="secundario" tamanho="sm" onClick={() => void progressoQ.refetch()}>
              Tentar de novo
            </Botao>
          }
        >
          {mensagemFalha(progressoQ.error, 'Não foi possível carregar o seu progresso.')}
        </Alerta>
      </div>
    );
  }
  return <DiaValidado slug={slug} progresso={progressoQ.data} desafio={desafioQ.data} />;
}

function DiaValidado({
  slug,
  progresso,
  desafio,
}: {
  slug: string;
  progresso: MeuProgresso;
  desafio: DesafioAtual | undefined;
}) {
  const { numeroDia, destino } = useDiaSelecionado(progresso);
  if (destino || numeroDia === null) return <Navigate to={destino ?? '/desafio'} replace />;
  return <TelaDia slug={slug} progresso={progresso} numeroDia={numeroDia} desafio={desafio} />;
}
