/** Formata 'YYYY-MM-DD' sem passar por fuso (evita o "dia anterior" do new Date('YYYY-MM-DD')). */
export function formatarData(iso: string, opcoes: { comDiaSemana?: boolean } = {}): string {
  const [a, m, d] = iso.split('-').map(Number);
  if (!a || !m || !d) return iso;
  const data = new Date(Date.UTC(a, m - 1, d, 12));
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    ...(opcoes.comDiaSemana ? { weekday: 'long' } : {}),
  }).format(data);
}

export function formatarDataCurta(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number);
  if (!a || !m || !d) return iso;
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' }).format(
    new Date(Date.UTC(a, m - 1, d, 12)),
  );
}
