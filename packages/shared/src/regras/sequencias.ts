/** Maior sequência de dias concluídos consecutivos. */
export function calcularMelhorSequencia(concluidos: readonly boolean[]): number {
  let melhor = 0;
  let atual = 0;
  for (const c of concluidos) {
    atual = c ? atual + 1 : 0;
    if (atual > melhor) melhor = atual;
  }
  return melhor;
}

/**
 * Sequência que termina no dia atual (1-based). `concluidos[i]` é o dia i+1.
 * Se o dia atual ainda não foi concluído, conta a partir de ontem:
 * a sequência não quebra antes do dia acabar.
 */
export function calcularSequenciaAtual(concluidos: readonly boolean[], diaAtual: number): number {
  if (diaAtual < 1) return 0;
  let i = diaAtual - 1;
  if (!concluidos[i]) i -= 1;
  let seq = 0;
  while (i >= 0 && concluidos[i]) {
    seq += 1;
    i -= 1;
  }
  return seq;
}
