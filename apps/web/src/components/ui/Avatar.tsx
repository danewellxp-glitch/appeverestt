import { iniciais } from '@everest/shared';
import { useState } from 'react';

/** 8 fundos fixos (iguais nos dois temas); texto branco ≥ 4,5:1 em todos. */
const CORES = [
  'bg-red-700',
  'bg-orange-700',
  'bg-amber-700',
  'bg-green-700',
  'bg-teal-700',
  'bg-blue-700',
  'bg-violet-700',
  'bg-pink-700',
] as const;

const TAMANHOS = {
  sm: 'size-[30px] text-[11px]',
  md: 'size-11 text-[15px]',
  xl: 'size-[84px] text-[28px]',
} as const;

/** Cor determinística a partir do nome (a mesma pessoa tem sempre a mesma cor). */
export function corDoAvatar(nome: string): (typeof CORES)[number] {
  let h = 0;
  for (const c of nome.trim().toLocaleLowerCase('pt-BR')) h = (h * 31 + (c.codePointAt(0) ?? 0)) >>> 0;
  return CORES[h % CORES.length] ?? CORES[0];
}

export interface AvatarProps {
  nome: string;
  fotoUrl?: string | null;
  tamanho?: keyof typeof TAMANHOS;
  className?: string;
}

/** Foto (do Google) ou iniciais sobre uma cor fixa. Decorativo: o nome aparece ao lado. */
export function Avatar({ nome, fotoUrl, tamanho = 'md', className = '' }: AvatarProps) {
  const [falhou, setFalhou] = useState(false);
  const base = `inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-bold ${TAMANHOS[tamanho]} ${className}`;
  if (fotoUrl && !falhou) {
    return (
      <img
        src={fotoUrl}
        alt=""
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
        onError={() => setFalhou(true)}
        className={`${base} object-cover`}
      />
    );
  }
  return (
    <span aria-hidden className={`${base} ${corDoAvatar(nome)} text-white`}>
      {iniciais(nome)}
    </span>
  );
}

/** Avatares sobrepostos (−8 px) com anel na cor do card "pop". */
export function PilhaAvatares({
  pessoas,
  max = 4,
}: {
  pessoas: { nome: string; fotoUrl?: string | null }[];
  max?: number;
}) {
  return (
    <span aria-hidden className="flex items-center">
      {pessoas.slice(0, max).map((p, i) => (
        <Avatar key={`${p.nome}-${i}`} nome={p.nome} fotoUrl={p.fotoUrl} tamanho="sm" className="-mr-2 ring-2 ring-pop" />
      ))}
    </span>
  );
}
