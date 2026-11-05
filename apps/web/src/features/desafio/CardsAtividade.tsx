import type { FeedResposta } from '@everest/shared';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router';
import { PilhaAvatares } from '../../components/ui/Avatar';
import { Barra } from '../../components/ui/Barra';
import { Contador } from '../../components/ui/Contador';
import { abrirComTransformacao } from '../../lib/transicoes';
import { caminhoDaAba } from '../ranking/abas';
import { preCarregarRanking } from './navegacao';

/** Dois cards "pop": quem fechou o dia (abre a aba Hoje do ranking com `abrir-ranking`) e as vagas preenchidas. */
export function CardsAtividade({ feed }: { feed: FeedResposta }) {
  const navegar = useNavigate();
  const restantes = Math.max(0, feed.totalVagas - feed.vagasOcupadas);
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onPointerDown={preCarregarRanking}
        onClick={(e) =>
          abrirComTransformacao(e.currentTarget, 'abrir-ranking', () =>
            void navegar(caminhoDaAba('hoje'), { viewTransition: true, state: { vt: 'abrir-ranking' } }),
          )
        }
        className="press relative grid min-w-0 content-start gap-2 rounded-[28px] bg-pop p-4 text-left text-pop-texto"
      >
        <span className="sr-only">Ver quem fechou o dia.</span>
        <Contador valor={feed.fecharamHoje} className="font-display text-[52px] leading-[0.9] font-extrabold" />
        <span className="text-[13px]">{feed.fecharamHoje === 1 ? 'pessoa fechou o dia hoje' : 'pessoas fecharam o dia hoje'}</span>
        {feed.avataresHoje.length > 0 && (
          <PilhaAvatares pessoas={feed.avataresHoje.map((p) => ({ nome: p.nomeExibicao, fotoUrl: p.fotoUrl }))} />
        )}
        {feed.maiorSequenciaAtiva && (
          <span className="text-xs text-pop-texto-2">maior sequência: {feed.maiorSequenciaAtiva.dias} dias</span>
        )}
        <span aria-hidden className="mt-1 grid size-9 place-items-center rounded-full bg-pop-texto text-pop">
          <ArrowRight className="size-4" />
        </span>
      </button>
      <div className="grid min-w-0 content-start gap-2 rounded-[28px] bg-pop p-4 text-pop-texto">
        <Contador valor={feed.vagasOcupadas} className="font-display text-[52px] leading-[0.9] font-extrabold" />
        <span className="text-[13px]">de {feed.totalVagas} vagas preenchidas</span>
        <Barra valor={feed.vagasOcupadas} maximo={feed.totalVagas} rotulo="Vagas preenchidas" tom="pop" />
        <span className="text-xs text-pop-texto-2">
          {restantes} {restantes === 1 ? 'vaga restante' : 'vagas restantes'}
        </span>
      </div>
    </div>
  );
}
