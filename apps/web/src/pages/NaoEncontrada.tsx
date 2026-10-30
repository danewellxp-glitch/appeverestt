import { ArrowLeft } from 'lucide-react';
import { LinkNav } from '../components/layout/LinkNav';
import { useMe } from '../lib/queries';

export default function NaoEncontrada() {
  const { data: me } = useMe();
  const destino = me?.participacao ? '/desafio' : '/';
  return (
    <section className="surgir flex flex-col items-center gap-3 py-16 text-center">
      <p className="rotulo">Erro 404</p>
      <h1 className="font-display text-[64px] leading-[0.9] font-black uppercase">Trilha errada</h1>
      <p className="max-w-[30ch] text-[15px] text-texto-2">
        Esse caminho não existe. Volte para a base e siga a escalada.
      </p>
      <LinkNav
        to={destino}
        direcao="voltar"
        className="press mt-4 inline-flex h-[54px] items-center justify-center gap-2.5 rounded-full bg-vermelho px-6 font-semibold text-sobre-vermelho hover:bg-vermelho-escuro"
      >
        <ArrowLeft className="size-5" aria-hidden />
        {me?.participacao ? 'Voltar ao desafio' : 'Voltar ao início'}
      </LinkNav>
    </section>
  );
}
