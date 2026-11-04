import type { Desafio } from '@prisma/client';
import { ErroApp } from '../../common/erros';
import type { AppConfig } from '../../config/app-config.service';
import { DiaService, umaFotoPorTipo } from './dia.service';

/** Desafio de 30 dias a partir de 01/11/2026, horário de Brasília (UTC-3). */
const DESAFIO = {
  dataInicio: new Date('2026-11-01T00:00:00Z'),
  totalDias: 30,
  timezone: 'America/Sao_Paulo',
} as Desafio;

function servico(retroativo = false): DiaService {
  const config = { get: () => retroativo } as unknown as AppConfig;
  return new DiaService(null as never, null as never, null as never, config);
}

/** Hora de Brasília → instante UTC. */
const brasilia = (iso: string) => new Date(`${iso}-03:00`);

function codigo(fn: () => void): string | null {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof ErroApp ? (e.getResponse() as { codigo: string }).codigo : 'OUTRO';
  }
}

describe('janela de edição do dia (X1 + tolerância da virada, X18)', () => {
  const dias = servico();

  it('o dia de hoje é editável o dia todo', () => {
    expect(dias.ehEditavel(DESAFIO, 4, brasilia('2026-11-04T00:00:00'))).toBe(true);
    expect(dias.ehEditavel(DESAFIO, 4, brasilia('2026-11-04T23:59:59'))).toBe(true);
  });

  it('até 5 min depois da meia-noite, o dia que acabou ainda aceita (rede lenta, upload grande)', () => {
    expect(dias.ehEditavel(DESAFIO, 3, brasilia('2026-11-04T00:00:30'))).toBe(true);
    expect(dias.ehEditavel(DESAFIO, 3, brasilia('2026-11-04T00:04:59'))).toBe(true);
    expect(codigo(() => dias.exigirEditavel(DESAFIO, 3, brasilia('2026-11-04T00:04:59')))).toBeNull();
  });

  it('depois da tolerância, só hoje', () => {
    expect(dias.ehEditavel(DESAFIO, 3, brasilia('2026-11-04T00:05:01'))).toBe(false);
    expect(codigo(() => dias.exigirEditavel(DESAFIO, 3, brasilia('2026-11-04T00:05:01')))).toBe('DIA_NAO_EDITAVEL');
    expect(codigo(() => dias.exigirEditavel(DESAFIO, 2, brasilia('2026-11-04T00:01:00')))).toBe('DIA_NAO_EDITAVEL');
  });

  it('dia futuro nunca é editável', () => {
    expect(codigo(() => dias.exigirEditavel(DESAFIO, 5, brasilia('2026-11-04T23:59:00')))).toBe('DIA_NAO_EDITAVEL');
  });

  it('último dia: a tolerância vale mesmo com o desafio já encerrado', () => {
    expect(dias.ehEditavel(DESAFIO, 30, brasilia('2026-12-01T00:03:00'))).toBe(true);
    expect(codigo(() => dias.exigirEditavel(DESAFIO, 30, brasilia('2026-12-01T00:03:00')))).toBeNull();
    expect(codigo(() => dias.exigirEditavel(DESAFIO, 30, brasilia('2026-12-01T00:06:00')))).toBe('DESAFIO_ENCERRADO');
  });

  it('antes do início: DESAFIO_NAO_INICIADO', () => {
    expect(codigo(() => dias.exigirEditavel(DESAFIO, 1, brasilia('2026-10-31T23:59:00')))).toBe('DESAFIO_NAO_INICIADO');
  });

  it('PERMITIR_EDITAR_DIAS_ANTERIORES libera os dias passados (e continua barrando o futuro)', () => {
    const retro = servico(true);
    expect(retro.ehEditavel(DESAFIO, 1, brasilia('2026-11-04T12:00:00'))).toBe(true);
    expect(retro.ehEditavel(DESAFIO, 5, brasilia('2026-11-04T12:00:00'))).toBe(false);
  });
});

describe('umaFotoPorTipo (troca de foto, R17)', () => {
  const foto = (id: string, tipo: 'AGUA' | 'LEITURA', status: string, minuto: number) => ({
    id,
    tipo,
    status: status as 'PENDENTE',
    criadoEm: new Date(Date.UTC(2026, 10, 4, 12, minuto)),
  });

  it('durante a troca mostra a foto recebida, não a pendente', () => {
    const r = umaFotoPorTipo([foto('nova', 'AGUA', 'PENDENTE', 5), foto('velha', 'AGUA', 'CONFIRMADA', 1)]);
    expect(r.map((f) => f.id)).toEqual(['velha']);
  });

  it('só pendentes: a mais recente; tipos diferentes ficam todos', () => {
    const r = umaFotoPorTipo([
      foto('p1', 'AGUA', 'PENDENTE', 1),
      foto('p2', 'AGUA', 'PENDENTE', 2),
      foto('l', 'LEITURA', 'ENVIADA', 1),
    ]);
    expect(r.map((f) => f.id).sort()).toEqual(['l', 'p2']);
  });
});
