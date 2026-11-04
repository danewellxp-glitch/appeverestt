import { Flag } from 'lucide-react';
import { passosComoFunciona, secaoComoFunciona, tt } from '../../content/landing';
import { useEstadoInscricao } from '../desafio/useEntrarNoDesafio';
import { SecaoLanding } from './Secao';
import { numerosDoDesafio } from './numeros';

/** "Como funciona": a trilha do cadastro ao cume (check-in), com o último passo em destaque. */
export function SecaoComoFunciona() {
  const { desafio } = useEstadoInscricao();
  const passos = passosComoFunciona({ ...numerosDoDesafio(desafio), apelido: tt.apelido });

  return (
    <SecaoLanding id="como-funciona" eyebrow={secaoComoFunciona.eyebrow} titulo={secaoComoFunciona.titulo}>
      <ol className="grid">
        {passos.map((passo, i) => {
          const ultimo = i === passos.length - 1;
          return (
            <li key={passo.titulo} className="relative grid grid-cols-[auto_1fr] gap-x-4 pb-6 last:pb-0">
              {!ultimo && (
                <span
                  aria-hidden
                  className="absolute top-12 bottom-1 left-[21px] border-l-2 border-dashed border-vermelho/45"
                />
              )}
              <span
                aria-hidden
                className={`grid size-11 place-items-center rounded-full font-display text-xl font-extrabold tabular-nums ${
                  ultimo
                    ? 'bg-vermelho text-sobre-vermelho'
                    : 'bg-superficie shadow-[inset_0_0_0_1px_var(--borda)]'
                }`}
              >
                {ultimo ? <Flag className="size-5" /> : i + 1}
              </span>
              <div className="pt-1">
                <b className="block text-[15px]">{passo.titulo}</b>
                <p className="text-[13px] text-texto-2">{passo.texto}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </SecaoLanding>
  );
}
