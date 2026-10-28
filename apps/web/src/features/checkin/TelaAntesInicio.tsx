import type { DesafioAtual, MeuProgresso } from '@everest/shared';
import { CalendarClock } from 'lucide-react';
import { Link } from 'react-router';
import { GridDias } from '../../components/GridDias';
import { Botao } from '../../components/ui/Botao';
import { Alerta, Card, Rotulo, Skeleton } from '../../components/ui/basicos';
import { formatarData } from '../../lib/datas';

function titulo(dias: number): string {
  if (dias <= 0) return 'O desafio começa hoje!';
  if (dias === 1) return 'O desafio começa amanhã';
  return `O desafio começa em ${dias} dias`;
}

/** Antes do início: contagem regressiva, data de início e link para as regras. */
export function TelaAntesInicio({
  desafio,
  falhou,
  aoTentarDeNovo,
  progresso,
}: {
  desafio: DesafioAtual | undefined;
  falhou: boolean;
  aoTentarDeNovo: () => void;
  progresso: MeuProgresso;
}) {
  if (!desafio && falhou) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">O desafio ainda não começou</h1>
        <Alerta
          tipo="erro"
          acao={
            <Botao variante="secundario" onClick={aoTentarDeNovo} className="shrink-0">
              Tentar de novo
            </Botao>
          }
        >
          Não foi possível carregar a data de início.
        </Alerta>
      </div>
    );
  }
  if (!desafio) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="sr-only">Contagem regressiva</h1>
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  const dias = Math.max(0, desafio.diasParaInicio);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Rotulo>Prepare-se</Rotulo>
        <h1 className="text-3xl font-bold leading-tight">{titulo(dias)}</h1>
        <p className="text-texto-2 first-letter:uppercase">
          Início: {formatarData(desafio.dataInicio, { comDiaSemana: true })}
        </p>
      </div>

      <Card className="flex flex-col items-center gap-2 py-8 text-center">
        <CalendarClock className="size-8 text-texto-2" aria-hidden />
        <p className="text-6xl font-bold tabular-nums text-vermelho" aria-hidden>
          {dias}
        </p>
        <p className="rotulo" aria-hidden>
          {dias === 1 ? 'dia para começar' : 'dias para começar'}
        </p>
      </Card>

      <p className="text-sm text-texto-2">
        Você já está inscrito. No primeiro dia, esta tela vira o seu check-in diário: água, exercício, leitura, 3
        fotos de prova e o story.
      </p>

      <Link
        to="/regras"
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-borda bg-superficie-2 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-texto hover:border-texto-2"
      >
        Ler as regras
      </Link>

      <section aria-label="Os 30 dias" className="flex flex-col gap-2">
        <Rotulo>Seus {progresso.totalDias} dias</Rotulo>
        <GridDias dias={progresso.dias} rotulo="Dias do desafio (ainda não começou)" />
      </section>
    </div>
  );
}
