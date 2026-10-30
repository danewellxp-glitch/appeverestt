export interface ItemRanking {
  participanteId: string;
  nomeExibicao: string;
  ehEmbaixador: boolean;
  diasConcluidos: number;
  melhorSequencia: number;
  sequenciaAtual: number;
  /** ISO 8601. */
  dataInscricao: string;
  /** Foto do Google (null sem foto ou conta excluída). Opcional para quem só ordena. */
  fotoUrl?: string | null;
}

export type ItemRankingPosicionado = ItemRanking & { posicao: number };

/**
 * Critério (Q4): mais dias concluídos e não invalidados.
 * Desempate (Q5): 1) maior melhor sequência → 2) maior sequência atual → 3) inscrição mais antiga.
 */
export function compararRanking(a: ItemRanking, b: ItemRanking): number {
  if (a.diasConcluidos !== b.diasConcluidos) return b.diasConcluidos - a.diasConcluidos;
  if (a.melhorSequencia !== b.melhorSequencia) return b.melhorSequencia - a.melhorSequencia;
  if (a.sequenciaAtual !== b.sequenciaAtual) return b.sequenciaAtual - a.sequenciaAtual;
  const ta = Date.parse(a.dataInscricao);
  const tb = Date.parse(b.dataInscricao);
  if (ta !== tb) return ta - tb;
  return a.participanteId.localeCompare(b.participanteId);
}

export function ordenarRanking(itens: readonly ItemRanking[]): ItemRankingPosicionado[] {
  return [...itens].sort(compararRanking).map((item, i) => ({ ...item, posicao: i + 1 }));
}

function capitalizar(palavra: string): string {
  const minusculo = palavra.toLocaleLowerCase('pt-BR');
  return minusculo.charAt(0).toLocaleUpperCase('pt-BR') + minusculo.slice(1);
}

/** "Maria Souza Lima" -> "Maria L."; "Ana" -> "Ana". */
export function nomeExibicao(nomeCompleto: string): string {
  const partes = nomeCompleto.trim().split(/\s+/).filter(Boolean);
  const primeiro = partes[0];
  if (!primeiro) return '';
  const ultimo = partes.length > 1 ? partes[partes.length - 1] : undefined;
  if (!ultimo) return capitalizar(primeiro);
  return `${capitalizar(primeiro)} ${ultimo.charAt(0).toLocaleUpperCase('pt-BR')}.`;
}

/** Iniciais para avatar sem foto: "Maria Souza Lima" -> "ML"; "Ana" -> "A". */
export function iniciais(nomeCompleto: string): string {
  const partes = nomeCompleto.trim().split(/\s+/).filter(Boolean);
  const primeiro = partes[0];
  if (!primeiro) return '';
  const ultimo = partes.length > 1 ? partes[partes.length - 1] : undefined;
  const letra = (p: string) => p.charAt(0).toLocaleUpperCase('pt-BR');
  return ultimo ? `${letra(primeiro)}${letra(ultimo)}` : letra(primeiro);
}
