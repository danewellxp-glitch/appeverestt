import { LIMITES, METAS, type CheckinInput } from '@everest/shared';
import { describe, expect, it } from 'vitest';
import { ACOES_RAPIDAS, AGUA_POR_ACAO_ML, aplicarAcaoRapida, lerAcaoRapida, urlDaAcaoRapida } from './acaoRapida';
import { destinoDeHoje } from './RedirecionarHoje';

const base: CheckinInput = { aguaMl: 0, exercicio: false, paginasLidas: 0, storyPostado: false };

describe('lerAcaoRapida', () => {
  it('reconhece as três ações e ignora o resto', () => {
    for (const acao of ACOES_RAPIDAS) expect(lerAcaoRapida(new URLSearchParams({ acao }))).toBe(acao);
    expect(lerAcaoRapida(new URLSearchParams())).toBeNull();
    expect(lerAcaoRapida(new URLSearchParams({ acao: 'story' }))).toBeNull();
    expect(lerAcaoRapida(new URLSearchParams({ acao: 'AGUA' }))).toBeNull();
  });

  it('a URL gerada para cada ação é lida de volta', () => {
    for (const acao of ACOES_RAPIDAS) {
      const url = new URL(urlDaAcaoRapida(acao), 'https://app.test');
      expect(url.pathname).toBe('/hoje');
      expect(lerAcaoRapida(url.searchParams)).toBe(acao);
    }
  });
});

describe('aplicarAcaoRapida', () => {
  it('agua soma 250 ml sem mexer no resto', () => {
    const r = aplicarAcaoRapida('agua', { ...base, aguaMl: 500 });
    expect(r.valores).toEqual({ ...base, aguaMl: 500 + AGUA_POR_ACAO_ML });
    expect(r.mudou).toBe(true);
    expect(r.mensagem).toContain('+250 ml');
  });

  it('agua avisa quando bate a meta e respeita o máximo do dia', () => {
    expect(aplicarAcaoRapida('agua', { ...base, aguaMl: METAS.aguaMl - 250 }).mensagem).toContain('Meta de água batida');
    const noMaximo = aplicarAcaoRapida('agua', { ...base, aguaMl: LIMITES.aguaMlMax });
    expect(noMaximo.valores.aguaMl).toBe(LIMITES.aguaMlMax);
    expect(noMaximo.mudou).toBe(false);
  });

  it('treino marca o exercício e é idempotente', () => {
    const r = aplicarAcaoRapida('treino', base);
    expect(r.valores.exercicio).toBe(true);
    expect(r.mudou).toBe(true);
    const de_novo = aplicarAcaoRapida('treino', r.valores);
    expect(de_novo.valores).toEqual(r.valores);
    expect(de_novo.mudou).toBe(false);
  });

  it('leitura marca a meta de páginas sem reduzir quem já leu mais', () => {
    expect(aplicarAcaoRapida('leitura', base).valores.paginasLidas).toBe(METAS.paginas);
    const maisQueAMeta = aplicarAcaoRapida('leitura', { ...base, paginasLidas: METAS.paginas + 7 });
    expect(maisQueAMeta.valores.paginasLidas).toBe(METAS.paginas + 7);
    expect(maisQueAMeta.mudou).toBe(false);
  });
});

describe('destinoDeHoje', () => {
  const emAndamento = { status: 'EM_ANDAMENTO', diaAtual: 12 } as const;

  it('leva a ação para o dia atual', () => {
    expect(destinoDeHoje(new URLSearchParams({ acao: 'agua' }), emAndamento)).toBe('/desafio/dia/12?acao=agua');
    expect(destinoDeHoje(new URLSearchParams(), emAndamento)).toBe('/desafio/dia/12');
  });

  it('descarta ação inválida e fora do desafio em andamento', () => {
    expect(destinoDeHoje(new URLSearchParams({ acao: 'xpto' }), emAndamento)).toBe('/desafio/dia/12');
    expect(destinoDeHoje(new URLSearchParams({ acao: 'agua' }), { status: 'ENCERRADO', diaAtual: null })).toBe('/desafio');
    expect(destinoDeHoje(new URLSearchParams({ acao: 'agua' }), undefined)).toBe('/desafio');
  });

  it('`?dia=N` continua tendo prioridade', () => {
    expect(destinoDeHoje(new URLSearchParams({ dia: '3', acao: 'agua' }), emAndamento)).toBe('/desafio/dia/3');
  });
});
