import type { DiaResumo } from '@everest/shared';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { GridDias } from './GridDias';

afterEach(cleanup);

function dia(numeroDia: number, extra: Partial<DiaResumo> = {}): DiaResumo {
  return {
    numeroDia,
    data: `2026-11-0${numeroDia}`,
    situacao: 'CONCLUIDO',
    concluido: true,
    invalidado: false,
    ...extra,
  };
}

describe('GridDias', () => {
  it('usa a foto do treino como fundo do dia concluído', () => {
    render(<GridDias dias={[dia(1, { fotoTreinoUrl: 'https://s/thumb1.webp' }), dia(2)]} />);
    const comFoto = screen.getByRole('img', { name: /Dia 1/ });
    expect(comFoto.querySelector('img')?.getAttribute('src')).toBe('https://s/thumb1.webp');
    expect(screen.getByRole('img', { name: /Dia 2/ }).querySelector('img')).toBeNull();
  });

  it('volta ao vermelho se a foto não carregar', () => {
    render(<GridDias dias={[dia(1, { fotoTreinoUrl: 'https://s/expirada.webp' })]} />);
    const celula = screen.getByRole('img', { name: /Dia 1/ });
    fireEvent.error(celula.querySelector('img')!);
    expect(celula.querySelector('img')).toBeNull();
    expect(celula.querySelector('[data-veu]')).toBeNull();
    expect(celula.className).toContain('bg-vermelho');
  });
});
