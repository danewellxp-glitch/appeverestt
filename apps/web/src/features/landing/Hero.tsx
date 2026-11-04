import { ChevronDown } from 'lucide-react';
import type { CSSProperties, MouseEvent } from 'react';
import { MontanhaMarca } from '../../components/layout/Marca';
import { Skeleton } from '../../components/ui/basicos';
import { hero } from '../../content/landing';
import { formatarDataCurta } from '../../lib/datas';
import { reduzirMovimento } from '../../lib/transicoes';
import { BotaoQueroParticipar } from '../desafio/EntrarNoDesafio';
import { useEstadoInscricao } from '../desafio/useEntrarNoDesafio';
import { CardVagas } from './CardVagas';
import { numerosDoDesafio } from './numeros';
import { TopoLanding } from './TopoLanding';

/** Id da seção "O desafio" (destino do "Conheça o desafio"). */
export const ID_SECAO_DESAFIO = 'o-desafio';

/** Rola até a seção sem mexer na URL (a rota "/" fica limpa) e leva o foco ao título dela. */
function irParaSecao(e: MouseEvent<HTMLAnchorElement>, id: string) {
  const secao = document.getElementById(id);
  if (!secao) return;
  e.preventDefault();
  secao.scrollIntoView({ behavior: reduzirMovimento() ? 'auto' : 'smooth', block: 'start' });
  document.getElementById(`${id}-titulo`)?.focus({ preventScroll: true });
}

function estilo(i: number): CSSProperties {
  return { '--i': i } as CSSProperties;
}

/** Topo da landing: marca, título, mini contador de vagas e o 1º "Quero participar". */
export function Hero() {
  const { estado, desafio, desafioCarregando } = useEstadoInscricao();
  const { totalDias } = numerosDoDesafio(desafio);
  const [linha1, linha2, destaque] = hero.titulo;
  const semVagas = estado.tipo === 'sem-desafio' || estado.tipo === 'erro';
  const selo =
    estado.tipo === 'inscrito' && estado.vagaNumero !== null
      ? hero.seloVaga(estado.vagaNumero, estado.status === 'CONFIRMADO')
      : null;

  return (
    <div className="grid gap-4">
      <TopoLanding />

      <div className="surgir -mx-5 -mt-1 h-[150px]" style={estilo(1)}>
        <MontanhaMarca className="h-[150px] w-full text-texto" />
      </div>

      <div className="surgir grid gap-3" style={estilo(2)}>
        <p className="rotulo">
          Desafio {totalDias} dias{desafio ? ` · início ${formatarDataCurta(desafio.dataInicio)}` : ''}
        </p>
        <h1 className="font-display text-[min(76px,18vw)] leading-[0.88] font-black uppercase">
          {linha1}
          <br />
          {linha2}
          <br />
          <span className="text-vermelho">{destaque}</span>
        </h1>
        <p className="max-w-[34ch] text-[15px] text-texto-2">{hero.subtitulo(totalDias)}</p>
      </div>

      <div className="surgir grid gap-3" style={estilo(3)}>
        {selo && (
          <p className="justify-self-start rounded-full bg-superficie-2 px-3 py-1 text-xs font-semibold">{selo}</p>
        )}
        {desafio && !semVagas ? (
          <CardVagas desafio={desafio} />
        ) : desafioCarregando ? (
          <div role="status" aria-label="Carregando as vagas">
            <Skeleton className="h-[150px] rounded-3xl" />
          </div>
        ) : null}
        <BotaoQueroParticipar />
        <a
          href={`#${ID_SECAO_DESAFIO}`}
          onClick={(e) => irParaSecao(e, ID_SECAO_DESAFIO)}
          className="mx-auto inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-semibold text-texto-2 hover:text-texto"
        >
          {hero.saibaMais}
          <ChevronDown className="size-4" aria-hidden />
        </a>
      </div>
    </div>
  );
}
