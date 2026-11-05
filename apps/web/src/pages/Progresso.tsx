import { ALTITUDE_CUME, METROS_POR_DIA, altitudeSimbolica } from '@everest/shared';
import { ChevronRight, Flame } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { GridDias, LegendaDias } from '../components/GridDias';
import { Alerta, Skeleton } from '../components/ui/basicos';
import { Botao } from '../components/ui/Botao';
import { Contador } from '../components/ui/Contador';
import { caminhoDoDia } from '../features/desafio/navegacao';
import { Montanha } from '../features/progresso/Montanha';
import { caminhoDaAba } from '../features/ranking/abas';
import { useMe, useMeuProgresso } from '../lib/queries';
import { marcarDirecao } from '../lib/transicoes';

const FORMATO = new Intl.NumberFormat('pt-BR');

function Tile({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 rounded-[22px] bg-superficie px-4 py-3.5 shadow-[inset_0_0_0_1px_var(--borda)]">
      <span className="rotulo">{rotulo}</span>
      <span className="flex items-baseline gap-1 font-display text-[40px] leading-[0.9] font-extrabold tabular-nums">
        {children}
      </span>
    </div>
  );
}

function Unidade({ children }: { children: ReactNode }) {
  return <small className="font-display text-xl text-texto-2">{children}</small>;
}

export default function Progresso() {
  const { data: me } = useMe();
  const slug = me?.participacao?.desafioSlug;
  const progressoQ = useMeuProgresso(slug);
  const navegar = useNavigate();

  if (progressoQ.isPending) {
    return (
      <div role="status" aria-label="Carregando seu progresso" className="flex flex-col gap-4">
        <h1 className="sr-only">Progresso</h1>
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-72 rounded-[28px]" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-[22px]" />
          ))}
        </div>
      </div>
    );
  }
  if (progressoQ.isError) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-[38px] leading-[0.9] font-black uppercase">Progresso</h1>
        <Alerta
          tipo="erro"
          acao={
            <Botao variante="secundario" tamanho="sm" onClick={() => void progressoQ.refetch()}>
              Tentar de novo
            </Botao>
          }
        >
          {progressoQ.error.message}
        </Alerta>
      </div>
    );
  }

  const p = progressoQ.data;
  const altitude = altitudeSimbolica(p.diasConcluidos, p.totalDias);
  const eyebrow =
    p.status === 'EM_ANDAMENTO'
      ? `Dia ${p.diaAtual ?? 1} de ${p.totalDias}`
      : p.status === 'ENCERRADO'
        ? 'Desafio encerrado'
        : 'O desafio ainda não começou';

  return (
    <div className="flex flex-col gap-4">
      <header className="surgir grid gap-1.5">
        <p className="rotulo">{eyebrow}</p>
        <h1 className="font-display text-[38px] leading-[0.9] font-black uppercase">Progresso</h1>
      </header>

      <section
        aria-label="Escalada simbólica"
        className="surgir grid gap-2 rounded-[28px] bg-superficie px-[18px] pt-[18px] pb-3.5 shadow-[inset_0_0_0_1px_var(--borda)]"
        style={{ '--i': 1 } as CSSProperties}
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="flex items-baseline gap-1">
            <Contador valor={altitude} className="font-display text-[64px] leading-[0.9] font-extrabold" />
            <span className="font-display text-[26px] font-extrabold">m</span>
          </p>
          <p className="text-[13px] text-texto-2">cume a {FORMATO.format(ALTITUDE_CUME)} m</p>
        </div>
        <Montanha diasConcluidos={p.diasConcluidos} totalDias={p.totalDias} altitude={altitude} />
        <p className="text-[13px] text-texto-2">
          Cada dia concluído sobe {METROS_POR_DIA(p.totalDias)} m. Dia perdido não desce, só não sobe.
        </p>
        <Link
          to={caminhoDaAba('montanha')}
          viewTransition
          onClick={() => marcarDirecao('aba')}
          className="press -mx-1 flex min-h-11 items-center justify-between gap-2 rounded-2xl bg-superficie-2 px-3.5 text-sm font-semibold"
        >
          Ver a turma na montanha
          <ChevronRight className="size-4 text-texto-2" aria-hidden />
        </Link>
      </section>

      <div className="surgir grid grid-cols-2 gap-3" style={{ '--i': 2 } as CSSProperties}>
        <Tile rotulo="Dias concluídos">
          <Contador valor={p.diasConcluidos} />
          <Unidade>/{p.totalDias}</Unidade>
        </Tile>
        <Tile rotulo="Evolução">
          <Contador valor={p.evolucao} />
          <Unidade>%</Unidade>
        </Tile>
        <Tile rotulo="Melhor sequência">
          <Contador valor={p.melhorSequencia} />
          <Unidade>{p.melhorSequencia === 1 ? 'dia' : 'dias'}</Unidade>
        </Tile>
        <Tile rotulo="Sequência atual">
          <Contador valor={p.sequenciaAtual} />
          <Flame className="size-6 self-center text-vermelho-texto" aria-hidden />
        </Tile>
      </div>

      <section
        aria-labelledby="titulo-30-dias"
        className="surgir grid gap-3 rounded-3xl bg-superficie p-[18px] shadow-[inset_0_0_0_1px_var(--borda)]"
        style={{ '--i': 3 } as CSSProperties}
      >
        <h2 id="titulo-30-dias" className="text-[17px] font-bold">
          Os {p.totalDias} dias
        </h2>
        <GridDias
          dias={p.dias}
          rotulo="Seus dias no desafio: toque em um dia para ver o check-in"
          aoSelecionar={(n) => {
            marcarDirecao('avancar');
            void navegar(caminhoDoDia(n), { viewTransition: true });
          }}
        />
        <LegendaDias />
      </section>
    </div>
  );
}
