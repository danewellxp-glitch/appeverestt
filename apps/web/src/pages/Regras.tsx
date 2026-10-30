import { TOTAL_DIAS_PADRAO } from '@everest/shared';
import {
  ArrowRight,
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
import type { CSSProperties, ReactNode } from 'react';
import { BotaoVoltar } from '../components/layout/BotaoVoltar';
import { Skeleton } from '../components/ui/basicos';
import { regrasDiarias, regrasVagasEPremio, textosRegras, type IdRegra, type Regra } from '../content/regras';
import { formatarData } from '../lib/datas';
import { LinkNav } from '../components/layout/LinkNav';
import { useDesafioAtual, useMe } from '../lib/queries';

const ICONES: Record<IdRegra, LucideIcon> = {
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

function semPrefixo(valor: string, prefixo: '@' | '#'): string {
  return valor.trim().replace(prefixo === '@' ? /^@+/ : /^#+/, '');
}

function Secao({ titulo, i, children }: { titulo: string; i: number; children: ReactNode }) {
  return (
    <section aria-label={titulo} className="surgir flex flex-col gap-3" style={{ '--i': i } as CSSProperties}>
      <h2 className="mt-1.5 text-[13px] font-semibold tracking-[0.14em] text-texto-2 uppercase">{titulo}</h2>
      {children}
    </section>
  );
}

function ListaRegras({ regras }: { regras: Regra[] }) {
  return (
    <ul className="overflow-hidden rounded-3xl bg-superficie shadow-[inset_0_0_0_1px_var(--borda)]">
      {regras.map((r) => {
        const Icone = ICONES[r.id];
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

export default function Regras() {
  const desafioQ = useDesafioAtual();
  const { data: me } = useMe();
  const desafio = desafioQ.data;
  const instagram = desafio ? `@${semPrefixo(desafio.instagramHandle, '@')}` : 'o perfil do desafio';
  const hashtag = desafio ? `#${semPrefixo(desafio.hashtag, '#')}` : 'a hashtag do desafio';
  const totalDias = desafio?.totalDias ?? TOTAL_DIAS_PADRAO;

  return (
    <article className="flex flex-col gap-4">
      <header className="surgir flex items-center gap-3">
        <BotaoVoltar para={me?.participacao ? '/desafio' : '/'} />
        <div className="min-w-0 flex-1">
          <p className="rotulo">{desafio?.nome ?? textosRegras.eyebrow}</p>
          <h1 className="font-display text-[38px] leading-[0.9] font-black uppercase">{textosRegras.titulo}</h1>
        </div>
      </header>

      <Secao titulo="Todos os dias" i={1}>
        <ListaRegras regras={regrasDiarias(instagram, hashtag)} />
        <p className="text-[13px] text-texto-2">{textosRegras.notaDiaria}</p>
      </Secao>

      <Secao titulo="Vagas e prêmio" i={2}>
        <ListaRegras regras={regrasVagasEPremio(desafio?.totalVagas ?? null, totalDias, desafio?.inscricao?.valorCentavos ?? null)} />
      </Secao>

      <Secao titulo="Datas" i={3}>
        {desafioQ.isPending ? (
          <Skeleton className="h-16 rounded-3xl" />
        ) : desafio ? (
          <p className="rounded-3xl bg-superficie px-4 py-3.5 text-sm shadow-[inset_0_0_0_1px_var(--borda)]">
            De <b>{formatarData(desafio.dataInicio, { comDiaSemana: true })}</b> a{' '}
            <b>{formatarData(desafio.dataFim, { comDiaSemana: true })}</b>: {totalDias} dias seguidos, no horário de
            Brasília.
          </p>
        ) : (
          <p className="text-sm text-texto-2">As datas serão divulgadas na abertura do próximo desafio.</p>
        )}
      </Secao>

      <p className="text-xs text-texto-2">{textosRegras.rodape}</p>

      {!me?.participacao && (
        <LinkNav
          to="/"
          className="press inline-flex h-[54px] w-full items-center justify-center gap-2.5 rounded-full bg-vermelho px-5 font-semibold text-sobre-vermelho hover:bg-vermelho-escuro"
        >
          Quero participar
          <ArrowRight className="size-5" aria-hidden />
        </LinkNav>
      )}
    </article>
  );
}
