import type { LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { MontanhaMarca } from '../../components/layout/Marca';
import type { FotoLanding } from '../../content/landing';

/**
 * Foto de public/landing/ com fallback: sem `src` ou se o arquivo não carregar, mostra o
 * `placeholder` (nunca um ícone de imagem quebrada). Carrega sob demanda (abaixo da dobra).
 */
export function Foto({
  foto,
  className,
  placeholder,
  aoFalhar,
}: {
  foto: FotoLanding | null;
  className: string;
  placeholder: ReactNode;
  /** Avisa quem usa que a foto não carregou (o placeholder entrou no lugar). */
  aoFalhar?: () => void;
}) {
  const [falhou, setFalhou] = useState(false);
  const src = foto?.src.trim() ?? '';
  if (!foto || !src || falhou) return <>{placeholder}</>;
  return (
    <img
      src={src}
      alt={foto.alt}
      loading="lazy"
      decoding="async"
      onError={() => {
        setFalhou(true);
        aoFalhar?.();
      }}
      className={`block w-full bg-superficie-2 object-cover ${className}`}
    />
  );
}

/**
 * Placeholder desenhado (decorativo): fundo com brilho vermelho/laranja, a montanha da marca ao
 * fundo, o ícone do tema e o rótulo. Quem descreve a ausência das fotos é o texto da seção.
 */
export function PlaceholderFoto({ Icone, rotulo, className }: { Icone: LucideIcon; rotulo: string; className: string }) {
  return (
    <div
      aria-hidden
      className={`relative w-full overflow-hidden rounded-3xl bg-superficie-2 shadow-[inset_0_0_0_1px_var(--borda)] ${className}`}
    >
      <div className="absolute inset-0 bg-linear-to-br from-vermelho/14 via-transparent to-laranja/12" />
      <MontanhaMarca className="absolute -bottom-[6%] left-1/2 aspect-[682/313] w-[130%] -translate-x-1/2 text-texto opacity-[0.07]" />
      <span className="absolute top-3 left-3 grid size-10 place-items-center rounded-full bg-superficie text-vermelho-texto shadow-[inset_0_0_0_1px_var(--borda)]">
        <Icone className="size-5" />
      </span>
      <span className="absolute bottom-3 left-3.5 text-sm font-semibold">{rotulo}</span>
    </div>
  );
}
