import type { DesafioAtual, MeResposta } from '@everest/shared';
import { ArrowRight, BookOpen, CalendarDays, Flag, LogOut, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Watermark } from '../components/layout/Watermark';
import { Botao } from '../components/ui/Botao';
import { Alerta, BarraProgresso, Card, Skeleton } from '../components/ui/basicos';
import { useLogout } from '../features/auth/useLogout';
import { useInscrever } from '../features/desafio/useInscrever';
import { BotaoBaixarApp } from '../features/pwa/BotaoBaixarApp';
import { ehApiError } from '../lib/api';
import { formatarData } from '../lib/datas';
import { useDesafioAtual, useMe } from '../lib/queries';

const CLASSE_LINK_PRIMARIO =
  'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-vermelho px-4 py-3 text-base font-black uppercase tracking-wide text-sobre-vermelho hover:bg-vermelho-escuro';

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

function textoStatus(d: DesafioAtual): string {
  if (d.status === 'ENCERRADO') return 'Desafio encerrado';
  if (d.status === 'EM_ANDAMENTO') return `Em andamento · dia ${d.diaAtual ?? 1} de ${d.totalDias}`;
  if (d.diasParaInicio <= 1) return 'Começa amanhã';
  return `Começa em ${d.diasParaInicio} dias`;
}

function BarraTopo({ me, mePendente }: { me: MeResposta | null; mePendente: boolean }) {
  const logout = useLogout();
  return (
    <header className="pt-safe">
      <div className="mx-auto flex min-h-14 max-w-md items-center justify-between gap-3 px-5">
        <span className="rotulo">Everest · 30 dias</span>
        {me ? (
          <div className="flex min-w-0 items-center gap-1">
            <span className="truncate text-sm text-texto-2">
              Olá, <strong className="font-bold text-texto">{primeiroNome(me.usuario.nome)}</strong>
            </span>
            {me.usuario.papel === 'ADMIN' && (
              <Link
                to="/admin"
                aria-label="Painel do embaixador"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-texto-2 hover:text-texto"
              >
                <Shield className="size-5" aria-hidden />
              </Link>
            )}
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-texto-2 hover:text-texto"
            >
              <LogOut className="size-4" aria-hidden />
              Sair
            </button>
          </div>
        ) : (
          !mePendente && (
            <Link
              to="/login"
              className="flex min-h-11 items-center rounded-xl px-2 text-sm font-semibold text-texto-2 hover:text-texto"
            >
              Já tenho conta —&nbsp;<span className="font-bold text-texto underline underline-offset-4">Entrar</span>
            </Link>
          )
        )}
      </div>
    </header>
  );
}

function PainelVagas({ desafio }: { desafio: DesafioAtual }) {
  const preenchidas = Math.max(0, desafio.totalVagas - desafio.vagasDisponiveis);
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="titulo-vagas" className="rotulo">
          Vagas
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-borda px-2.5 py-1 text-xs font-semibold text-texto">
          {desafio.status === 'EM_ANDAMENTO' && <span className="size-2 rounded-full bg-vermelho-texto" aria-hidden />}
          {textoStatus(desafio)}
        </span>
      </div>
      <p aria-live="polite" aria-atomic="true" className="text-lg font-semibold leading-snug">
        <span className="text-5xl font-black tabular-nums text-texto">{desafio.vagasDisponiveis}</span>{' '}
        <span className="font-bold">de {desafio.totalVagas} vagas disponíveis</span>
      </p>
      <div className="flex flex-col gap-1.5">
        <BarraProgresso valor={preenchidas} maximo={desafio.totalVagas} rotulo="Vagas preenchidas" />
        <p className="text-xs text-texto-2">
          {preenchidas} de {desafio.totalVagas} vagas preenchidas
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-3 border-t border-borda pt-4 text-sm">
        <div className="flex flex-col gap-1">
          <dt className="rotulo flex items-center gap-1.5">
            <CalendarDays className="size-3.5" aria-hidden />
            Início
          </dt>
          <dd className="font-bold">{formatarData(desafio.dataInicio)}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="rotulo flex items-center gap-1.5">
            <Flag className="size-3.5" aria-hidden />
            Fim
          </dt>
          <dd className="font-bold">{formatarData(desafio.dataFim)}</dd>
        </div>
      </dl>
    </Card>
  );
}

function AcaoPrincipal({
  desafio,
  me,
  aoEntrar,
  inscrevendo,
}: {
  desafio: DesafioAtual;
  me: MeResposta | null;
  aoEntrar: () => void;
  inscrevendo: boolean;
}) {
  if (me?.participacao) {
    return (
      <Link to="/hoje" className={CLASSE_LINK_PRIMARIO}>
        Ir para o desafio
        <ArrowRight className="size-5" aria-hidden />
      </Link>
    );
  }
  let bloqueio: string | null = null;
  if (desafio.status === 'ENCERRADO') bloqueio = 'Desafio encerrado';
  else if (!desafio.inscricoesAbertas) bloqueio = 'Inscrições encerradas';
  else if (desafio.vagasDisponiveis <= 0) bloqueio = 'Vagas esgotadas';

  if (bloqueio) {
    return (
      <Botao larguraTotal disabled className="min-h-12 text-base">
        {bloqueio}
      </Botao>
    );
  }
  return (
    <Botao
      larguraTotal
      onClick={aoEntrar}
      carregando={inscrevendo}
      className="min-h-12 text-base font-black"
      icone={<ArrowRight className="size-5" aria-hidden />}
    >
      {inscrevendo ? 'Garantindo sua vaga…' : 'Entrar no desafio'}
    </Botao>
  );
}

export default function Entrada() {
  const desafioQ = useDesafioAtual({ atualizarACada: 30_000 });
  const meQ = useMe();
  const inscrever = useInscrever();
  const navegar = useNavigate();

  const me = meQ.data ?? null;
  // Erro de rede no /auth/me: segue como visitante (a landing não pode travar).
  const mePendente = meQ.isPending && !meQ.isError;
  const semDesafio = ehApiError(desafioQ.error, 'NAO_ENCONTRADO');

  function entrar(slug: string) {
    if (!me) {
      void navegar('/cadastro?acao=inscrever');
      return;
    }
    inscrever.mutate(slug, { onSuccess: () => void navegar('/hoje') });
  }

  return (
    <div className="relative flex min-h-dvh flex-col">
      <Watermark />
      <BarraTopo me={me} mePendente={mePendente} />

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-5 pt-4 pb-10">
        <section className="flex flex-col items-center text-center">
          <img
            src="/logo.webp"
            alt="Everest"
            width={112}
            height={112}
            className="size-28 object-contain drop-shadow-[0_0_24px_rgba(220,38,38,0.25)]"
          />
          <p className="rotulo mt-6">Desafio 30 dias</p>
          <h1 className="mt-2 text-[2.6rem] font-black uppercase leading-[0.95] tracking-tight">
            A sua <span className="text-vermelho">melhor</span> versão
          </h1>
          <p className="mt-4 max-w-xs text-base text-texto-2">Construindo a sua melhor versão para 2027</p>
        </section>

        <section aria-labelledby="titulo-vagas" className="flex flex-col gap-4">
          {desafioQ.isPending ? (
            <div role="status" aria-label="Carregando as vagas" className="flex flex-col gap-4">
              <h2 id="titulo-vagas" className="sr-only">
                Vagas
              </h2>
              <Skeleton className="h-60 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : semDesafio ? (
            <Card className="flex flex-col gap-2 p-5 text-center">
              <h2 id="titulo-vagas" className="text-xl font-bold">
                Nenhum desafio aberto agora
              </h2>
              <p className="text-texto-2">
                O próximo desafio ainda não foi aberto. Fique de olho no Instagram do Everest para não perder as
                inscrições.
              </p>
            </Card>
          ) : desafioQ.isError ? (
            <>
              <h2 id="titulo-vagas" className="sr-only">
                Vagas
              </h2>
              <Alerta
                tipo="erro"
                acao={
                  <Botao variante="fantasma" className="-my-2" onClick={() => void desafioQ.refetch()}>
                    Tentar de novo
                  </Botao>
                }
              >
                Não foi possível carregar o desafio. Verifique a conexão.
              </Alerta>
            </>
          ) : (
            <>
              <PainelVagas desafio={desafioQ.data} />
              {mePendente ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <AcaoPrincipal
                  desafio={desafioQ.data}
                  me={me}
                  inscrevendo={inscrever.isPending}
                  aoEntrar={() => entrar(desafioQ.data.slug)}
                />
              )}
              {inscrever.isError && (
                <Alerta tipo="erro">
                  {ehApiError(inscrever.error) ? inscrever.error.message : 'Não foi possível fazer a inscrição.'}
                </Alerta>
              )}
            </>
          )}
        </section>

        <div className="flex flex-col gap-3">
          <BotaoBaixarApp className="w-full" />
          <Link
            to="/regras"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold uppercase tracking-wide text-texto hover:bg-superficie-2"
          >
            <BookOpen className="size-4" aria-hidden />
            Ver as regras do desafio
          </Link>
        </div>

        <footer className="mt-auto flex justify-center pb-safe">
          <Link
            to="/privacidade"
            className="inline-flex min-h-11 items-center px-2 text-xs text-texto-2 underline-offset-4 hover:text-texto hover:underline"
          >
            Política de privacidade
          </Link>
        </footer>
      </main>
    </div>
  );
}
