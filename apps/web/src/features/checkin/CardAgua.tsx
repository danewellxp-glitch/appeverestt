import { LIMITES, METAS } from '@everest/shared';
import { Droplets } from 'lucide-react';
import { Barra } from '../../components/ui/Barra';
import { Botao } from '../../components/ui/Botao';
import { CardRequisito } from './CardRequisito';
import { formatarNumero, limitar } from './formatos';

export function CardAgua({
  aguaMl,
  editavel,
  aoAlterar,
}: {
  aguaMl: number;
  editavel: boolean;
  aoAlterar: (fn: (atual: number) => number) => void;
}) {
  const somar = (ml: number) => aoAlterar((atual) => limitar(atual + ml, 0, LIMITES.aguaMlMax));
  const bateu = aguaMl >= METAS.aguaMl;
  return (
    <CardRequisito
      titulo="Água"
      meta="Meta: 3 L no dia"
      icone={<Droplets className="size-5" />}
      cumprido={bateu}
      falta={`Faltam ${formatarNumero(Math.max(0, METAS.aguaMl - aguaMl))} ml`}
    >
      <p className="flex items-baseline gap-1.5">
        <span className="font-display text-[34px] leading-[0.9] font-extrabold tabular-nums">{formatarNumero(aguaMl)}</span>
        <span className="text-[13px] text-texto-2">/ {formatarNumero(METAS.aguaMl)} ml</span>
      </p>
      <Barra
        valor={aguaMl}
        maximo={METAS.aguaMl}
        rotulo={`Água: ${formatarNumero(aguaMl)} de ${formatarNumero(METAS.aguaMl)} ml`}
      />
      {editavel && (
        <div className="flex flex-wrap gap-2">
          <Botao
            tamanho="sm"
            variante="secundario"
            className="flex-auto"
            disabled={aguaMl <= 0}
            onClick={() => somar(-250)}
            aria-label="Tirar 250 ml"
          >
            −250
          </Botao>
          <Botao tamanho="sm" variante="secundario" className="flex-auto" onClick={() => somar(250)}>
            +250 ml
          </Botao>
          <Botao tamanho="sm" variante="secundario" className="flex-auto" onClick={() => somar(500)}>
            +500 ml
          </Botao>
          <Botao
            tamanho="sm"
            className="flex-auto"
            disabled={bateu}
            onClick={() => aoAlterar((atual) => Math.max(atual, METAS.aguaMl))}
          >
            Bati 3 L
          </Botao>
        </div>
      )}
    </CardRequisito>
  );
}
