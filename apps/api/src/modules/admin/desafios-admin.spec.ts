import type { Desafio } from '@prisma/client';
import type { ErroApi } from '@everest/shared';
import { ErroApp } from '../../common/erros';
import { conferirAtualizacao, paraConfig, type RestricoesEdicao } from './desafios-admin.service';

const DESAFIO: Desafio = {
  id: 'ckx3',
  slug: 'desafio-30-everest',
  nome: 'Desafio 30 Dias Everest',
  dataInicio: new Date('2026-11-01T00:00:00Z'),
  totalDias: 30,
  totalVagas: 10,
  embaixadorOcupaVaga: true,
  inscricoesAbertas: false,
  timezone: 'America/Sao_Paulo',
  instagramHandle: 'everest',
  hashtag: 'DESAFIO30EVEREST',
  ativo: true,
  criadoEm: new Date('2026-10-28T00:46:14Z'),
};

const LIVRE: RestricoesEdicao = { temCheckins: false, vagasOcupadas: 0, maiorVaga: null };

function erro(fn: () => void): ErroApi & { status: number } {
  try {
    fn();
  } catch (e) {
    if (e instanceof ErroApp) return { ...(e.getResponse() as ErroApi), status: e.getStatus() };
    throw e;
  }
  throw new Error('Não lançou erro.');
}

describe('paraConfig', () => {
  it('datas no fuso do desafio, situação e ocupação', () => {
    const antes = paraConfig(DESAFIO, { vagasOcupadas: 7, totalInscritos: 8, temCheckins: false }, new Date('2026-10-31T15:00:00Z'));
    expect(antes).toEqual({
      id: 'ckx3',
      slug: 'desafio-30-everest',
      nome: 'Desafio 30 Dias Everest',
      dataInicio: '2026-11-01',
      dataFim: '2026-11-30',
      totalDias: 30,
      totalVagas: 10,
      instagramHandle: 'everest',
      hashtag: 'DESAFIO30EVEREST',
      timezone: 'America/Sao_Paulo',
      inscricoesAbertas: false,
      embaixadorOcupaVaga: true,
      ativo: true,
      status: 'NAO_INICIADO',
      diaAtual: null,
      vagasOcupadas: 7,
      totalInscritos: 8,
      temCheckins: false,
      criadoEm: '2026-10-28T00:46:14.000Z',
    });
    // 01:00 UTC de 02/11 ainda é o dia 1 em São Paulo.
    const dia1 = paraConfig(DESAFIO, { vagasOcupadas: 0, totalInscritos: 0, temCheckins: true }, new Date('2026-11-02T01:00:00Z'));
    expect(dia1).toMatchObject({ status: 'EM_ANDAMENTO', diaAtual: 1, temCheckins: true });
  });
});

describe('conferirAtualizacao', () => {
  const comCheckins: RestricoesEdicao = { temCheckins: true, vagasOcupadas: 8, maiorVaga: 8 };

  it('sem check-ins, data de início e total de dias mudam livremente', () => {
    expect(() => conferirAtualizacao(DESAFIO, { dataInicio: '2026-11-08', totalDias: 21 }, LIVRE)).not.toThrow();
  });

  it('com check-ins, reenviar os mesmos valores (formulário completo) não é mudança', () => {
    expect(() =>
      conferirAtualizacao(
        DESAFIO,
        { nome: 'Novo nome', dataInicio: '2026-11-01', totalDias: 30, totalVagas: 10, inscricoesAbertas: true },
        comCheckins,
      ),
    ).not.toThrow();
  });

  it('com check-ins, mudar a data de início ou o total de dias → DESAFIO_NAO_EDITAVEL (409) com o campo', () => {
    const e1 = erro(() => conferirAtualizacao(DESAFIO, { dataInicio: '2026-11-02' }, comCheckins));
    expect(e1).toMatchObject({ codigo: 'DESAFIO_NAO_EDITAVEL', status: 409 });
    expect(e1.mensagem).toMatch(/primeiro check-in/);
    expect(Object.keys(e1.campos ?? {})).toEqual(['dataInicio']);

    const e2 = erro(() => conferirAtualizacao(DESAFIO, { totalDias: 31, dataInicio: '2026-11-01' }, comCheckins));
    expect(Object.keys(e2.campos ?? {})).toEqual(['totalDias']);
  });

  it('total de vagas não fica abaixo da maior vaga ocupada (os números não são renumerados)', () => {
    // 8 inscrições, mas a vaga 10 está ocupada (houve remoções no meio).
    const comBuraco: RestricoesEdicao = { temCheckins: false, vagasOcupadas: 8, maiorVaga: 10 };
    const DESAFIO_20 = { ...DESAFIO, totalVagas: 20 };
    const e1 = erro(() => conferirAtualizacao(DESAFIO_20, { totalVagas: 9 }, comBuraco));
    expect(e1).toMatchObject({ codigo: 'DESAFIO_NAO_EDITAVEL', status: 409 });
    expect(e1.mensagem).toMatch(/vaga nº 10 está ocupada/);
    expect(e1.campos).toEqual({ totalVagas: e1.mensagem });

    const e2 = erro(() => conferirAtualizacao(DESAFIO_20, { totalVagas: 7 }, comBuraco));
    expect(e2.mensagem).toBe('Já há 8 vagas ocupadas: o total não pode ser menor que isso.');

    expect(() => conferirAtualizacao(DESAFIO_20, { totalVagas: 10 }, comBuraco)).not.toThrow();
    expect(() => conferirAtualizacao(DESAFIO_20, { totalVagas: 50 }, comBuraco)).not.toThrow();
    expect(() => conferirAtualizacao(DESAFIO, { totalVagas: 1 }, LIVRE)).not.toThrow();
  });

  it('total de vagas igual ao atual não é conferido; outros campos passam', () => {
    const inconsistente: RestricoesEdicao = { temCheckins: true, vagasOcupadas: 12, maiorVaga: 12 };
    expect(() => conferirAtualizacao(DESAFIO, { totalVagas: 10, ativo: true }, inconsistente)).not.toThrow();
    expect(() => conferirAtualizacao(DESAFIO, { inscricoesAbertas: true }, comCheckins)).not.toThrow();
  });
});
