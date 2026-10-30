import type { ItemRankingPosicionado } from '@everest/shared';
import { Shield } from 'lucide-react';

export const TEXTO_CRITERIO =
  'Critério: dias concluídos. Desempate: maior melhor sequência → maior sequência atual → inscrição mais antiga.';

/** Estilo do selo de posição: pódio com cores próprias (texto claro sobre fundo escuro, AA). */
function estiloPosicao(posicao: number): string {
  const base =
    'inline-flex min-w-9 items-center justify-center rounded-lg px-2 py-1 text-sm font-bold tabular-nums';
  switch (posicao) {
    case 1:
      return `${base} border border-aviso-borda bg-aviso-fundo text-aviso-texto`;
    case 2:
      return `${base} border border-borda-campo bg-superficie-2 text-texto`;
    case 3:
      return `${base} border border-orange-400 bg-orange-100 text-orange-900 escuro:border-orange-700 escuro:bg-orange-950 escuro:text-orange-200`;
    default:
      return `${base} text-texto-2`;
  }
}

const MEDALHA: Record<number, string> = { 1: '1º lugar', 2: '2º lugar', 3: '3º lugar' };

export function idLinhaRanking(participanteId: string): string {
  return `ranking-${participanteId}`;
}

export function SeloEmbaixador() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-aviso-borda bg-aviso-fundo px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-aviso-texto">
      <Shield className="size-3" aria-hidden />
      Embaixador
    </span>
  );
}

/**
 * Tabela do ranking: posição, nome de exibição, dias concluídos e melhor sequência.
 * A linha de quem está logado fica destacada e marcada com "Você".
 */
export function TabelaRanking({
  itens,
  meuParticipanteId,
}: {
  itens: ItemRankingPosicionado[];
  meuParticipanteId: string | undefined;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-borda bg-superficie">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">
          Ranking do desafio, ordenado por dias concluídos. {TEXTO_CRITERIO}
        </caption>
        <thead>
          <tr className="border-b border-borda">
            <th scope="col" className="rotulo px-3 py-3">
              Pos.
            </th>
            <th scope="col" className="rotulo px-2 py-3">
              Nome
            </th>
            <th scope="col" className="rotulo px-2 py-3 text-right">
              <abbr title="Dias concluídos" className="no-underline">
                Dias
              </abbr>
            </th>
            <th scope="col" className="rotulo px-3 py-3 text-right">
              <abbr title="Melhor sequência" className="no-underline">
                Melhor seq.
              </abbr>
            </th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => {
            const souEu = item.participanteId === meuParticipanteId;
            return (
              <tr
                key={item.participanteId}
                id={idLinhaRanking(item.participanteId)}
                tabIndex={souEu ? -1 : undefined}
                aria-current={souEu ? 'true' : undefined}
                className={`scroll-mt-24 border-b border-borda last:border-b-0 ${
                  souEu ? 'bg-superficie-2 shadow-[inset_4px_0_0_var(--color-vermelho)]' : ''
                }`}
              >
                <td className="px-3 py-3">
                  <span className={estiloPosicao(item.posicao)}>
                    {item.posicao}º
                    {MEDALHA[item.posicao] && (
                      <span className="sr-only"> ({MEDALHA[item.posicao]})</span>
                    )}
                  </span>
                </td>
                <th scope="row" className="px-2 py-3 font-semibold">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className={souEu ? 'font-bold text-texto' : 'text-texto'}>
                      {item.nomeExibicao}
                    </span>
                    {souEu && (
                      <span className="rounded-md border border-vermelho-texto px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-vermelho-texto">
                        Você
                      </span>
                    )}
                    {item.ehEmbaixador && <SeloEmbaixador />}
                  </span>
                </th>
                <td className="px-2 py-3 text-right text-base font-bold tabular-nums">
                  {item.diasConcluidos}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-texto-2">
                  {item.melhorSequencia}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
