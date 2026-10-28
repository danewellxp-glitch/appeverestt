import { describe, expect, it } from 'vitest';
import { calcularConcluido, requisitosPendentes, type RegistroDia } from '../regras/conclusao';

const completo: RegistroDia = {
  aguaMl: 3000,
  exercicio: true,
  paginasLidas: 10,
  fotosValidas: ['AGUA', 'EXERCICIO', 'LEITURA'],
  storyPostado: true,
};

describe('calcularConcluido', () => {
  it('conclui com tudo cumprido', () => {
    expect(calcularConcluido(completo)).toBe(true);
  });

  it('2999 ml não conclui; 3000 ml conclui', () => {
    expect(calcularConcluido({ ...completo, aguaMl: 2999 })).toBe(false);
    expect(calcularConcluido({ ...completo, aguaMl: 3000 })).toBe(true);
  });

  it('9 páginas não conclui; 10 conclui', () => {
    expect(calcularConcluido({ ...completo, paginasLidas: 9 })).toBe(false);
    expect(calcularConcluido({ ...completo, paginasLidas: 10 })).toBe(true);
  });

  it('2 fotos não conclui', () => {
    expect(calcularConcluido({ ...completo, fotosValidas: ['AGUA', 'LEITURA'] })).toBe(false);
  });

  it('tipos repetidos não contam como 3 fotos', () => {
    expect(calcularConcluido({ ...completo, fotosValidas: ['AGUA', 'AGUA', 'LEITURA'] })).toBe(
      false,
    );
  });

  it('sem exercício ou sem story não conclui', () => {
    expect(calcularConcluido({ ...completo, exercicio: false })).toBe(false);
    expect(calcularConcluido({ ...completo, storyPostado: false })).toBe(false);
  });

  it('invalidado nunca conclui, mesmo com tudo cumprido', () => {
    expect(calcularConcluido({ ...completo, invalidado: true })).toBe(false);
  });
});

describe('requisitosPendentes', () => {
  it('retorna vazio quando tudo foi cumprido', () => {
    expect(requisitosPendentes(completo)).toEqual([]);
  });

  it('retorna exatamente o que falta', () => {
    expect(
      requisitosPendentes({
        aguaMl: 0,
        exercicio: false,
        paginasLidas: 0,
        fotosValidas: [],
        storyPostado: false,
      }),
    ).toEqual(['AGUA', 'EXERCICIO', 'LEITURA', 'FOTOS', 'STORY']);

    expect(requisitosPendentes({ ...completo, aguaMl: 2500, storyPostado: false })).toEqual([
      'AGUA',
      'STORY',
    ]);

    expect(
      requisitosPendentes({ ...completo, paginasLidas: 3, fotosValidas: ['AGUA', 'AGUA', 'LEITURA'] }),
    ).toEqual(['LEITURA', 'FOTOS']);
  });
});
