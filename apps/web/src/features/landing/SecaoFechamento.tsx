import { MontanhaMarca } from '../../components/layout/Marca';
import { Skeleton } from '../../components/ui/basicos';
import { Barra } from '../../components/ui/Barra';
import { fechamento } from '../../content/landing';
import { formatarDataCurta } from '../../lib/datas';
import { AvisoFiquemLigados, BotaoQueroParticipar } from '../desafio/EntrarNoDesafio';
import { useEstadoInscricao } from '../desafio/useEntrarNoDesafio';
import { SecaoLanding } from './Secao';

const ID = 'vagas';

/** Fechamento: vagas restantes e o 3º "Quero participar" (ou o "Fiquem ligados" sem desafio ativo). */
export function SecaoFechamento() {
  const { estado, desafio, desafioCarregando } = useEstadoInscricao();

  if (estado.tipo === 'erro') return null;
  if (estado.tipo === 'sem-desafio') {
    return (
      <SecaoLanding id={ID} eyebrow={fechamento.eyebrow} titulo={fechamento.tituloSemDesafio}>
        <AvisoFiquemLigados />
      </SecaoLanding>
    );
  }
  if (!desafio) {
    return desafioCarregando ? <Skeleton className="h-72 rounded-[32px]" /> : null;
  }

  const ocupadas = Math.max(0, desafio.totalVagas - desafio.vagasDisponiveis);
  const inicio = formatarDataCurta(desafio.dataInicio);
  const titulo =
    estado.tipo === 'inscrito'
      ? fechamento.tituloInscrito
      : estado.tipo === 'bloqueado'
        ? fechamento.tituloBloqueado(desafio.vagasDisponiveis <= 0)
        : fechamento.titulo(desafio.vagasDisponiveis);

  return (
    <section
      id={ID}
      aria-labelledby={`${ID}-titulo`}
      className="relative grid scroll-mt-6 gap-4 overflow-hidden rounded-[32px] bg-pop px-5 pt-7 pb-5 text-center text-pop-texto"
    >
      <MontanhaMarca className="pointer-events-none absolute -top-2 left-1/2 aspect-[682/313] w-[120%] -translate-x-1/2 text-pop-texto opacity-[0.08]" />
      <div className="relative grid gap-2">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-pop-texto-2 uppercase">{fechamento.eyebrow}</p>
        <h2 id={`${ID}-titulo`} className="font-display text-[56px] leading-[0.88] font-black uppercase">
          {titulo}
        </h2>
        <p className="text-sm text-pop-texto-2">
          {estado.tipo === 'inscrito' && estado.vagaNumero !== null
            ? fechamento.textoInscrito(estado.vagaNumero, inicio)
            : fechamento.texto(ocupadas, desafio.totalVagas, inicio)}
        </p>
      </div>
      <Barra valor={ocupadas} maximo={desafio.totalVagas} rotulo="Vagas ocupadas" tom="pop" className="relative" />
      <div className="relative">
        <BotaoQueroParticipar />
      </div>
    </section>
  );
}
