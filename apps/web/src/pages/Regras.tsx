import { TOTAL_DIAS_PADRAO } from '@everest/shared';
import type { CSSProperties, ReactNode } from 'react';
import { BotaoVoltar } from '../components/layout/BotaoVoltar';
import { Skeleton } from '../components/ui/basicos';
import { regrasVagasEPremio, textosRegras } from '../content/regras';
import { BotaoQueroParticipar } from '../features/desafio/EntrarNoDesafio';
import { ListaRegras, RegrasDoDia } from '../features/desafio/ListaRegras';
import { VideoDesafio } from '../features/desafio/VideoDesafio';
import { formatarData } from '../lib/datas';
import { useDesafioAtual, useMe } from '../lib/queries';

function Secao({ titulo, i, children }: { titulo: string; i: number; children: ReactNode }) {
  return (
    <section aria-label={titulo} className="surgir flex flex-col gap-3" style={{ '--i': i } as CSSProperties}>
      <h2 className="mt-1.5 text-[13px] font-semibold tracking-[0.14em] text-texto-2 uppercase">{titulo}</h2>
      {children}
    </section>
  );
}

/** /regras: o vídeo do TT, as regras completas e, no fim, o mesmo "Quero participar" da landing. */
export default function Regras() {
  const desafioQ = useDesafioAtual();
  const { data: me } = useMe();
  const desafio = desafioQ.data;
  const totalDias = desafio?.totalDias ?? TOTAL_DIAS_PADRAO;

  return (
    <article className="flex flex-col gap-4">
      <header className="surgir flex items-center gap-3">
        <BotaoVoltar para={me?.participacao ? '/desafio' : '/'} />
        <div className="min-w-0 flex-1">
          <p className="rotulo">{desafio?.nome ?? textosRegras.eyebrow}</p>
          <h1 className="font-display text-[38px] leading-[0.9] font-black uppercase">{textosRegras.titulo}</h1>
        </div>
      </header>

      <Secao titulo="O desafio em vídeo" i={1}>
        <VideoDesafio />
      </Secao>

      <Secao titulo="Todos os dias" i={2}>
        <RegrasDoDia desafio={desafio} />
        <p className="text-[13px] text-texto-2">{textosRegras.notaDiaria}</p>
      </Secao>

      <Secao titulo="Vagas e prêmio" i={3}>
        <ListaRegras regras={regrasVagasEPremio(desafio?.totalVagas ?? null, totalDias, desafio?.inscricao?.valorCentavos ?? null)} />
      </Secao>

      <Secao titulo="Datas" i={4}>
        {desafioQ.isPending ? (
          <Skeleton className="h-16 rounded-3xl" />
        ) : desafio ? (
          <p className="rounded-3xl bg-superficie px-4 py-3.5 text-sm shadow-[inset_0_0_0_1px_var(--borda)]">
            De <b>{formatarData(desafio.dataInicio, { comDiaSemana: true })}</b> a{' '}
            <b>{formatarData(desafio.dataFim, { comDiaSemana: true })}</b>: {totalDias} dias seguidos, no horário de
            Brasília.
          </p>
        ) : (
          <p className="text-sm text-texto-2">As datas serão divulgadas na abertura do próximo desafio.</p>
        )}
      </Secao>

      <p className="text-xs text-texto-2">{textosRegras.rodape}</p>

      {/* Fim da página: o mesmo CTA da landing (ou o próximo passo de quem já tem vaga). */}
      <BotaoQueroParticipar />
    </article>
  );
}
