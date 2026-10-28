import { ShieldCheck } from 'lucide-react';
import { privacidade } from '../content/privacidade';

export default function Privacidade() {
  return (
    <article className="flex flex-col gap-8 py-4">
      <header className="flex flex-col gap-3">
        <p className="rotulo flex items-center gap-2">
          <ShieldCheck className="size-4" aria-hidden />
          Seus dados · LGPD
        </p>
        <h1 className="text-4xl font-black uppercase leading-none tracking-tight">{privacidade.titulo}</h1>
        <p className="text-base text-texto">{privacidade.resumo}</p>
        <p className="rounded-lg border border-borda px-3 py-2 text-xs text-texto-2">{privacidade.avisoProvisorio}</p>
      </header>

      {privacidade.secoes.map((secao) => (
        <section key={secao.titulo} className="flex flex-col gap-3">
          <h2 className="border-l-4 border-vermelho pl-3 text-lg font-bold">{secao.titulo}</h2>
          {secao.itens && (
            <ul className="flex flex-col gap-2 text-texto-2">
              {secao.itens.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-vermelho" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
          {secao.paragrafos?.map((p) => (
            <p key={p} className="text-texto-2">
              {p}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
