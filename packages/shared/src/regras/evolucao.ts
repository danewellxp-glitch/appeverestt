import { TOTAL_DIAS_PADRAO } from '../constantes';

/** Percentual inteiro (0–100) de dias concluídos. */
export function calcularEvolucao(diasConcluidos: number, totalDias = TOTAL_DIAS_PADRAO): number {
  if (totalDias <= 0) return 0;
  const pct = Math.round((diasConcluidos / totalDias) * 100);
  return Math.max(0, Math.min(100, pct));
}
