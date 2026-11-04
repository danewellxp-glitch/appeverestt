import { describe, expect, it } from 'vitest';
import {
  formatarCompacto,
  formatarDecimal,
  formatarDuracaoHoras,
  formatarHoraMinuto,
  formatarPct,
  formatarReaisCurto,
  plural,
} from './formato';

describe('formatarPct', () => {
  it('arredonda e trata as pontas', () => {
    expect(formatarPct(62.4)).toBe('62%');
    expect(formatarPct(0)).toBe('0%');
    expect(formatarPct(0.3)).toBe('<1%');
    expect(formatarPct(99.6)).toBe('99%');
    expect(formatarPct(100)).toBe('100%');
    expect(formatarPct(null)).toBe('—');
  });
});

describe('formatarDuracaoHoras', () => {
  it('minutos, horas e dias', () => {
    expect(formatarDuracaoHoras(0.004)).toBe('menos de 1 min');
    expect(formatarDuracaoHoras(0.5)).toBe('30 min');
    expect(formatarDuracaoHoras(5.2)).toBe('5 h');
    expect(formatarDuracaoHoras(24)).toBe('1 dia');
    expect(formatarDuracaoHoras(28)).toBe('1 dia e 4 h');
    expect(formatarDuracaoHoras(72.2)).toBe('3 dias');
    expect(formatarDuracaoHoras(null)).toBe('—');
  });
});

describe('números', () => {
  it('compacto só a partir de 10 mil', () => {
    expect(formatarCompacto(9876)).toBe('9.876');
    expect(formatarCompacto(12_500)).toMatch(/^12,5\s?mil$/);
  });

  it('decimal com vírgula e plural', () => {
    expect(formatarDecimal(4.25)).toBe('4,3');
    expect(formatarDecimal(4)).toBe('4,0');
    expect(plural(1, 'dia')).toBe('1 dia');
    expect(plural(1200, 'página')).toBe('1.200 páginas');
  });

  it('reais sem centavos quando o valor é redondo', () => {
    expect(formatarReaisCurto(175_000)).toMatch(/^R\$\s1\.750$/);
    expect(formatarReaisCurto(175_050)).toMatch(/^R\$\s1\.750,50$/);
  });

  it('hora no fuso do desafio', () => {
    expect(formatarHoraMinuto('2026-10-30T17:05:00.000Z')).toBe('14:05');
    expect(formatarHoraMinuto('x')).toBe('');
  });
});
