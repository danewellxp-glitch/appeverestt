import { LIMITES, METAS } from '@everest/shared';
import { Droplets } from 'lucide-react';
import { Botao } from '../../components/ui/Botao';
import { Barra } from '../../components/ui/Barra';
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
    <CardRequisito titulo="Água" icone={<Droplets className="size-5" />} cumprido={bateu}>
      <p className="text-sm text-texto-2">
        <span className="text-2xl font-bold text-texto">{formatarNumero(aguaMl)}</span> de{' '}
        {formatarNumero(METAS.aguaMl)} ml
      </p>
      <Barra
        valor={aguaMl}
        maximo={METAS.aguaMl}
        rotulo={`Água: ${formatarNumero(aguaMl)} de ${formatarNumero(METAS.aguaMl)} ml`}
      />
      <div className="grid grid-cols-3 gap-2">
        <Botao
          variante="secundario"
          disabled={!editavel || aguaMl <= 0}
          onClick={() => somar(-250)}
          aria-label="Tirar 250 ml"
        >
          −250
        </Botao>
        <Botao variante="secundario" disabled={!editavel} onClick={() => somar(250)} aria-label="Somar 250 ml">
          +250
        </Botao>
        <Botao variante="secundario" disabled={!editavel} onClick={() => somar(500)} aria-label="Somar 500 ml">
          +500
        </Botao>
      </div>
      <Botao
        variante={bateu ? 'secundario' : 'primario'}
        larguraTotal
        disabled={!editavel || bateu}
        onClick={() => aoAlterar((atual) => Math.max(atual, METAS.aguaMl))}
      >
        Bati 3 L
      </Botao>
    </CardRequisito>
  );
}
