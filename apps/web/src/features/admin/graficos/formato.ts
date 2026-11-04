import type { Requisito } from '@everest/shared';
import { TIMEZONE_PADRAO } from '@everest/shared';

const INTEIRO = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const UMA_CASA = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const COMPACTO = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

/** 1234 → "1.234". */
export function formatarInteiro(n: number): string {
  return INTEIRO.format(n);
}

/** 4.25 → "4,3" (uma casa). */
export function formatarDecimal(n: number): string {
  return UMA_CASA.format(n);
}

/** Abaixo de 10 mil por extenso; acima, compacto ("12,5 mil"). */
export function formatarCompacto(n: number): string {
  return Math.abs(n) < 10_000 ? INTEIRO.format(n) : COMPACTO.format(n);
}

/** 0–100 → "62%"; acima de 0 e abaixo de 1 → "<1%"; null → "—". */
export function formatarPct(pct: number | null): string {
  if (pct === null || !Number.isFinite(pct)) return '—';
  if (pct > 0 && pct < 1) return '<1%';
  if (pct < 100 && pct > 99) return '99%';
  return `${INTEIRO.format(Math.round(pct))}%`;
}

/** Duração em horas → "35 min", "5 h", "1 dia e 4 h", "3 dias". */
export function formatarDuracaoHoras(horas: number | null): string {
  if (horas === null || !Number.isFinite(horas) || horas < 0) return '—';
  const minutos = Math.round(horas * 60);
  if (minutos < 1) return 'menos de 1 min';
  if (minutos < 60) return `${minutos} min`;
  const h = Math.round(horas);
  if (h < 24) return `${h} h`;
  const dias = Math.floor(h / 24);
  const resto = h % 24;
  const rotuloDias = `${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  return resto === 0 ? rotuloDias : `${rotuloDias} e ${resto} h`;
}

const REAIS_INTEIROS = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const REAIS = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Centavos → "R$ 1.750" (valor redondo) ou "R$ 1.750,50". */
export function formatarReaisCurto(centavos: number): string {
  return centavos % 100 === 0
    ? REAIS_INTEIROS.format(centavos / 100)
    : REAIS.format(centavos / 100);
}

/** 0–23 → "21h". */
export function formatarHora(hora: number): string {
  return `${hora}h`;
}

/** Plural simples: (1, 'dia') → "1 dia"; (3, 'dia') → "3 dias". */
export function plural(n: number, singular: string, pluralForma = `${singular}s`): string {
  return `${formatarInteiro(n)} ${n === 1 ? singular : pluralForma}`;
}

export const ROTULO_REQUISITO: Record<Requisito, string> = {
  AGUA: 'Água',
  EXERCICIO: 'Exercício',
  LEITURA: 'Leitura',
  FOTOS: 'Fotos',
  STORY: 'Story',
};

const HORA_MINUTO = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TIMEZONE_PADRAO,
});

/** ISO 8601 → "14:05" no fuso do desafio. */
export function formatarHoraMinuto(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : HORA_MINUTO.format(d);
}
