import type { MeuProgresso } from '@everest/shared';
import { Trophy } from 'lucide-react';
import { Link } from 'react-router';
import { GridDias } from '../../components/GridDias';
import { Card, Rotulo } from '../../components/ui/basicos';
import { Barra } from '../../components/ui/Barra';

function Numero({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <p className="rotulo">{rotulo}</p>
      <p className="text-3xl font-bold tabular-nums">{valor}</p>
    </Card>
  );
}

/** Depois do fim: resumo final + grid somente leitura. */
export function TelaEncerrado({ progresso }: { progresso: MeuProgresso }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Rotulo>Fim da jornada</Rotulo>
        <h1 className="flex items-center gap-2 text-3xl font-bold leading-tight">
          <Trophy className="size-7 text-vermelho" aria-hidden />
          Desafio encerrado
        </h1>
        <p className="text-texto-2">Obrigado por subir até aqui. Veja como foram os seus {progresso.totalDias} dias.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Numero rotulo="Dias concluídos" valor={`${progresso.diasConcluidos}/${progresso.totalDias}`} />
        <Numero rotulo="Melhor sequência" valor={`${progresso.melhorSequencia} ${progresso.melhorSequencia === 1 ? 'dia' : 'dias'}`} />
      </div>

      <Card className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <p className="rotulo">Evolução</p>
          <p className="text-2xl font-bold tabular-nums">{progresso.evolucao}%</p>
        </div>
        <Barra valor={progresso.evolucao} maximo={100} rotulo={`Evolução: ${progresso.evolucao}%`} />
      </Card>

      <section aria-label="Os 30 dias" className="flex flex-col gap-2">
        <Rotulo>Seus {progresso.totalDias} dias</Rotulo>
        <GridDias dias={progresso.dias} rotulo="Resultado de cada dia do desafio" />
      </section>

      <Link
        to="/ranking"
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-vermelho px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-sobre-vermelho hover:bg-vermelho-escuro"
      >
        Ver o ranking final
      </Link>
    </div>
  );
}
