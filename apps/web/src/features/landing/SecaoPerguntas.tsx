import { ChevronDown } from 'lucide-react';
import { perguntasFrequentes, secaoPerguntas, tt } from '../../content/landing';
import { useEstadoInscricao } from '../desafio/useEntrarNoDesafio';
import { SecaoLanding } from './Secao';
import { numerosDoDesafio } from './numeros';

/** Perguntas frequentes em <details> (abre e fecha sem JS, acessível por teclado). */
export function SecaoPerguntas() {
  const { desafio } = useEstadoInscricao();
  const perguntas = perguntasFrequentes({ ...numerosDoDesafio(desafio), apelido: tt.apelido });

  return (
    <SecaoLanding id="perguntas" eyebrow={secaoPerguntas.eyebrow} titulo={secaoPerguntas.titulo}>
      <div className="overflow-hidden rounded-3xl bg-superficie shadow-[inset_0_0_0_1px_var(--borda)]">
        {perguntas.map((p) => (
          <details key={p.pergunta} className="group border-borda [&+&]:border-t">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
              {p.pergunta}
              <ChevronDown
                className="size-5 shrink-0 text-texto-2 transition-transform duration-200 group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <p className="px-4 pb-4 text-sm text-texto-2">{p.resposta}</p>
          </details>
        ))}
      </div>
    </SecaoLanding>
  );
}
