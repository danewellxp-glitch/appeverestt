import { TOTAL_DIAS_PADRAO } from '../constantes';

/** Altura do Everest: o cume da escalada simbólica (X6). */
export const ALTITUDE_CUME = 8848;

/** Metros ganhos por dia concluído (295 m para 30 dias). */
export function METROS_POR_DIA(totalDias = TOTAL_DIAS_PADRAO): number {
  if (totalDias <= 0) return 0;
  return Math.round(ALTITUDE_CUME / totalDias);
}

/** Altitude (m) proporcional aos dias concluídos. Dia perdido não desce, só não sobe. */
export function altitudeSimbolica(dias: number, totalDias = TOTAL_DIAS_PADRAO): number {
  if (totalDias <= 0) return 0;
  const limitado = Math.max(0, Math.min(dias, totalDias));
  return Math.round((limitado / totalDias) * ALTITUDE_CUME);
}
