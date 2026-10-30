import { ALTITUDE_CUME, altitudeSimbolica, type DiaDetalhe } from '@everest/shared';
import { Check, Copy, Trophy } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Botao } from '../../components/ui/Botao';
import { Contador } from '../../components/ui/Contador';
import { useToast } from '../../components/ui/Toast';
import { useCheckin } from '../checkin/useCheckin';
import { copiarTexto } from './navegacao';

const FORMATO = new Intl.NumberFormat('pt-BR');

/** Mini-montanha com o trilho percorrido (proporção dias/30) e o ponto onde a pessoa está. */
function MiniMontanha({ fracao }: { fracao: number }) {
  const trilha = useRef<SVGPathElement>(null);
  const [ponto, setPonto] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const p = trilha.current;
    if (!p || typeof p.getTotalLength !== 'function') return;
    const pt = p.getPointAtLength(p.getTotalLength() * Math.max(0, Math.min(1, fracao)));
    setPonto({ x: pt.x, y: pt.y });
  }, [fracao]);
  return (
    <svg aria-hidden viewBox="0 0 220 130" className="pointer-events-none absolute -right-3.5 -bottom-2 h-auto w-[62%]">
      <path d="M0 130 L60 70 L90 88 L140 30 L220 130Z" fill="rgb(0 0 0 / 0.18)" />
      <path d="M80 130 L140 30 L160 54 L176 40 L220 96 L220 130Z" fill="rgb(255 255 255 / 0.16)" />
      <path
        ref={trilha}
        d="M20 124 L60 74 L90 92 L140 32"
        pathLength={100}
        strokeDasharray={`${fracao * 100} 100`}
        fill="none"
        stroke="rgb(255 255 255 / 0.95)"
        strokeWidth={3}
        strokeLinecap="round"
      />
      {ponto && <circle r={6} cx={ponto.x} cy={ponto.y} fill="#fff" />}
    </svg>
  );
}

/** Card vermelho da escalada simbólica (X6): 295 m por dia até 8.848 m. */
export function CardEscalada({ diasConcluidos, totalDias }: { diasConcluidos: number; totalDias: number }) {
  const altitude = altitudeSimbolica(diasConcluidos, totalDias);
  return (
    <article
      aria-label="Sua escalada"
      className="relative flex min-h-[196px] w-full shrink-0 snap-start flex-col gap-1.5 overflow-hidden rounded-[30px] bg-vermelho p-5 text-sobre-vermelho"
    >
      <p className="text-[11px] font-semibold tracking-[0.16em] uppercase">Sua escalada</p>
      <p className="font-display text-[48px] leading-[0.88] font-black uppercase">
        <Contador valor={altitude} /> m
      </p>
      <p className="text-[13px]">
        de {FORMATO.format(ALTITUDE_CUME)} m até o cume · {diasConcluidos}{' '}
        {diasConcluidos === 1 ? 'dia concluído' : 'dias concluídos'}
      </p>
      <p className="relative z-10 mt-auto flex max-w-[23ch] items-center gap-2 text-[13px] font-semibold">
        <Trophy className="size-4 shrink-0" aria-hidden />
        No cume: camiseta de treino, whey e creatina
      </p>
      <MiniMontanha fracao={totalDias > 0 ? diasConcluidos / totalDias : 0} />
    </article>
  );
}

/** Card do story do dia: copiar @/hashtag e marcar como postado (mesmo useCheckin do dia atual). */
export function CardStoryDoDia({
  slug,
  dia,
  instagramHandle,
  hashtag,
}: {
  slug: string;
  dia: DiaDetalhe;
  instagramHandle: string;
  hashtag: string;
}) {
  const { toast } = useToast();
  const checkin = useCheckin(slug, dia, dia.editavel);
  const postado = checkin.valores?.storyPostado ?? dia.storyPostado;
  const texto = `@${instagramHandle} #${hashtag}`;

  return (
    <article
      aria-label="Story do dia"
      className="relative flex min-h-[196px] w-full shrink-0 snap-start flex-col gap-1.5 overflow-hidden rounded-[30px] border-2 border-transparent p-5 [background:linear-gradient(var(--superficie),var(--superficie))_padding-box,linear-gradient(120deg,var(--vermelho),var(--laranja))_border-box]"
    >
      <p className="rotulo">Story do dia</p>
      <p className="mt-1 mb-3 max-w-[22ch] text-[21px] leading-tight font-semibold">
        Poste um story marcando <b className="text-vermelho-texto">@{instagramHandle}</b> e usando{' '}
        <b className="text-vermelho-texto">#{hashtag}</b>
      </p>
      <div className="mt-auto flex flex-wrap gap-2">
        <Botao
          tamanho="sm"
          variante="secundario"
          icone={<Copy className="size-4" aria-hidden />}
          onClick={() =>
            void copiarTexto(texto).then((ok) =>
              toast(ok ? 'Copiado! Agora é só colar no story.' : `Copie à mão: ${texto}`, { duracao: ok ? 2400 : 6000 }),
            )
          }
        >
          Copiar @ e hashtag
        </Botao>
        <Botao
          tamanho="sm"
          variante={postado ? 'secundario' : 'primario'}
          aria-pressed={postado}
          disabled={!dia.editavel}
          icone={postado ? <Check className="size-4" aria-hidden /> : undefined}
          onClick={() => checkin.alterar((v) => ({ ...v, storyPostado: !postado }), { imediato: true })}
        >
          {postado ? 'Postado' : 'Marcar como postado'}
        </Botao>
      </div>
    </article>
  );
}

/** Carrossel com scroll-snap e pontos indicadores (decorativos; o scroll é nativo). */
export function CarrosselDestaque({ children }: { children: ReactNode[] }) {
  const trilho = useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = useState(0);
  const total = children.filter(Boolean).length;
  return (
    <div className="flex flex-col gap-2.5">
      <div
        ref={trilho}
        onScroll={(e) => {
          const el = e.currentTarget;
          setAtivo(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
        className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      {total > 1 && (
        <div aria-hidden className="flex justify-center gap-1.5">
          {Array.from({ length: total }, (_, i) => (
            <i
              key={i}
              className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ease-saida ${i === ativo ? 'w-[18px] bg-vermelho' : 'w-1.5 bg-borda'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
