import { ArrowRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { Contador } from '../../components/ui/Contador';
import { marcarDirecao } from '../../lib/transicoes';

/**
 * Revelação animada do número da vaga ("Nº 37 de 50 vagas") com o link "Ir para o desafio".
 * Usada na /bem-vindo (embaixador ou retorno com `?etapa=vaga`) e na /pagamento quando o
 * pagamento é confirmado. Tem o h1 da tela (focado ao montar).
 */
export function RevelacaoVaga({ vaga, totalVagas }: { vaga: number; totalVagas: number }) {
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titulo.current?.focus();
  }, []);
  return (
    <section className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="rotulo">Sua vaga</p>
      <h1
        ref={titulo}
        tabIndex={-1}
        aria-label={`Sua vaga: número ${vaga} de ${totalVagas}`}
        className="font-display text-[150px] leading-[0.8] font-black text-vermelho tabular-nums focus:outline-none"
        style={{ animation: 'revelar 520ms cubic-bezier(.2,1.2,.3,1) both' }}
      >
        <small className="mr-1.5 align-top text-[40px] text-texto">Nº</small>
        <Contador valor={vaga} />
      </h1>
      <p className="text-sm text-texto-2">de {totalVagas} vagas · inscrição confirmada</p>
      <Link
        to="/desafio"
        replace
        viewTransition
        onClick={() => marcarDirecao('avancar')}
        className="press mt-4 inline-flex h-[54px] w-full items-center justify-center gap-2.5 rounded-full border-2 border-transparent font-semibold [background:linear-gradient(var(--fundo),var(--fundo))_padding-box,linear-gradient(90deg,var(--vermelho),var(--laranja))_border-box]"
      >
        Ir para o desafio
        <ArrowRight className="size-5" aria-hidden />
      </Link>
    </section>
  );
}
