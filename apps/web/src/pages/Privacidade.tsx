import { AlertTriangle } from 'lucide-react';
import { BotaoVoltar } from '../components/layout/BotaoVoltar';
import { privacidade } from '../content/privacidade';
import { useMe } from '../lib/queries';

export default function Privacidade() {
  const { data: me } = useMe();
  return (
    <article className="flex flex-col gap-4">
      <header className="surgir flex items-center gap-3">
        <BotaoVoltar para={me ? '/perfil' : '/'} />
        <div className="min-w-0 flex-1">
          <p className="rotulo">Desafio 30 dias Everest</p>
          <h1 className="font-display text-[38px] leading-[0.9] font-black uppercase">{privacidade.titulo}</h1>
        </div>
      </header>

      <p className="flex items-center gap-2 rounded-[14px] bg-superficie-2 px-3 py-2.5 text-[13px] font-semibold text-vermelho-texto">
        <AlertTriangle className="size-4 shrink-0" aria-hidden />
        {privacidade.avisoProvisorio}
      </p>
      <p className="text-[15px]">{privacidade.resumo}</p>

      <div className="grid gap-3.5">
        {privacidade.secoes.map((secao) => (
          <section key={secao.titulo} className="grid gap-2">
            <h2 className="text-base font-bold">{secao.titulo}</h2>
            {secao.itens && (
              <ul className="grid max-w-[60ch] list-disc gap-1.5 pl-[18px] text-sm text-texto-2">
                {secao.itens.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {secao.paragrafos?.map((p) => (
              <p key={p} className="max-w-[60ch] text-sm text-texto-2">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
