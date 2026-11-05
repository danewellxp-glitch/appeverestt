import { TIMEZONE_PADRAO } from '@everest/shared';

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

/** 'YYYY-MM-DD' → "qua, 19/11" (eyebrow do topo da home e do dia). */
export function formatarDiaCurto(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number);
  if (!a || !m || !d) return iso;
  const data = new Date(Date.UTC(a, m - 1, d, 12));
  const semana = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', weekday: 'short' }).format(data).replace('.', '');
  return `${semana}, ${formatarDataCurta(iso)}`;
}

const RELATIVO = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'always' });

/**
 * ISO 8601 → "há 5 minutos", "há 2 horas", "há 3 dias" (menos de 1 minuto: "agora há pouco").
 * `agora` é parâmetro para os testes serem determinísticos.
 */
export function tempoRelativo(iso: string, agora: number = Date.now()): string {
  const momento = new Date(iso).getTime();
  if (Number.isNaN(momento)) return '';
  const minutos = Math.floor(Math.max(0, agora - momento) / 60_000);
  if (minutos < 1) return 'agora há pouco';
  if (minutos < 60) return RELATIVO.format(-minutos, 'minute');
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return RELATIVO.format(-horas, 'hour');
  return RELATIVO.format(-Math.floor(horas / 24), 'day');
}

/** ISO 8601 → "07:42" no fuso do desafio (padrão: Brasília). */
export function formatarHora(iso: string, timezone: string = TIMEZONE_PADRAO): string {
  const momento = new Date(iso);
  if (Number.isNaN(momento.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, hour: '2-digit', minute: '2-digit' }).format(momento);
}
