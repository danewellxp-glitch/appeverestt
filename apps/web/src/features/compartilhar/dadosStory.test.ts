import { describe, expect, it } from 'vitest';
import { montarDadosStory, nomeArquivoStory, textoMarcacao } from './dadosStory';
import { pontoNaRota } from './desenhar/modelos';

const progresso = { totalDias: 30, diasConcluidos: 14, sequenciaAtual: 5, melhorSequencia: 9 };
const dia = { numeroDia: 15, aguaMl: 3000, exercicio: true, paginasLidas: 9 };

describe('montarDadosStory', () => {
  it('calcula altitude, fração e hábitos batidos', () => {
    const d = montarDadosStory({
      progresso,
      dia,
      posicao: 2,
      instagramHandle: '@everest',
      hashtag: '#DESAFIO',
    });
    expect(d.altitude).toBe(4129);
    expect(d.fracao).toBeCloseTo(14 / 30);
    expect(d.aguaOk).toBe(true);
    expect(d.leituraOk).toBe(false);
    expect(d.habitosOk).toBe(2);
    expect(d.posicao).toBe(2);
    expect(d.instagramHandle).toBe('everest');
    expect(d.hashtag).toBe('DESAFIO');
  });

  it('dia sem treino e sem nada registrado', () => {
    const d = montarDadosStory({
      progresso: { ...progresso, diasConcluidos: 0, sequenciaAtual: 0 },
      dia: { numeroDia: 1, aguaMl: 0, exercicio: false, paginasLidas: 0 },
    });
    expect(d.habitosOk).toBe(0);
    expect(d.altitude).toBe(0);
    expect(d.posicao).toBeNull();
    expect(textoMarcacao(d)).toBeNull();
  });

  it('limita ao total de dias e chega no cume', () => {
    const d = montarDadosStory({ progresso: { ...progresso, diasConcluidos: 40 }, dia });
    expect(d.diasConcluidos).toBe(30);
    expect(d.altitude).toBe(d.altitudeCume);
    expect(d.fracao).toBe(1);
  });

  it('monta a trilha de dias concluídos', () => {
    const dias = [
      { numeroDia: 1, concluido: true },
      { numeroDia: 2, concluido: false },
      { numeroDia: 3, concluido: true },
      { numeroDia: 99, concluido: true },
    ];
    const d = montarDadosStory({ progresso: { ...progresso, totalDias: 5, dias }, dia });
    expect(d.trilha).toEqual([true, false, true, false, false]);
  });

  it('texto de marcação e nome do arquivo', () => {
    expect(textoMarcacao({ instagramHandle: 'everest', hashtag: 'DESAFIO30' })).toBe(
      '@everest #DESAFIO30',
    );
    expect(textoMarcacao({ instagramHandle: null, hashtag: 'DESAFIO30' })).toBe('#DESAFIO30');
    expect(nomeArquivoStory({ numeroDia: 7 }, 'escalada')).toBe('everest-dia-7-escalada.png');
  });
});

describe('pontoNaRota', () => {
  const rota = [
    [0, 0],
    [1, 0],
    [1, 1],
  ] as const;
  it('começo, meio e fim', () => {
    expect(pontoNaRota(rota, 0)).toMatchObject({ x: 0, y: 0 });
    expect(pontoNaRota(rota, 0.5)).toMatchObject({ x: 1, y: 0 });
    expect(pontoNaRota(rota, 0.75)).toMatchObject({ x: 1, y: 0.5 });
    expect(pontoNaRota(rota, 1)).toMatchObject({ x: 1, y: 1 });
    expect(pontoNaRota(rota, 2)).toMatchObject({ x: 1, y: 1 });
  });
});
