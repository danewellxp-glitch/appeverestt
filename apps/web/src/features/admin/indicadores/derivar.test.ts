import { describe, expect, it } from 'vitest';
import {
  adesaoDoDia,
  checkinsPor24Horas,
  distribuicaoNotas,
  etapasFunil,
  horaDePico,
  invictosAtuais,
  maiorQuedaFunil,
  mediaDiasConcluidos,
  notaMediaDaDistribuicao,
  requisitosPorDificuldade,
  serieInscricoes,
} from './derivar';
import { metricasExemplo } from './exemplo';

describe('funil', () => {
  it('conversão entre etapas e fatia do topo', () => {
    const etapas = etapasFunil({
      contas: 200,
      cadastrosCompletos: 150,
      inscritos: 60,
      informaram: 45,
      confirmados: 40,
    });
    expect(etapas.map((e) => [e.rotulo, e.valor, e.pctAnterior, e.pctTopo])).toEqual([
      ['Contas no app', 200, null, 100],
      ['Cadastro completo', 150, 75, 75],
      ['Inscritos', 60, 40, 30],
      ['Avisaram o pagamento', 45, 75, 22.5],
      ['Confirmados', 40, (40 / 45) * 100, 20],
    ]);
    expect(maiorQuedaFunil(etapas)?.rotulo).toBe('Inscritos');
  });

  it('embaixador confirmado sem aviso não passa de 100% e funil vazio não quebra', () => {
    const etapas = etapasFunil({
      contas: 1,
      cadastrosCompletos: 1,
      inscritos: 1,
      informaram: 0,
      confirmados: 1,
    });
    expect(etapas[4]?.pctAnterior).toBeNull();
    expect(
      etapasFunil({
        contas: 0,
        cadastrosCompletos: 0,
        inscritos: 0,
        informaram: 0,
        confirmados: 0,
      })[2]?.pctTopo,
    ).toBeNull();
    expect(
      maiorQuedaFunil(
        etapasFunil({
          contas: 3,
          cadastrosCompletos: 3,
          inscritos: 3,
          informaram: 3,
          confirmados: 3,
        }),
      ),
    ).toBeNull();
  });
});

describe('adesão e invictos', () => {
  it('usa o dia mais recente da série', () => {
    const m = metricasExemplo();
    const ultimo = m.adesaoPorDia.at(-1) ?? null;
    const a = adesaoDoDia(ultimo);
    expect(a?.dia.dia).toBe(ultimo?.dia);
    expect(a?.pctConcluidos).toBeCloseTo(((ultimo?.concluidos ?? 0) / (ultimo?.ativos ?? 1)) * 100);
    expect(invictosAtuais(m)?.dia).toBe(ultimo?.dia);
    expect(adesaoDoDia(null)).toBeNull();
  });

  it('antes do início não há adesão nem invictos', () => {
    const m = { ...metricasExemplo(), adesaoPorDia: [], invictosPorDia: [] };
    expect(invictosAtuais(m)).toBeNull();
  });
});

describe('médias e distribuições', () => {
  it('média ponderada de dias concluídos', () => {
    expect(
      mediaDiasConcluidos([
        { dias: 0, participantes: 2 },
        { dias: 3, participantes: 2 },
      ]),
    ).toBe(1.5);
    expect(mediaDiasConcluidos([])).toBeNull();
  });

  it('requisitos do mais difícil para o mais fácil', () => {
    const r = requisitosPorDificuldade([
      { requisito: 'AGUA', cumpridos: 9, total: 10 },
      { requisito: 'LEITURA', cumpridos: 5, total: 10 },
      { requisito: 'STORY', cumpridos: 0, total: 0 },
      { requisito: 'FOTOS', cumpridos: 7, total: 10 },
    ]);
    expect(r.map((x) => x.rotulo)).toEqual(['Leitura', 'Fotos', 'Água', 'Story']);
    expect(r[3]?.pct).toBeNull();
  });

  it('inscrições por data com acumulado', () => {
    const s = serieInscricoes([
      { data: '2026-10-28', inscricoes: 3, confirmacoes: 1 },
      { data: '2026-10-29', inscricoes: 0, confirmacoes: 2 },
      { data: '2026-10-30', inscricoes: 4, confirmacoes: 3 },
    ]);
    expect(s.inscricoesAcumuladas).toEqual([3, 3, 7]);
    expect(s.confirmacoesAcumuladas).toEqual([1, 3, 6]);
  });

  it('pico de horário e 24 posições', () => {
    const lista = [
      { hora: 7, checkins: 4 },
      { hora: 21, checkins: 12 },
      { hora: 22, checkins: 4 },
    ];
    expect(horaDePico(lista)).toEqual({ hora: 21, checkins: 12, pct: 60 });
    expect(horaDePico([{ hora: 3, checkins: 0 }])).toBeNull();
    const horas = checkinsPor24Horas(lista);
    expect(horas).toHaveLength(24);
    expect(horas[21]).toBe(12);
    expect(horas[0]).toBe(0);
  });

  it('feedback de 5 a 1 com todas as notas', () => {
    const d = [
      { nota: 5, respostas: 3 },
      { nota: 4, respostas: 1 },
    ];
    expect(distribuicaoNotas(d).map((x) => x.respostas)).toEqual([3, 1, 0, 0, 0]);
    expect(notaMediaDaDistribuicao(d)).toBe(4.8);
    expect(notaMediaDaDistribuicao([])).toBeNull();
  });
});
