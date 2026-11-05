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

/** Fração da escalada (0–1) de quem concluiu `dias` de `totalDias`. */
export function fracaoDaEscalada(dias: number, totalDias = TOTAL_DIAS_PADRAO): number {
  if (totalDias <= 0) return 0;
  return Math.max(0, Math.min(1, dias / totalDias));
}

export interface GrupoAltitude<P> {
  diasConcluidos: number;
  altitude: number;
  fracao: number;
  pessoas: P[];
}

/**
 * Agrupa participantes pela altitude (mesmos dias concluídos = mesma bolha na montanha da turma),
 * do cume para a base. Dentro do grupo a ordem de entrada é mantida (o ranking já vem ordenado).
 */
export function agruparPorAltitude<P extends { diasConcluidos: number }>(
  itens: readonly P[],
  totalDias = TOTAL_DIAS_PADRAO,
): GrupoAltitude<P>[] {
  const porDias = new Map<number, P[]>();
  for (const item of itens) {
    const dias = Math.max(0, Math.min(item.diasConcluidos, Math.max(totalDias, 0)));
    const lista = porDias.get(dias);
    if (lista) lista.push(item);
    else porDias.set(dias, [item]);
  }
  return [...porDias.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([diasConcluidos, pessoas]) => ({
      diasConcluidos,
      altitude: altitudeSimbolica(diasConcluidos, totalDias),
      fracao: fracaoDaEscalada(diasConcluidos, totalDias),
      pessoas,
    }));
}
