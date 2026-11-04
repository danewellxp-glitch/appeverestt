import type { FotoParecida } from '@everest/shared';
import { describe, expect, it } from 'vitest';
import { descreverParecida, listarDias } from './fotoParecida';

const BASE: FotoParecida = {
  participanteId: 'p2',
  nome: 'maria souza lima',
  numeroDia: 3,
  tipo: 'AGUA',
  mesmaPessoa: false,
};

describe('descreverParecida', () => {
  it('outra pessoa: nome curto, dia e tipo', () => {
    expect(descreverParecida(BASE, 5)).toEqual({
      texto: 'Parecida com a foto de Maria L. · dia 3 · água',
      mesmoDia: false,
    });
  });

  it('mesma pessoa em outro dia', () => {
    expect(descreverParecida({ ...BASE, mesmaPessoa: true, tipo: 'EXERCICIO' }, 5)).toEqual({
      texto: 'Parecida com outra foto desta pessoa · dia 3 · exercício',
      mesmoDia: false,
    });
  });

  it('mesma pessoa no mesmo dia: sem link', () => {
    expect(descreverParecida({ ...BASE, mesmaPessoa: true, tipo: 'LEITURA' }, 3)).toEqual({
      texto: 'Parecida com a foto de leitura deste mesmo dia',
      mesmoDia: true,
    });
  });

  it('outra pessoa no mesmo número de dia continua com link', () => {
    expect(descreverParecida(BASE, 3).mesmoDia).toBe(false);
  });
});

describe('listarDias', () => {
  it('um, dois ou vários dias', () => {
    expect(listarDias([3])).toBe('dia 3');
    expect(listarDias([3, 5])).toBe('dias 3 e 5');
    expect(listarDias([2, 3, 5])).toBe('dias 2, 3 e 5');
  });
});
