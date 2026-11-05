import type { UsuarioMe } from '@everest/shared';
import {
  type CandidatoTurma,
  confere,
  escolherPapeis,
  linhaCheck,
  perfilDoMe,
  percentil,
  tabelaResumo,
} from './verificacao';

function vu(numero: number, extra: Partial<CandidatoTurma> = {}): CandidatoTurma {
  return {
    numero,
    participanteId: `p${numero}`,
    concluido: false,
    temTreino: false,
    aceitaCutucadas: true,
    ...extra,
  };
}

describe('confere', () => {
  it('compara status e, quando pedido, o código', () => {
    expect(confere({ status: 200 }, 200, null)).toBe(true);
    expect(confere({ status: 200 }, 409, 'JA_CUTUCOU')).toBe(false);
    expect(confere({ status: 409, codigo: 'JA_CUTUCOU' }, 409, 'JA_CUTUCOU')).toBe(true);
    expect(confere({ status: 409, codigo: 'JA_CUTUCOU' }, 409, 'CUTUCADA_RECUSADA')).toBe(false);
    expect(confere({ status: 403, codigo: 'POSE_SEM_TREINO' }, 409, 'POSE_SEM_TREINO')).toBe(false);
  });
});

describe('linhaCheck', () => {
  it('formata ok e FALHOU', () => {
    expect(
      linhaCheck({
        ok: true,
        descricao: 'VU 01 GET turma/hoje',
        status: 200,
        codigo: null,
        ms: 84,
      }),
    ).toBe('ok VU 01 GET turma/hoje (200 84ms)');
    expect(
      linhaCheck({
        ok: false,
        descricao: 'VU 05 POST cutucadas → VU 03',
        status: 409,
        codigo: 'JA_CUTUCOU',
        ms: 51,
        motivo: 'esperado 200',
      }),
    ).toBe('FALHOU VU 05 POST cutucadas → VU 03 (409 JA_CUTUCOU 51ms) — esperado 200');
    expect(
      linhaCheck({
        ok: false,
        descricao: 'x',
        status: 0,
        codigo: null,
        ms: 0,
        motivo: 'tempo esgotado',
      }),
    ).toBe('FALHOU x (rede 0ms) — tempo esgotado');
  });
});

describe('percentil', () => {
  it('posto mais próximo', () => {
    expect(percentil([], 50)).toBeNull();
    expect(percentil([7], 95)).toBe(7);
    const v = Array.from({ length: 100 }, (_, i) => 100 - i); // 100..1 (fora de ordem)
    expect(percentil(v, 50)).toBe(50);
    expect(percentil(v, 95)).toBe(95);
    expect(percentil(v, 100)).toBe(100);
    expect(percentil([10, 20, 30, 40], 50)).toBe(20);
  });
});

describe('escolherPapeis', () => {
  it('A e B são os dois primeiros; C o primeiro sem treino, aberto e aceitando; D e E os seguintes', () => {
    const p = escolherPapeis([
      vu(7),
      vu(3, { temTreino: true }),
      vu(1, { concluido: true, temTreino: true }),
      vu(2),
      vu(5, { aceitaCutucadas: false }),
      vu(4, { concluido: true }),
      vu(6),
    ]);
    expect([p.a, p.b, p.c, p.d, p.e].map((v) => v.numero)).toEqual([1, 2, 6, 3, 4]);
  });

  it('com exatamente 5 VUs', () => {
    const p = escolherPapeis([vu(101), vu(102), vu(103), vu(104), vu(105)]);
    expect([p.a, p.b, p.c, p.d, p.e].map((v) => v.numero)).toEqual([101, 102, 103, 104, 105]);
  });

  it('lança com menos de 5 ou sem candidato a C', () => {
    expect(() => escolherPapeis([vu(1), vu(2), vu(3), vu(4)])).toThrow('pelo menos 5');
    expect(() =>
      escolherPapeis([
        vu(1),
        vu(2),
        vu(3, { temTreino: true }),
        vu(4, { concluido: true }),
        vu(5, { aceitaCutucadas: false }),
      ]),
    ).toThrow('sem a foto do treino');
  });
});

describe('perfilDoMe', () => {
  const me: UsuarioMe = {
    id: 'u1',
    nome: 'VU 04 Ana Souza',
    email: 'vu-04@vu.everestt.app.br',
    papel: 'USUARIO',
    fotoUrl: null,
    perfilCompleto: true,
    instagram: 'vu_04',
    dataNascimento: '1990-05-12',
    whatsapp: '11900000004',
    bairro: 'Pinheiros',
    cidade: 'São Paulo',
    uf: 'SP',
    aceitouMarketing: false,
    aceitaCutucadas: true,
  };

  it('monta o corpo completo mudando só aceitaCutucadas', () => {
    expect(perfilDoMe(me, false)).toEqual({
      nome: 'VU 04 Ana Souza',
      instagram: 'vu_04',
      dataNascimento: '1990-05-12',
      whatsapp: '11900000004',
      bairro: 'Pinheiros',
      cidade: 'São Paulo',
      uf: 'SP',
      aceitouTermos: true,
      aceitouMarketing: false,
      aceitaCutucadas: false,
    });
  });

  it('recusa perfil incompleto', () => {
    expect(() => perfilDoMe({ ...me, whatsapp: null }, true)).toThrow('incompleto');
    expect(() => perfilDoMe({ ...me, perfilCompleto: false }, true)).toThrow('incompleto');
  });
});

describe('tabelaResumo', () => {
  it('agrupa rotas com número do dia, conta não-2xx e fecha com o total', () => {
    const t = tabelaResumo(
      [
        { rota: 'GET dias/4', status: 200, ms: 10 },
        { rota: 'GET dias/4', status: 200, ms: 30 },
        { rota: 'POST cutucadas', status: 409, ms: 20 },
      ],
      { checks: 3, falhas: 0, requisicoesHttp: 5, logins: 1, duracaoS: 9 },
    );
    const linhas = t.split('\n');
    expect(linhas[0]).toMatch(/^rota\s+req\s+não-2xx\s+p50\s+p95$/);
    expect(linhas.find((l) => l.startsWith('GET dias/:n'))).toMatch(/2\s+0\s+10ms\s+30ms$/);
    expect(linhas.find((l) => l.startsWith('POST cutucadas'))).toMatch(/1\s+1\s+20ms\s+20ms$/);
    expect(linhas.find((l) => l.startsWith('TOTAL'))).toMatch(/3\s+1\s+20ms\s+30ms$/);
    expect(t).toContain('Checks: 3 · falhas: 0 · 5 requisições HTTP');
  });
});
