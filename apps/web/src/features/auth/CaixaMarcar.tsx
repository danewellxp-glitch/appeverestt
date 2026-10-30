import { useId, type ReactNode } from 'react';
import { Link } from 'react-router';

/** Checkbox nativo grande (22 px, vermelho) com texto e erro ligados por aria-describedby. */
export function CaixaMarcar({
  marcado,
  aoMudar,
  erro,
  children,
}: {
  marcado: boolean;
  aoMudar: (marcado: boolean) => void;
  erro?: string | undefined;
  children: ReactNode;
}) {
  const id = useId();
  const idErro = `${id}-erro`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 py-1 text-[13px] text-texto-2">
        <input
          id={id}
          type="checkbox"
          checked={marcado}
          onChange={(e) => aoMudar(e.currentTarget.checked)}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? idErro : undefined}
          className="mt-0.5 size-[22px] shrink-0 accent-vermelho"
        />
        <span>{children}</span>
      </label>
      {erro && (
        <p id={idErro} className="text-[13px] text-vermelho-texto">
          {erro}
        </p>
      )}
    </div>
  );
}

/** Texto do aceite (docs/FRONTEND.md §10), com link para a política. */
export function TextoAceite() {
  return (
    <>
      Li e aceito a{' '}
      <Link to="/privacidade" className="text-texto underline decoration-vermelho underline-offset-[3px]">
        política de privacidade
      </Link>
      , incluindo o uso das minhas fotos de prova.
    </>
  );
}
