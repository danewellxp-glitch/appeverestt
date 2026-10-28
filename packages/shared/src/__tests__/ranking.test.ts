import { describe, expect, it } from 'vitest';
import { nomeExibicao, ordenarRanking, type ItemRanking } from '../regras/ranking';

function item(id: string, parcial: Partial<ItemRanking>): ItemRanking {
  return {
    participanteId: id,
    nomeExibicao: id,
    ehEmbaixador: false,
    diasConcluidos: 0,
    melhorSequencia: 0,
    sequenciaAtual: 0,
    dataInscricao: '2026-10-01T12:00:00.000Z',
    ...parcial,
  };
}

describe('ordenarRanking', () => {
  it('ordena por dias concluídos (desc)', () => {
    const r = ordenarRanking([item('a', { diasConcluidos: 2 }), item('b', { diasConcluidos: 5 })]);
    expect(r.map((i) => i.participanteId)).toEqual(['b', 'a']);
    expect(r.map((i) => i.posicao)).toEqual([1, 2]);
  });

  it('desempate 1: maior melhor sequência', () => {
    const r = ordenarRanking([
      item('a', { diasConcluidos: 5, melhorSequencia: 2, sequenciaAtual: 9 }),
      item('b', { diasConcluidos: 5, melhorSequencia: 4, sequenciaAtual: 0 }),
    ]);
    expect(r.map((i) => i.participanteId)).toEqual(['b', 'a']);
  });

  it('desempate 2: maior sequência atual', () => {
    const r = ordenarRanking([
      item('a', { diasConcluidos: 5, melhorSequencia: 4, sequenciaAtual: 1 }),
      item('b', { diasConcluidos: 5, melhorSequencia: 4, sequenciaAtual: 3 }),
    ]);
    expect(r.map((i) => i.participanteId)).toEqual(['b', 'a']);
  });

  it('desempate 3: inscrição mais antiga', () => {
    const r = ordenarRanking([
      item('a', { diasConcluidos: 5, melhorSequencia: 4, sequenciaAtual: 3, dataInscricao: '2026-10-02T00:00:00.000Z' }),
      item('b', { diasConcluidos: 5, melhorSequencia: 4, sequenciaAtual: 3, dataInscricao: '2026-10-01T00:00:00.000Z' }),
    ]);
    expect(r.map((i) => i.participanteId)).toEqual(['b', 'a']);
  });

  it('aplica os critérios na ordem certa (dias > melhor seq > seq atual > inscrição)', () => {
    const r = ordenarRanking([
      item('velho', { diasConcluidos: 3, melhorSequencia: 3, sequenciaAtual: 3, dataInscricao: '2026-01-01T00:00:00.000Z' }),
      item('mais-dias', { diasConcluidos: 4, melhorSequencia: 1, sequenciaAtual: 0, dataInscricao: '2026-10-09T00:00:00.000Z' }),
      item('seq-atual', { diasConcluidos: 3, melhorSequencia: 3, sequenciaAtual: 4, dataInscricao: '2026-10-09T00:00:00.000Z' }),
      item('melhor-seq', { diasConcluidos: 3, melhorSequencia: 5, sequenciaAtual: 0, dataInscricao: '2026-10-09T00:00:00.000Z' }),
    ]);
    expect(r.map((i) => i.participanteId)).toEqual(['mais-dias', 'melhor-seq', 'seq-atual', 'velho']);
  });

  it('não altera o array original', () => {
    const original = [item('a', { diasConcluidos: 1 }), item('b', { diasConcluidos: 2 })];
    ordenarRanking(original);
    expect(original.map((i) => i.participanteId)).toEqual(['a', 'b']);
  });
});

describe('nomeExibicao', () => {
  it('"Ana" → "Ana"', () => {
    expect(nomeExibicao('Ana')).toBe('Ana');
  });
  it('"  maria  souza " → "Maria S."', () => {
    expect(nomeExibicao('  maria  souza ')).toBe('Maria S.');
  });
  it('"Maria Souza Lima" → "Maria L."', () => {
    expect(nomeExibicao('Maria Souza Lima')).toBe('Maria L.');
  });
  it('acentos', () => {
    expect(nomeExibicao('ÉRICA ávila')).toBe('Érica Á.');
  });
  it('vazio → vazio', () => {
    expect(nomeExibicao('   ')).toBe('');
  });
});
