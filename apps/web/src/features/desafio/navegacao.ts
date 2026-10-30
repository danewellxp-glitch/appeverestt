/** Rota do check-in de um dia (docs/FRONTEND.md §3). */
export function caminhoDoDia(numeroDia: number): string {
  return `/desafio/dia/${numeroDia}`;
}

/** Baixa o chunk da tela do dia antes da navegação (a View Transition captura a tela já pronta). */
export function preCarregarDia(): void {
  void import('../../pages/Dia');
}

export function preCarregarRanking(): void {
  void import('../../pages/Ranking');
}

/** Copia para a área de transferência. false = não deu (contexto inseguro, permissão negada). */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    if (typeof navigator.clipboard?.writeText !== 'function') return false;
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}
