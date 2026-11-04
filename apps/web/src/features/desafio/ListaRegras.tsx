import type { DesafioAtual } from '@everest/shared';
import {
  AtSign,
  BookOpen,
  Camera,
  ChartLine,
  Droplets,
  Dumbbell,
  QrCode,
  ShieldCheck,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { regrasDiarias, type IdRegra, type Regra } from '../../content/regras';
import { semPrefixo } from '../landing/contato';

export const ICONES_REGRA: Record<IdRegra, LucideIcon> = {
  AGUA: Droplets,
  EXERCICIO: Dumbbell,
  LEITURA: BookOpen,
  FOTOS: Camera,
  STORY: AtSign,
  VAGAS: Users,
  PAGAMENTO: QrCode,
  PREMIO: Trophy,
  DESEMPATE: ChartLine,
  CONFERENCIA: ShieldCheck,
};

/** Lista de regras com bolha de ícone (/regras e landing). */
export function ListaRegras({ regras }: { regras: Regra[] }) {
  return (
    <ul className="overflow-hidden rounded-3xl bg-superficie shadow-[inset_0_0_0_1px_var(--borda)]">
      {regras.map((r) => {
        const Icone = ICONES_REGRA[r.id];
        return (
          <li key={r.id} className="grid grid-cols-[auto_1fr] items-start gap-3 border-borda px-4 py-3.5 [&+&]:border-t">
            <span aria-hidden className="grid size-[42px] place-items-center rounded-full bg-superficie-2 text-vermelho-texto">
              <Icone className="size-5" />
            </span>
            <div>
              <b className="block text-[15px]">{r.titulo}</b>
              <p className="text-[13px] text-texto-2">{r.texto}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** @ e hashtag do story, formatados (ou texto provisório enquanto o desafio não carregou). */
export function identificacaoDoStory(desafio: Pick<DesafioAtual, 'instagramHandle' | 'hashtag'> | undefined): {
  instagram: string;
  hashtag: string;
} {
  return {
    instagram: desafio ? `@${semPrefixo(desafio.instagramHandle, '@')}` : 'o perfil do desafio',
    hashtag: desafio ? `#${semPrefixo(desafio.hashtag, '#')}` : 'a hashtag do desafio',
  };
}

/** Os 5 requisitos diários, com o @ e a hashtag do desafio atual. */
export function RegrasDoDia({ desafio }: { desafio: DesafioAtual | undefined }) {
  const { instagram, hashtag } = identificacaoDoStory(desafio);
  return <ListaRegras regras={regrasDiarias(instagram, hashtag)} />;
}
