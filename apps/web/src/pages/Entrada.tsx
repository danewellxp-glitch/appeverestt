import type { DesafioAtual, MeResposta } from '@everest/shared';
import { ArrowRight, BookOpen } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router';
import { LinkNav } from '../components/layout/LinkNav';
import { Watermark } from '../components/layout/Watermark';
import { Alerta, Skeleton } from '../components/ui/basicos';
import { Barra } from '../components/ui/Barra';
import { Botao } from '../components/ui/Botao';
import { Contador } from '../components/ui/Contador';
import { useInscrever } from '../features/desafio/useInscrever';
import { BotaoBaixarApp } from '../features/pwa/BotaoBaixarApp';
import { ehApiError } from '../lib/api';
import { formatarDataCurta } from '../lib/datas';
import { preCarregarAuth } from '../lib/firebase';
import { useDesafioAtual, useMe } from '../lib/queries';

const CLASSE_CTA =
  'press inline-flex h-[54px] w-full items-center justify-center gap-2.5 rounded-full bg-vermelho px-5 font-semibold text-sobre-vermelho hover:bg-vermelho-escuro';

/** Montanha da capa: três serras, pico com neve, trilha tracejada vermelha e bandeira. */
function MontanhaCapa() {
  return (
    <svg viewBox="0 0 390 150" preserveAspectRatio="xMidYMax slice" aria-hidden className="block size-full">
      <path className="fill-superficie-2" d="M0 150 L0 96 L52 70 L98 92 L150 48 L196 80 L240 54 L292 86 L340 60 L390 84 L390 150Z" />
      <path className="fill-borda" d="M0 150 L0 118 L60 92 L104 112 L160 76 L206 104 L262 86 L320 108 L390 98 L390 150Z" />
      <path className="fill-texto" d="M70 150 L168 40 L196 62 L214 30 L250 72 L312 150Z" />
      <path className="fill-fundo" d="M214 30 L226 46 L218 44 L212 52 L204 44 L200 50 L196 62 L204 46Z" />
      <path
        className="stroke-vermelho"
        d="M110 150 C 150 128 170 120 182 98 S 196 74 206 58 S 210 40 214 31"
        fill="none"
        strokeWidth={2}
        strokeDasharray="3 5"
        strokeLinecap="round"
      />
      <line className="stroke-texto" x1="214" y1="31" x2="214" y2="12" strokeWidth={1.5} />
      <path className="fill-vermelho" d="M214 12 L230 16.5 L214 21Z" />
    </svg>
  );
}

function Topo({ me, mePendente }: { me: MeResposta | null; mePendente: boolean }) {
  const classeLink =
    'inline-flex min-h-11 items-center px-1 text-sm font-semibold underline decoration-vermelho underline-offset-4';
  return (
    <header className="surgir flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 font-display text-xl font-black tracking-[0.12em]">
        <img src="/logo.webp" alt="" width={28} height={28} className="size-7 object-contain" />
        EVEREST
      </span>
      {mePendente ? null : me?.participacao ? (
        <LinkNav to="/desafio" className={classeLink}>
          Ir para o desafio
        </LinkNav>
      ) : me ? (
        <LinkNav to="/perfil" className={classeLink}>
          Minha conta
        </LinkNav>
      ) : (
        <LinkNav to="/entrar" onPointerDown={preCarregarAuth} onFocus={preCarregarAuth} className={classeLink}>
          Entrar
        </LinkNav>
      )}
    </header>
  );
}

function CardVagas({ desafio }: { desafio: DesafioAtual }) {
  const preenchidas = Math.max(0, desafio.totalVagas - desafio.vagasDisponiveis);
  const esgotado = desafio.vagasDisponiveis <= 0;
  return (
    <section
      aria-label="Vagas"
      className="grid gap-2.5 rounded-3xl bg-superficie p-[18px] shadow-[inset_0_0_0_1px_var(--borda)]"
    >
      <p className="flex items-baseline justify-between gap-3" aria-live="polite">
        <Contador valor={desafio.vagasDisponiveis} className="font-display text-[52px] leading-[0.9] font-extrabold" />
        <span className="text-[13px] text-texto-2">{esgotado ? 'vagas: esgotado' : 'vagas restantes'}</span>
      </p>
      <Barra valor={preenchidas} maximo={desafio.totalVagas} rotulo="Vagas preenchidas" />
      <p className="text-[13px] text-texto-2">
        {preenchidas} de {desafio.totalVagas} vagas preenchidas
        {esgotado ? '. Fique de olho no próximo desafio.' : ''}
      </p>
    </section>
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
      <LinkNav to="/desafio" className={CLASSE_CTA}>
        Ir para o desafio
        <ArrowRight className="size-5" aria-hidden />
      </LinkNav>
    );
  }
  let bloqueio: string | null = null;
  if (desafio.status === 'ENCERRADO') bloqueio = 'Desafio encerrado';
  else if (!desafio.inscricoesAbertas) bloqueio = 'Inscrições encerradas';
  else if (desafio.vagasDisponiveis <= 0) bloqueio = 'Vagas esgotadas';
  if (bloqueio) {
    return (
      <Botao larguraTotal disabled>
        {bloqueio}
      </Botao>
    );
  }
  return (
    <Botao
      larguraTotal
      onClick={aoEntrar}
      onPointerDown={me ? undefined : preCarregarAuth}
      onFocus={me ? undefined : preCarregarAuth}
      carregando={inscrevendo}
      icone={<ArrowRight className="size-5" aria-hidden />}
    >
      Entrar no desafio
    </Botao>
  );
}

/** "/" (docs/FRONTEND.md §9.1): capa, vagas e entrada no desafio. Sem Firebase no bundle desta rota. */
export default function Entrada() {
  const desafioQ = useDesafioAtual({ atualizarACada: 30_000 });
  const meQ = useMe();
  const inscrever = useInscrever();
  const navegar = useNavigate();

  const me = meQ.data ?? null;
  // Erro de rede no /auth/me: segue como visitante (a capa não pode travar).
  const mePendente = meQ.isPending && !meQ.isError;
  const semDesafio = ehApiError(desafioQ.error, 'NAO_ENCONTRADO');
  const desafio = desafioQ.data;

  function entrar(slug: string) {
    if (!me) {
      void navegar('/criar-conta?acao=inscrever', { viewTransition: true });
      return;
    }
    // A inscrição exige o cadastro completo (X11): a /bem-vindo cuida disso e da vaga.
    if (!me.usuario.perfilCompleto) {
      void navegar('/bem-vindo?acao=inscrever', { viewTransition: true });
      return;
    }
    inscrever.mutate(slug, { onSuccess: () => void navegar('/bem-vindo?etapa=vaga', { viewTransition: true }) });
  }

  return (
    <div className="relative min-h-dvh">
      <Watermark />
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <Topo me={me} mePendente={mePendente} />

        <div className="surgir -mx-5 -mt-1 h-[150px]" style={{ '--i': 1 } as CSSProperties}>
          <MontanhaCapa />
        </div>

        <div className="surgir grid gap-3" style={{ '--i': 2 } as CSSProperties}>
          <p className="rotulo">
            Desafio 30 dias{desafio ? ` · início ${formatarDataCurta(desafio.dataInicio)}` : ''}
          </p>
          <h1 className="font-display text-[min(76px,18vw)] leading-[0.88] font-black uppercase">
            A sua
            <br />
            melhor
            <br />
            <span className="text-vermelho">versão</span>
          </h1>
          <p className="max-w-[34ch] text-[15px] text-texto-2">
            Construindo a sua melhor versão para 2027. Água, treino, leitura, prova do dia e story, todos os dias, por
            30 dias.
          </p>
        </div>

        <div className="surgir grid gap-3" style={{ '--i': 3 } as CSSProperties}>
          {desafioQ.isPending ? (
            <div role="status" aria-label="Carregando as vagas" className="grid gap-3">
              <Skeleton className="h-36 rounded-3xl" />
              <Skeleton className="h-[54px] rounded-full" />
            </div>
          ) : semDesafio ? (
            <section className="grid gap-2 rounded-3xl bg-superficie p-5 text-center shadow-[inset_0_0_0_1px_var(--borda)]">
              <h2 className="text-lg font-bold">Nenhum desafio aberto agora</h2>
              <p className="text-sm text-texto-2">
                O próximo desafio ainda não foi aberto. Fique de olho no Instagram do Everest para não perder as
                inscrições.
              </p>
            </section>
          ) : desafioQ.isError || !desafio ? (
            <Alerta
              tipo="erro"
              acao={
                <Botao variante="secundario" tamanho="sm" onClick={() => void desafioQ.refetch()}>
                  Tentar de novo
                </Botao>
              }
            >
              Não foi possível carregar o desafio. Verifique a conexão.
            </Alerta>
          ) : (
            <>
              <CardVagas desafio={desafio} />
              {mePendente ? (
                <Skeleton className="h-[54px] rounded-full" />
              ) : (
                <AcaoPrincipal
                  desafio={desafio}
                  me={me}
                  inscrevendo={inscrever.isPending}
                  aoEntrar={() => entrar(desafio.slug)}
                />
              )}
              {inscrever.isError && (
                <Alerta tipo="erro">
                  {ehApiError(inscrever.error) ? inscrever.error.message : 'Não foi possível fazer a inscrição.'}
                </Alerta>
              )}
            </>
          )}
          <BotaoBaixarApp />
          <LinkNav
            to="/regras"
            className="mx-auto inline-flex min-h-11 items-center gap-2 px-1 text-sm font-semibold underline decoration-vermelho underline-offset-4"
          >
            <BookOpen className="size-4" aria-hidden />
            Ver as regras
          </LinkNav>
        </div>

        <footer className="mt-auto flex justify-center">
          <LinkNav
            to="/privacidade"
            className="inline-flex min-h-11 items-center px-2 text-xs text-texto-2 underline-offset-4 hover:text-texto hover:underline"
          >
            Política de privacidade
          </LinkNav>
        </footer>
      </main>
    </div>
  );
}
