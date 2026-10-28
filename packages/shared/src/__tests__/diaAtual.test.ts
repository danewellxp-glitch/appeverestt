import { describe, expect, it } from 'vitest';
import { calcularDiaAtual, dataDoDia, hojeNoFuso, somarDias } from '../regras/diaAtual';

const SP = 'America/Sao_Paulo';

/** Meio-dia em São Paulo (UTC-3) na data informada. */
function meioDiaSP(data: string): Date {
  return new Date(`${data}T15:00:00Z`);
}

describe('hojeNoFuso', () => {
  it('2026-11-02T02:30:00Z em São Paulo é 2026-11-01', () => {
    expect(hojeNoFuso(new Date('2026-11-02T02:30:00Z'), SP)).toBe('2026-11-01');
  });

  it('03:00Z já é o dia seguinte em São Paulo', () => {
    expect(hojeNoFuso(new Date('2026-11-02T03:00:00Z'), SP)).toBe('2026-11-02');
  });

  it('respeita outro fuso', () => {
    expect(hojeNoFuso(new Date('2026-11-02T02:30:00Z'), 'UTC')).toBe('2026-11-02');
  });
});

describe('calcularDiaAtual', () => {
  const inicio = '2026-11-01';

  it('antes do início: NAO_INICIADO com diasParaInicio correto', () => {
    expect(calcularDiaAtual(inicio, meioDiaSP('2026-10-27'), SP)).toEqual({
      status: 'NAO_INICIADO',
      numeroDia: null,
      diasParaInicio: 5,
    });
    expect(calcularDiaAtual(inicio, meioDiaSP('2026-10-31'), SP).diasParaInicio).toBe(1);
  });

  it('no dia de início é o dia 1', () => {
    expect(calcularDiaAtual(inicio, meioDiaSP(inicio), SP)).toEqual({
      status: 'EM_ANDAMENTO',
      numeroDia: 1,
      diasParaInicio: 0,
    });
  });

  it('virada da meia-noite em SP (02:30Z) ainda é o dia anterior', () => {
    expect(calcularDiaAtual(inicio, new Date('2026-11-01T02:30:00Z'), SP).status).toBe(
      'NAO_INICIADO',
    );
  });

  it('início + 29 é o dia 30', () => {
    expect(calcularDiaAtual(inicio, meioDiaSP(somarDias(inicio, 29)), SP)).toEqual({
      status: 'EM_ANDAMENTO',
      numeroDia: 30,
      diasParaInicio: 0,
    });
  });

  it('início + 30 é ENCERRADO', () => {
    expect(calcularDiaAtual(inicio, meioDiaSP(somarDias(inicio, 30)), SP)).toEqual({
      status: 'ENCERRADO',
      numeroDia: null,
      diasParaInicio: 0,
    });
  });

  it('atravessa a virada de mês corretamente', () => {
    expect(somarDias('2026-11-01', 29)).toBe('2026-11-30');
    expect(dataDoDia('2026-11-15', 30)).toBe('2026-12-14');
  });
});
