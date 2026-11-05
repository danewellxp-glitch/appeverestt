/** Sub-abas do hub da turma em /ranking (R23, D1): `?aba=` na URL; sem parâmetro = ranking. */
export const ABAS_RANKING = ['ranking', 'montanha', 'hoje', 'treinos'] as const;
export type AbaRanking = (typeof ABAS_RANKING)[number];

/** Lê o `?aba=`; ausente ou inválido cai no ranking. */
export function lerAba(valor: string | null | undefined): AbaRanking {
  return (ABAS_RANKING as readonly string[]).includes(valor ?? '') ? (valor as AbaRanking) : 'ranking';
}

/** Caminho de uma sub-aba ("/ranking" para a padrão). */
export function caminhoDaAba(aba: AbaRanking): string {
  return aba === 'ranking' ? '/ranking' : `/ranking?aba=${aba}`;
}
