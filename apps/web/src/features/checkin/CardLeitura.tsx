import { LIMITES, METAS } from '@everest/shared';
import { BookOpen } from 'lucide-react';
import { useId, useState } from 'react';
import { Botao } from '../../components/ui/Botao';
import { BarraProgresso } from '../../components/ui/basicos';
import { CardRequisito } from './CardRequisito';
import { limitar } from './formatos';

export function CardLeitura({
  paginas,
  editavel,
  aoAlterar,
}: {
  paginas: number;
  editavel: boolean;
  aoAlterar: (fn: (atual: number) => number) => void;
}) {
  const idCampo = useId();
  const idDica = useId();
  // Texto enquanto a pessoa digita (permite apagar o campo sem virar 0 na hora).
  const [digitando, setDigitando] = useState<string | null>(null);
  const somar = (n: number) => aoAlterar((atual) => limitar(atual + n, 0, LIMITES.paginasMax));

  return (
    <CardRequisito titulo="Leitura" icone={<BookOpen className="size-5" />} cumprido={paginas >= METAS.paginas}>
      <BarraProgresso
        valor={paginas}
        maximo={METAS.paginas}
        rotulo={`Leitura: ${paginas} de ${METAS.paginas} páginas`}
      />
      <div className="flex items-end gap-2">
        <Botao
          variante="secundario"
          disabled={!editavel || paginas <= 0}
          onClick={() => somar(-1)}
          aria-label="Tirar 1 página"
        >
          −1
        </Botao>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor={idCampo} className="rotulo">
            Páginas lidas
          </label>
          <input
            id={idCampo}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            aria-describedby={idDica}
            disabled={!editavel}
            value={digitando ?? String(paginas)}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              const texto = e.currentTarget.value.replace(/\D/g, '').slice(0, 4);
              setDigitando(texto);
              if (texto !== '') {
                const n = limitar(Number(texto), 0, LIMITES.paginasMax);
                aoAlterar(() => n);
              }
            }}
            onBlur={() => {
              if (digitando === '') aoAlterar(() => 0);
              setDigitando(null);
            }}
            className="min-h-11 w-full rounded-xl border border-borda-campo bg-superficie-2 px-3 text-center text-xl font-bold text-texto disabled:opacity-60"
          />
        </div>
        <Botao variante="secundario" disabled={!editavel} onClick={() => somar(1)} aria-label="Somar 1 página">
          +1
        </Botao>
        <Botao variante="secundario" disabled={!editavel} onClick={() => somar(5)} aria-label="Somar 5 páginas">
          +5
        </Botao>
      </div>
      <p id={idDica} className="text-xs text-texto-2">
        Meta: {METAS.paginas} páginas por dia.
      </p>
    </CardRequisito>
  );
}
