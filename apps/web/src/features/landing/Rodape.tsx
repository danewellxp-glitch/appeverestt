import { LinkNav } from '../../components/layout/LinkNav';
import { IconeMontanha, Wordmark } from '../../components/layout/Marca';
import { rodape } from '../../content/landing';
import { textosRegras } from '../../content/regras';

const CLASSE_LINK =
  'inline-flex min-h-11 items-center px-2 text-sm font-semibold underline decoration-vermelho underline-offset-4';

/** Rodapé: marca, "Regras completas", "Política de privacidade" e a nota de hábito. */
export function Rodape() {
  return (
    <footer className="mt-auto grid justify-items-center gap-3 border-t border-borda pt-6 text-center">
      <span className="flex items-center gap-2 text-texto">
        <IconeMontanha className="h-5 w-11 text-texto" />
        <Wordmark className="h-3.5 aspect-[681/61]" />
      </span>
      <nav aria-label="Links do rodapé" className="flex flex-wrap justify-center gap-x-3">
        <LinkNav to="/regras" className={CLASSE_LINK}>
          {rodape.regras}
        </LinkNav>
        <LinkNav to="/privacidade" className={CLASSE_LINK}>
          {rodape.privacidade}
        </LinkNav>
      </nav>
      <p className="max-w-[36ch] text-xs text-texto-2">{textosRegras.rodape}</p>
    </footer>
  );
}
