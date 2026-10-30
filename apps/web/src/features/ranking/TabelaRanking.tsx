import type { ItemRankingPosicionado } from '@everest/shared';
import { Avatar } from '../../components/ui/Avatar';

export const TEXTO_CRITERIO =
  'Ordem: dias concluídos, depois melhor sequência, depois sequência atual, depois inscrição mais antiga. Dias invalidados pelo embaixador não contam.';

export function idLinhaRanking(participanteId: string): string {
  return `ranking-${participanteId}`;
}

/** Selo "Embaixador" (pílula vermelha pequena). */
export function SeloEmbaixador() {
  return (
    <span className="inline-flex items-center rounded-full bg-vermelho px-[7px] py-[3px] text-[10px] font-bold tracking-[0.08em] text-sobre-vermelho uppercase">
      Embaixador
    </span>
  );
}

/**
 * Lista do ranking: posição (vermelha no pódio), avatar, nome (ou "Você"), sequências e dias.
 * A linha de quem está logado tem anel vermelho e recebe foco/scroll.
 */
export function ListaRanking({
  itens,
  meuParticipanteId,
}: {
  itens: readonly ItemRankingPosicionado[];
  meuParticipanteId: string | undefined;
}) {
  return (
    <ol className="grid gap-2" aria-label={`Ranking. ${TEXTO_CRITERIO}`}>
      {itens.map((item) => {
        const souEu = item.participanteId === meuParticipanteId;
        const podio = item.posicao <= 3;
        return (
          <li
            key={item.participanteId}
            id={idLinhaRanking(item.participanteId)}
            tabIndex={souEu ? -1 : undefined}
            aria-current={souEu ? 'true' : undefined}
            className={`flex scroll-mt-24 scroll-mb-28 items-center gap-3 rounded-[20px] bg-superficie py-2.5 pr-3.5 pl-2.5 ${souEu ? 'shadow-[inset_0_0_0_2px_var(--vermelho)]' : 'shadow-[inset_0_0_0_1px_var(--borda)]'}`}
          >
            <span
              className={`w-7 shrink-0 text-center font-display text-[22px] font-extrabold tabular-nums ${podio ? 'text-vermelho-texto' : 'text-texto-2'}`}
            >
              {item.posicao}
              <span className="sr-only">º lugar</span>
            </span>
            <Avatar nome={item.nomeExibicao} fotoUrl={item.fotoUrl} />
            <span className="grid min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5 font-semibold">
                {souEu ? 'Você' : item.nomeExibicao}
                {item.ehEmbaixador && <SeloEmbaixador />}
              </span>
              <small className="text-xs text-texto-2">
                melhor sequência {item.melhorSequencia} · atual {item.sequenciaAtual}
              </small>
            </span>
            <span className="grid text-right">
              <b className="font-display text-[26px] leading-none font-extrabold tabular-nums">{item.diasConcluidos}</b>
              <small className="text-[11px] text-texto-2">{item.diasConcluidos === 1 ? 'dia' : 'dias'}</small>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
