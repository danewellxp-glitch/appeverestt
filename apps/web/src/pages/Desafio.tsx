import { altitudeSimbolica, type DesafioAtual, type MeuProgresso } from '@everest/shared';
import { BookOpen, CalendarClock } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { Avatar } from '../components/ui/Avatar';
import { Alerta, Skeleton } from '../components/ui/basicos';
import { Botao } from '../components/ui/Botao';
import { CardEscalada, CardStoryDoDia, CarrosselDestaque } from '../features/desafio/CarrosselDestaque';
import { CardSeuDia } from '../features/desafio/CardSeuDia';
import { CardsAtividade } from '../features/desafio/CardsAtividade';
import { CtaFixo } from '../features/desafio/CtaFixo';
import { FaixaDias } from '../features/desafio/FaixaDias';
import { caminhoDoDia, preCarregarDia } from '../features/desafio/navegacao';
import { formatarDataCurta, formatarDiaCurto } from '../lib/datas';
import { useDesafioAtual, useDia, useFeed, useMe, useMeuProgresso, useRanking } from '../lib/queries';
import { abrirComTransformacao, marcarDirecao } from '../lib/transicoes';

const FORMATO = new Intl.NumberFormat('pt-BR');

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

/** Bloco com entrada em cascata (só no primeiro mount da página). */
function Surgir({ i, children, className = '' }: { i: number; children: ReactNode; className?: string }) {
  return (
    <div className={`surgir ${className}`} style={{ '--i': i } as CSSProperties}>
      {children}
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section aria-label={titulo} className="flex flex-col gap-3">
      <h2 className="mt-1.5 text-[13px] font-semibold tracking-[0.14em] text-texto-2 uppercase">{titulo}</h2>
      {children}
    </section>
  );
}

function eyebrow(progresso: MeuProgresso, desafio: DesafioAtual | undefined): string {
  if (progresso.status === 'NAO_INICIADO') {
    const n = Math.max(0, desafio?.diasParaInicio ?? 0);
    const quando = n <= 1 ? 'começa amanhã' : `começa em ${n} dias`;
    return desafio ? `Desafio ${quando} · ${formatarDataCurta(desafio.dataInicio)}` : 'Desafio ainda não começou';
  }
  if (progresso.status === 'ENCERRADO') return 'Desafio encerrado';
  const hoje = progresso.dias.find((d) => d.numeroDia === progresso.diaAtual);
  const data = hoje ? ` · ${formatarDiaCurto(hoje.data)}` : '';
  return `Dia ${progresso.diaAtual ?? 1} de ${progresso.totalDias}${data}`;
}

/** Antes do início: contagem regressiva no lugar do "Seu dia" (conteúdo da antiga TelaAntesInicio). */
function CardContagem({ desafio }: { desafio: DesafioAtual | undefined }) {
  const dias = Math.max(0, desafio?.diasParaInicio ?? 0);
  return (
    <div className="grid gap-2 rounded-[28px] bg-superficie p-[18px] shadow-[inset_0_0_0_1px_var(--borda)]">
      <span className="flex items-center gap-2">
        <CalendarClock className="size-4 text-texto-2" aria-hidden />
        <span className="rotulo">Começa em {dias === 1 ? '1 dia' : `${dias} dias`}</span>
      </span>
      <p className="font-display text-[52px] leading-[0.9] font-extrabold tabular-nums">
        {desafio ? formatarDataCurta(desafio.dataInicio) : '—'}
      </p>
      <p className="text-sm text-texto-2">
        Você já está inscrito. No primeiro dia, este card vira o seu check-in: água, treino, leitura, 3 fotos de prova
        e o story.
      </p>
    </div>
  );
}

/** Depois do fim: resumo final (conteúdo da antiga TelaEncerrado). */
function CardResumoFinal({ progresso, posicao }: { progresso: MeuProgresso; posicao: number | null }) {
  const altitude = altitudeSimbolica(progresso.diasConcluidos, progresso.totalDias);
  return (
    <dl className="grid grid-cols-3 gap-3 rounded-[28px] bg-superficie p-[18px] shadow-[inset_0_0_0_1px_var(--borda)]">
      <div className="flex flex-col gap-1">
        <dt className="rotulo">Dias</dt>
        <dd className="font-display text-[30px] leading-none font-extrabold tabular-nums">
          {progresso.diasConcluidos}/{progresso.totalDias}
        </dd>
      </div>
      <div className="flex flex-col gap-1">
        <dt className="rotulo">Altitude</dt>
        <dd className="font-display text-[30px] leading-none font-extrabold tabular-nums">{FORMATO.format(altitude)} m</dd>
      </div>
      <div className="flex flex-col gap-1">
        <dt className="rotulo">Posição</dt>
        <dd className="font-display text-[30px] leading-none font-extrabold tabular-nums">{posicao ? `${posicao}º` : '—'}</dd>
      </div>
    </dl>
  );
}

/** Home do inscrito (docs/FRONTEND.md §9.4). */
export default function Desafio() {
  const navegar = useNavigate();
  const { data: me } = useMe();
  const slug = me?.participacao?.desafioSlug;
  const progressoQ = useMeuProgresso(slug);
  const desafioQ = useDesafioAtual();
  const feedQ = useFeed(slug);
  const status = progressoQ.data?.status;
  const diaAtual = status === 'EM_ANDAMENTO' ? (progressoQ.data?.diaAtual ?? null) : null;
  const diaQ = useDia(slug, diaAtual);
  const rankingQ = useRanking(status === 'ENCERRADO' ? slug : undefined);

  if (!me || !slug) return null;

  if (progressoQ.isPending) {
    return (
      <div role="status" aria-label="Carregando o desafio" className="flex flex-col gap-4">
        <h1 className="sr-only">Desafio</h1>
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-[118px] rounded-[30px]" />
        <Skeleton className="h-[196px] rounded-[30px]" />
        <Skeleton className="h-36 rounded-[28px]" />
      </div>
    );
  }

  if (progressoQ.isError) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-[38px] leading-[0.9] font-black uppercase">Desafio</h1>
        <Alerta
          tipo="erro"
          acao={
            <Botao variante="secundario" tamanho="sm" onClick={() => void progressoQ.refetch()}>
              Tentar de novo
            </Botao>
          }
        >
          Não foi possível carregar o seu progresso.
        </Alerta>
      </div>
    );
  }

  const progresso = progressoQ.data;
  const desafio = desafioQ.data;
  const dia = diaQ.data;
  const emAndamento = progresso.status === 'EM_ANDAMENTO';
  const encerrado = progresso.status === 'ENCERRADO';
  const comCta = (emAndamento && diaAtual !== null) || encerrado;

  const abrirDia = (el: HTMLElement) => {
    if (diaAtual === null) return;
    abrirComTransformacao(el, 'abrir-dia', () =>
      void navegar(caminhoDoDia(diaAtual), { viewTransition: true, state: { vt: 'abrir-dia' } }),
    );
  };

  return (
    <div className={`flex flex-col gap-4 ${comCta ? 'pb-20' : ''}`}>
      <Surgir i={0}>
        <header className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="rotulo">{eyebrow(progresso, desafio)}</p>
            <h1 className="mt-1 font-display text-[38px] leading-[0.9] font-black uppercase">
              Bora, {primeiroNome(me.usuario.nome)}.
            </h1>
          </div>
          <Link
            to="/perfil"
            viewTransition
            onClick={() => marcarDirecao('aba')}
            className="press shrink-0 rounded-full"
          >
            <span className="sr-only">Abrir perfil</span>
            <Avatar nome={me.usuario.nome} fotoUrl={me.usuario.fotoUrl} />
          </Link>
        </header>
      </Surgir>

      <Surgir i={1}>
        <FaixaDias progresso={progresso} diasParaInicio={desafio?.diasParaInicio ?? 0} />
      </Surgir>

      <Surgir i={2}>
        <CarrosselDestaque>
          <CardEscalada key="escalada" diasConcluidos={progresso.diasConcluidos} totalDias={progresso.totalDias} />
          {emAndamento && dia && desafio ? (
            <CardStoryDoDia
              key="story"
              slug={slug}
              dia={dia}
              instagramHandle={desafio.instagramHandle}
              hashtag={desafio.hashtag}
            />
          ) : null}
        </CarrosselDestaque>
      </Surgir>

      <Surgir i={3}>
        <Secao titulo={encerrado ? 'Seu resultado' : 'Seu dia'}>
          {progresso.status === 'NAO_INICIADO' ? (
            <CardContagem desafio={desafio} />
          ) : encerrado ? (
            <CardResumoFinal progresso={progresso} posicao={rankingQ.data?.minhaPosicao ?? null} />
          ) : dia ? (
            <CardSeuDia dia={dia} />
          ) : diaQ.isError ? (
            <Alerta
              tipo="erro"
              acao={
                <Botao variante="secundario" tamanho="sm" onClick={() => void diaQ.refetch()}>
                  Tentar de novo
                </Botao>
              }
            >
              Não foi possível carregar o dia de hoje.
            </Alerta>
          ) : (
            <Skeleton className="h-36 rounded-[28px]" />
          )}
        </Secao>
      </Surgir>

      <Surgir i={4}>
        <Secao titulo="Atividade">
          {feedQ.data ? (
            <CardsAtividade feed={feedQ.data} />
          ) : feedQ.isError ? (
            <p className="text-sm text-texto-2">A atividade do grupo não carregou agora.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-44 rounded-[28px]" />
              <Skeleton className="h-44 rounded-[28px]" />
            </div>
          )}
        </Secao>
      </Surgir>

      <Surgir i={5} className="flex justify-center">
        <Link
          to="/regras"
          viewTransition
          onClick={() => marcarDirecao('avancar')}
          className="inline-flex min-h-11 items-center gap-2 px-1 text-sm font-semibold underline decoration-vermelho underline-offset-4"
        >
          <BookOpen className="size-4" aria-hidden />
          Regras do desafio
        </Link>
      </Surgir>

      {emAndamento && diaAtual !== null && (
        <CtaFixo
          rotulo={dia?.concluido ? 'Ver check-in de hoje' : 'Fazer check-in de hoje'}
          aoPressionar={preCarregarDia}
          aoClicar={abrirDia}
        />
      )}
      {encerrado && (
        <CtaFixo
          rotulo="Ver ranking final"
          aoClicar={() => {
            marcarDirecao('avancar');
            void navegar('/ranking', { viewTransition: true });
          }}
        />
      )}
    </div>
  );
}
