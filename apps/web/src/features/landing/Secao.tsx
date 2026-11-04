import type { ReactNode } from 'react';

/** Seção da landing: âncora (`id`), eyebrow e h2 em display. A seção é rotulada pelo próprio h2. */
export function SecaoLanding({
  id,
  eyebrow,
  titulo,
  children,
}: {
  id: string;
  eyebrow: string;
  titulo: string;
  children: ReactNode;
}) {
  const idTitulo = `${id}-titulo`;
  return (
    <section id={id} aria-labelledby={idTitulo} className="grid scroll-mt-6 gap-4">
      <div className="grid gap-1.5">
        <p className="rotulo">{eyebrow}</p>
        <h2
          id={idTitulo}
          tabIndex={-1}
          className="font-display text-[44px] leading-[0.9] font-black uppercase focus:outline-none"
        >
          {titulo}
        </h2>
      </div>
      {children}
    </section>
  );
}

/** Subtítulo dentro de uma seção (mesmo estilo das seções de /regras e da home). */
export function SubtituloLanding({ children }: { children: ReactNode }) {
  return <h3 className="mt-2 text-[13px] font-semibold tracking-[0.14em] text-texto-2 uppercase">{children}</h3>;
}
