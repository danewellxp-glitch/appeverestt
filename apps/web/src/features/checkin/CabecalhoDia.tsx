import { formatarData } from '../../lib/datas';

/** "Dia X de 30" (único h1 da tela) + data por extenso do dia selecionado. */
export function CabecalhoDia({
  numeroDia,
  totalDias,
  data,
  ehHoje,
}: {
  numeroDia: number;
  totalDias: number;
  data: string | undefined;
  ehHoje: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="rotulo">{ehHoje ? 'Hoje' : 'Consultando'}</p>
      <h1 className="text-4xl font-bold leading-tight">
        Dia {numeroDia} <span className="text-texto-2">de {totalDias}</span>
      </h1>
      {data && <p className="text-base text-texto-2 first-letter:uppercase">{formatarData(data, { comDiaSemana: true })}</p>}
    </div>
  );
}
