import type { MeuProgresso } from '@everest/shared';
import { AlertTriangle, Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { BarraProgresso, Card } from '../../components/ui/basicos';

function Cartao({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-1">
      <dt className="rotulo">{rotulo}</dt>
      {children}
    </Card>
  );
}

/**
 * Cards de resumo: dias concluídos (X/30), evolução %, melhor sequência e sequência atual.
 * Usado no /progresso e na tela do participante no admin.
 */
export function CartoesProgresso({ progresso }: { progresso: MeuProgresso }) {
  const { diasConcluidos, totalDias, evolucao, melhorSequencia, sequenciaAtual } = progresso;
  return (
    <dl className="grid grid-cols-2 gap-3">
      <Cartao rotulo="Dias concluídos">
        <dd className="text-3xl font-bold">
          {diasConcluidos}
          <span className="text-lg text-texto-2">/{totalDias}</span>
        </dd>
      </Cartao>
      <Cartao rotulo="Evolução">
        <dd className="flex flex-col gap-2">
          <span className="text-3xl font-bold">{evolucao}%</span>
          <BarraProgresso
            valor={diasConcluidos}
            maximo={totalDias}
            rotulo={`Evolução: ${evolucao}% (${diasConcluidos} de ${totalDias} dias)`}
          />
        </dd>
      </Cartao>
      <Cartao rotulo="Melhor sequência">
        <dd className="text-3xl font-bold">
          {melhorSequencia}
          <span className="ml-1 text-sm font-semibold text-texto-2">
            {melhorSequencia === 1 ? 'dia' : 'dias'}
          </span>
        </dd>
      </Cartao>
      <Cartao rotulo="Sequência atual">
        <dd className="text-3xl font-bold">
          <span aria-hidden className="mr-1">
            🔥
          </span>
          {sequenciaAtual}
          <span className="ml-1 text-sm font-semibold text-texto-2">
            {sequenciaAtual === 1 ? 'dia' : 'dias'}
          </span>
        </dd>
      </Cartao>
    </dl>
  );
}

const ITENS_LEGENDA: { rotulo: string; amostra: ReactNode }[] = [
  {
    rotulo: 'Concluído',
    amostra: (
      <span className="flex size-6 items-center justify-center rounded-md bg-vermelho text-sobre-vermelho">
        <Check className="size-3.5" aria-hidden />
      </span>
    ),
  },
  {
    rotulo: 'Hoje',
    amostra: <span className="size-6 rounded-md border-2 border-vermelho-texto bg-superficie-2" />,
  },
  { rotulo: 'Não concluído', amostra: <span className="size-6 rounded-md bg-superficie-2" /> },
  {
    rotulo: 'Invalidado',
    amostra: (
      <span className="flex size-6 items-center justify-center rounded-md border border-aviso-borda bg-aviso-fundo text-aviso-texto">
        <AlertTriangle className="size-3.5" aria-hidden />
      </span>
    ),
  },
  {
    rotulo: 'Ainda não chegou',
    amostra: <span className="size-6 rounded-md border border-borda" />,
  },
];

/** Legenda das cores da grade de 30 dias (mesmos estilos do GridDias). */
export function LegendaGrid() {
  return (
    <ul
      aria-label="Legenda da grade"
      className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-texto-2"
    >
      {ITENS_LEGENDA.map((item) => (
        <li key={item.rotulo} className="flex items-center gap-2">
          <span aria-hidden className="flex">
            {item.amostra}
          </span>
          {item.rotulo}
        </li>
      ))}
    </ul>
  );
}
