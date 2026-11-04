import { AtSign } from 'lucide-react';
import { useState } from 'react';
import { MontanhaMarca } from '../../components/layout/Marca';
import { secaoTT, tt } from '../../content/landing';
import { linkInstagram, semPrefixo } from './contato';
import { Foto } from './Foto';
import { SecaoLanding } from './Secao';

const CLASSE_LINK_SECUNDARIO =
  'press inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-superficie-2 px-4 text-sm font-semibold text-texto hover:shadow-[inset_0_0_0_1px_var(--borda-campo)]';

/** Monograma no lugar da foto (decorativo: o nome está logo ao lado). */
function Monograma({ texto }: { texto: string }) {
  return (
    <span
      aria-hidden
      className="relative grid size-[84px] shrink-0 place-items-center overflow-hidden rounded-full bg-superficie-2 shadow-[inset_0_0_0_1px_var(--borda)]"
    >
      <span className="absolute inset-0 bg-linear-to-br from-vermelho/18 via-transparent to-laranja/14" />
      <MontanhaMarca className="absolute -bottom-1 left-1/2 aspect-[682/313] w-[150%] -translate-x-1/2 text-texto opacity-[0.08]" />
      <span className="relative font-display text-[34px] leading-none font-black text-vermelho-texto uppercase">
        {texto.slice(0, 2)}
      </span>
    </span>
  );
}

/** "Quem é o TT": foto (ou monograma), nome, papel, bio e o Instagram. */
export function SecaoTT() {
  const handle = semPrefixo(tt.instagram);
  const instagram = linkInstagram(handle);
  // Sem foto (ou se ela não carregar) o nome vai no placeholder, ao lado do monograma; com foto,
  // vai no corpo. Nunca nos dois lugares.
  const [semFoto, setSemFoto] = useState(() => !tt.foto?.src.trim());
  const cabecalho = (
    <div className="min-w-0">
      <h3 className="text-xl font-bold">{tt.nome}</h3>
      <p className="text-sm text-texto-2">{tt.papel}</p>
    </div>
  );

  return (
    <SecaoLanding id="quem-e-o-tt" eyebrow={secaoTT.eyebrow} titulo={secaoTT.titulo(tt.apelido)}>
      <article className="overflow-hidden rounded-[28px] bg-superficie shadow-[inset_0_0_0_1px_var(--borda)]">
        <Foto
          foto={tt.foto}
          className="aspect-[4/5]"
          aoFalhar={() => setSemFoto(true)}
          placeholder={
            <div className="flex items-center gap-4 px-5 pt-5">
              <Monograma texto={tt.apelido} />
              {cabecalho}
            </div>
          }
        />
        <div className="grid gap-3 p-5">
          {!semFoto && cabecalho}
          {tt.bio.map((paragrafo) => (
            <p key={paragrafo} className="text-[15px] leading-relaxed">
              {paragrafo}
            </p>
          ))}
          {instagram && (
            <a href={instagram} target="_blank" rel="noreferrer" className={`${CLASSE_LINK_SECUNDARIO} mt-1`}>
              <AtSign className="size-4" aria-hidden />
              {secaoTT.seguir(handle)}
            </a>
          )}
        </div>
      </article>
    </SecaoLanding>
  );
}
