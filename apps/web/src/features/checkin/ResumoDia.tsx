import { REQUISITOS, type Requisito } from '@everest/shared';
import { Check } from 'lucide-react';
import { BarraProgresso } from '../../components/ui/basicos';

const ROTULO_REQUISITO: Record<Requisito, string> = {
  AGUA: 'Água',
  EXERCICIO: 'Exercício',
  LEITURA: 'Leitura',
  FOTOS: 'Fotos',
  STORY: 'Story',
};

/**
 * "N de 5 requisitos" (prévia local, calculada com as regras do shared) e o banner de
 * dia concluído — este só aparece quando o servidor confirma a conclusão.
 */
export function ResumoDia({ pendentes, concluido }: { pendentes: Requisito[]; concluido: boolean }) {
  const total = REQUISITOS.length;
  const feitos = total - pendentes.length;
  return (
    <div className="flex flex-col gap-3">
      {concluido && (
        <div role="status" className="rounded-2xl bg-vermelho px-4 py-5 text-center text-white">
          <p className="text-2xl font-bold">Dia concluído! 🔥</p>
          <p className="mt-1 text-sm">Os 5 requisitos estão cumpridos. Amanhã tem mais.</p>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <p className="text-base font-bold">
            {feitos} de {total} requisitos
          </p>
          <p className="rotulo">Checklist</p>
        </div>
        <BarraProgresso valor={feitos} maximo={total} rotulo={`${feitos} de ${total} requisitos cumpridos`} />
        <ul className="flex flex-wrap gap-1.5" aria-label="Requisitos do dia">
          {REQUISITOS.map((r) => {
            const ok = !pendentes.includes(r);
            return (
              <li
                key={r}
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${ok ? 'border-green-900 bg-green-950/50 text-green-100' : 'border-borda text-texto-2'}`}
              >
                {ok && <Check className="size-3.5" aria-hidden />}
                {ROTULO_REQUISITO[r]}
                <span className="sr-only">{ok ? ': feito' : ': pendente'}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
