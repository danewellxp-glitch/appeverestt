import type { ItemRankingPosicionado } from '@everest/shared';

/** Qual critério separa duas pessoas com os mesmos dias concluídos (Q5). */
function criterioDesempate(a: ItemRankingPosicionado, b: ItemRankingPosicionado): string {
  if (a.melhorSequencia !== b.melhorSequencia) return 'melhor sequência';
  if (a.sequenciaAtual !== b.sequenciaAtual) return 'sequência atual';
  return 'inscrição mais antiga';
}

/**
 * Frase do card "Sua posição" (docs/FRONTEND.md §9.7):
 * 1º → lidera; empate em dias → quem passa e por qual critério; senão → quem está à frente e por quanto.
 */
export function fraseSuaPosicao(itens: readonly ItemRankingPosicionado[], meuId: string): string {
  const i = itens.findIndex((x) => x.participanteId === meuId);
  const eu = itens[i];
  if (!eu) return '';
  if (i === 0) return 'Você lidera o desafio.';
  const acima = itens[i - 1];
  const abaixo = itens[i + 1];
  if (abaixo && abaixo.diasConcluidos === eu.diasConcluidos && (!acima || acima.diasConcluidos !== eu.diasConcluidos)) {
    return `Empate em dias com ${abaixo.nomeExibicao}; você fica à frente pela ${criterioDesempate(eu, abaixo)}.`;
  }
  if (!acima) return '';
  if (acima.diasConcluidos === eu.diasConcluidos) {
    return `Empate em dias com ${acima.nomeExibicao}; ${acima.nomeExibicao} fica à frente pela ${criterioDesempate(acima, eu)}.`;
  }
  const diferenca = acima.diasConcluidos - eu.diasConcluidos;
  return `${acima.nomeExibicao} está ${diferenca} ${diferenca === 1 ? 'dia' : 'dias'} à frente.`;
}
