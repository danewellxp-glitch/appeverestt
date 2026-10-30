import type { ItemRankingPosicionado } from '@everest/shared';
import { describe, expect, it } from 'vitest';
import { fraseSuaPosicao } from './fraseRanking';

function item(id: string, posicao: number, dias: number, melhor = 0, atual = 0): ItemRankingPosicionado {
  return {
    participanteId: id,
    nomeExibicao: `${id.toUpperCase()} S.`,
    ehEmbaixador: false,
    diasConcluidos: dias,
    melhorSequencia: melhor,
    sequenciaAtual: atual,
    dataInscricao: '2026-10-01T12:00:00.000Z',
    posicao,
  };
}

describe('fraseSuaPosicao', () => {
  it('1º lugar lidera', () => {
    expect(fraseSuaPosicao([item('eu', 1, 9), item('b', 2, 8)], 'eu')).toBe('Você lidera o desafio.');
  });

  it('sem empate: quem está logo acima e por quantos dias', () => {
    expect(fraseSuaPosicao([item('a', 1, 9), item('eu', 2, 7)], 'eu')).toBe('A S. está 2 dias à frente.');
    expect(fraseSuaPosicao([item('a', 1, 8), item('eu', 2, 7)], 'eu')).toBe('A S. está 1 dia à frente.');
  });

  it('empate em dias com quem está abaixo: você passa pelo critério', () => {
    const lista = [item('a', 1, 9), item('eu', 2, 7, 4), item('c', 3, 7, 3)];
    expect(fraseSuaPosicao(lista, 'eu')).toBe('Empate em dias com C S.; você fica à frente pela melhor sequência.');
  });

  it('empate em dias com quem está acima: quem passa e por quê', () => {
    const lista = [item('a', 1, 7, 3, 3), item('eu', 2, 7, 3, 1)];
    expect(fraseSuaPosicao(lista, 'eu')).toBe('Empate em dias com A S.; A S. fica à frente pela sequência atual.');
  });
});
