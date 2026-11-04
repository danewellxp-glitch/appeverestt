import { LinkNav } from '../../components/layout/LinkNav';
import { IconeMontanha, Wordmark } from '../../components/layout/Marca';
import { preCarregarAuth } from '../../lib/firebase';
import { useEstadoInscricao } from '../desafio/useEntrarNoDesafio';

const CLASSE_LINK =
  'inline-flex min-h-11 items-center px-1 text-sm font-semibold underline decoration-vermelho underline-offset-4';

/** Marca à esquerda; à direita "Entrar", "Minha conta" ou o próximo passo de quem já tem vaga. */
export function TopoLanding() {
  const { estado, me, sessaoCarregando } = useEstadoInscricao();
  return (
    <header className="surgir flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-texto">
        <IconeMontanha className="h-6 w-[53px] text-texto" />
        <Wordmark className="h-4 aspect-[681/61]" />
      </span>
      {sessaoCarregando ? null : estado.tipo === 'inscrito' ? (
        <LinkNav to={estado.para} className={CLASSE_LINK}>
          {estado.rotulo}
        </LinkNav>
      ) : me ? (
        <LinkNav to="/perfil" className={CLASSE_LINK}>
          Minha conta
        </LinkNav>
      ) : (
        <LinkNav to="/entrar" onPointerDown={preCarregarAuth} onFocus={preCarregarAuth} className={CLASSE_LINK}>
          Entrar
        </LinkNav>
      )}
    </header>
  );
}
