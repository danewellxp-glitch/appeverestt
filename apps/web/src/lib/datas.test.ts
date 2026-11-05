import { describe, expect, it } from 'vitest';
import { formatarHora } from './datas';

describe('formatarHora', () => {
  it('converte o ISO para a hora no fuso do desafio', () => {
    expect(formatarHora('2026-11-05T10:42:00.000Z')).toBe('07:42');
    expect(formatarHora('2026-11-05T10:42:00.000Z', 'UTC')).toBe('10:42');
  });

  it('ISO inválido vira texto vazio', () => {
    expect(formatarHora('xpto')).toBe('');
  });
});
