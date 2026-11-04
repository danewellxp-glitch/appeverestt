import { METAS, TIPOS_FOTO } from '@everest/shared';
import { criarAleatorio } from './aleatorio';
import { emailDoVu } from './config';
import {
  CHANCE_CONCLUIR_DIA,
  type EstadoDia,
  PERSONAS,
  type Persona,
  TAREFAS_DO_PERIODO,
  acaoDaTarefa,
  escolherTarefas,
  estaAtivoNoDia,
  grupoPagamento,
  horarioNoFuso,
  perfilDoVu,
  periodoDoHorario,
  planoDoDia,
  proximaAgua,
  quantasTarefas,
  tarefasDisponiveis,
  tarefasPendentes,
} from './personas';

const VAZIO: EstadoDia = {
  aguaMl: 0,
  exercicio: false,
  paginasLidas: 0,
  storyPostado: false,
  fotosEnviadas: [],
};
const emails = (n: number): string[] => Array.from({ length: n }, (_, i) => emailDoVu(i + 1));

describe('perfilDoVu', () => {
  it('é estável para o mesmo e-mail', () => {
    for (const e of emails(50)) expect(perfilDoVu(e)).toEqual(perfilDoVu(e));
  });

  it('só o desistente tem último dia ativo, sorteado entre 3 e 10', () => {
    for (const e of emails(300)) {
      const p = perfilDoVu(e);
      if (p.persona === 'DESISTENTE') {
        expect(p.ultimoDiaAtivo).toBeGreaterThanOrEqual(3);
        expect(p.ultimoDiaAtivo).toBeLessThanOrEqual(10);
      } else {
        expect(p.ultimoDiaAtivo).toBeNull();
      }
    }
  });

  it('30 VUs têm todas as personas', () => {
    const contagem = new Map<Persona, number>();
    for (const e of emails(30)) {
      const { persona } = perfilDoVu(e);
      contagem.set(persona, (contagem.get(persona) ?? 0) + 1);
    }
    for (const p of PERSONAS) expect(contagem.get(p) ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('desistente para depois do último dia ativo', () => {
    expect(estaAtivoNoDia({ persona: 'DESISTENTE', ultimoDiaAtivo: 5 }, 5)).toBe(true);
    expect(estaAtivoNoDia({ persona: 'DESISTENTE', ultimoDiaAtivo: 5 }, 6)).toBe(false);
    expect(estaAtivoNoDia({ persona: 'REGULAR', ultimoDiaAtivo: null }, 30)).toBe(true);
  });
});

describe('grupoPagamento', () => {
  it('~75% confirmados, ~15% informados, ~10% pendentes', () => {
    const n = 2000;
    const c = { CONFIRMADO: 0, INFORMADO: 0, PENDENTE: 0 };
    for (const e of emails(n)) c[grupoPagamento(e)]++;
    expect(c.CONFIRMADO / n).toBeGreaterThan(0.7);
    expect(c.CONFIRMADO / n).toBeLessThan(0.8);
    expect(c.INFORMADO / n).toBeGreaterThan(0.11);
    expect(c.INFORMADO / n).toBeLessThan(0.19);
    expect(c.PENDENTE / n).toBeGreaterThan(0.07);
    expect(c.PENDENTE / n).toBeLessThan(0.13);
  });

  it('com 30 VUs há fila para o painel (informados) e pendentes', () => {
    const grupos = emails(30).map(grupoPagamento);
    expect(grupos.filter((g) => g === 'INFORMADO').length).toBeGreaterThanOrEqual(2);
    expect(grupos.filter((g) => g === 'PENDENTE').length).toBeGreaterThanOrEqual(1);
    expect(grupos.filter((g) => g === 'CONFIRMADO').length).toBeGreaterThanOrEqual(18);
  });
});

describe('planoDoDia', () => {
  it('é determinístico (e-mail + dia) e muda de um dia para o outro', () => {
    const e = emailDoVu(7);
    expect(planoDoDia(e, 3, 'REGULAR')).toEqual(planoDoDia(e, 3, 'REGULAR'));
    const planos = Array.from({ length: 30 }, (_, i) =>
      JSON.stringify(planoDoDia(e, i + 1, 'REGULAR')),
    );
    expect(new Set(planos).size).toBeGreaterThan(5);
  });

  it('cumprir = atingir a meta; não cumprir = ficar abaixo dela', () => {
    for (const e of emails(40)) {
      for (let dia = 1; dia <= 30; dia++) {
        const p = planoDoDia(e, dia, 'IRREGULAR');
        expect(p.aguaMl % 250).toBe(0);
        expect(p.aguaMl).toBeLessThanOrEqual(4000);
        expect(p.paginas).toBeLessThanOrEqual(METAS.paginas * 3);
        expect(p.fotos.length).toBeLessThanOrEqual(3);
        expect(new Set(p.fotos).size).toBe(p.fotos.length);
      }
    }
  });

  it.each(PERSONAS)('%s conclui o dia inteiro com a chance da persona', (persona) => {
    let amostras = 0;
    let diasCompletos = 0;
    for (const e of emails(100)) {
      for (let dia = 1; dia <= 30; dia++) {
        const p = planoDoDia(e, dia, persona);
        amostras++;
        const requisitos = [
          p.aguaMl >= METAS.aguaMl,
          p.exercicio,
          p.paginas >= METAS.paginas,
          p.fotos.length === TIPOS_FOTO.length,
          p.story,
        ];
        if (requisitos.every(Boolean)) diasCompletos++;
        // Dia não concluído: sempre falta pelo menos um requisito, mas costuma sair alguma coisa.
        else expect(requisitos.filter(Boolean).length).toBeLessThanOrEqual(4);
      }
    }
    expect(Math.abs(diasCompletos / amostras - CHANCE_CONCLUIR_DIA[persona])).toBeLessThan(0.04);
  });
});

describe('horários', () => {
  it.each([
    [0, 0, 'MADRUGADA'],
    [5, 59, 'MADRUGADA'],
    [6, 0, 'MANHA'],
    [11, 59, 'MANHA'],
    [12, 0, 'TARDE'],
    [17, 59, 'TARDE'],
    [18, 0, 'NOITE'],
    [21, 59, 'NOITE'],
    [22, 0, 'CORRIDA'],
    [23, 49, 'CORRIDA'],
    [23, 50, 'MADRUGADA'],
  ] as const)('%i:%i → %s', (h, m, esperado) => {
    expect(periodoDoHorario(h, m)).toBe(esperado);
  });

  it('lê a hora de Brasília', () => {
    expect(horarioNoFuso(new Date('2026-10-31T17:30:00Z'), 'America/Sao_Paulo')).toEqual({
      hora: 14,
      minuto: 30,
    });
    expect(horarioNoFuso(new Date('2026-11-01T02:55:00Z'), 'America/Sao_Paulo')).toEqual({
      hora: 23,
      minuto: 55,
    });
  });

  it('manhã: água/exercício; tarde: água/leitura; noite: leitura/story', () => {
    expect(TAREFAS_DO_PERIODO.MANHA).toEqual(expect.arrayContaining(['AGUA', 'EXERCICIO']));
    expect(TAREFAS_DO_PERIODO.MANHA).not.toContain('STORY');
    expect(TAREFAS_DO_PERIODO.TARDE).toEqual(expect.arrayContaining(['AGUA', 'LEITURA']));
    expect(TAREFAS_DO_PERIODO.NOITE).toEqual(expect.arrayContaining(['LEITURA', 'STORY']));
    expect(TAREFAS_DO_PERIODO.NOITE).not.toContain('AGUA');
    expect(TAREFAS_DO_PERIODO.MADRUGADA).toEqual([]);
  });
});

describe('tarefas', () => {
  const plano = { aguaMl: 3500, exercicio: true, paginas: 12, story: true, fotos: [...TIPOS_FOTO] };

  it('pendentes = o que falta para o plano', () => {
    expect(tarefasPendentes(plano, VAZIO)).toEqual([
      'AGUA',
      'EXERCICIO',
      'LEITURA',
      'STORY',
      'FOTO_AGUA',
      'FOTO_EXERCICIO',
      'FOTO_LEITURA',
    ]);
    const feito: EstadoDia = {
      aguaMl: 3500,
      exercicio: true,
      paginasLidas: 12,
      storyPostado: true,
      fotosEnviadas: ['AGUA', 'EXERCICIO', 'LEITURA'],
    };
    expect(tarefasPendentes(plano, feito)).toEqual([]);
  });

  it('a foto vem depois da atividade (fora da corrida)', () => {
    expect(tarefasDisponiveis(plano, VAZIO, 'MANHA')).toEqual(['AGUA', 'EXERCICIO']);
    expect(tarefasDisponiveis(plano, { ...VAZIO, aguaMl: 500 }, 'MANHA')).toEqual([
      'AGUA',
      'EXERCICIO',
      'FOTO_AGUA',
    ]);
    expect(tarefasDisponiveis(plano, VAZIO, 'NOITE')).toEqual(['LEITURA', 'STORY']);
    expect(tarefasDisponiveis(plano, VAZIO, 'CORRIDA')).toHaveLength(7);
    expect(tarefasDisponiveis(plano, VAZIO, 'MADRUGADA')).toEqual([]);
  });

  it('foto sem atividade no plano fica liberada', () => {
    const semExercicio = { ...plano, exercicio: false };
    expect(tarefasDisponiveis(semExercicio, VAZIO, 'MANHA')).toContain('FOTO_EXERCICIO');
  });

  it('0–2 tarefas por rodada; nada de madrugada; 2 na corrida', () => {
    const rng = criarAleatorio(1);
    for (let i = 0; i < 500; i++) {
      expect(quantasTarefas('MADRUGADA', rng)).toBe(0);
      expect(quantasTarefas('CORRIDA', rng)).toBe(2);
      expect([0, 1, 2]).toContain(quantasTarefas('TARDE', rng));
    }
    expect(escolherTarefas(rng, ['AGUA', 'LEITURA', 'STORY'], 2)).toHaveLength(2);
    expect(escolherTarefas(rng, ['AGUA'], 2)).toEqual(['AGUA']);
  });

  it('água em porções de 250–750 ml sem passar do alvo; na corrida, tudo de uma vez', () => {
    const rng = criarAleatorio(2);
    for (let i = 0; i < 200; i++) {
      const nova = proximaAgua(1000, 3250, 'TARDE', rng);
      expect([1250, 1500, 1750]).toContain(nova);
    }
    expect(proximaAgua(3000, 3250, 'MANHA', rng)).toBe(3250);
    expect(proximaAgua(500, 3250, 'CORRIDA', rng)).toBe(3250);
  });

  it('o PUT leva os 4 campos com valores absolutos', () => {
    const rng = criarAleatorio(3);
    const estado: EstadoDia = { ...VAZIO, aguaMl: 750, paginasLidas: 4 };
    const a = acaoDaTarefa('EXERCICIO', estado, plano, 'MANHA', rng);
    expect(a).toEqual({
      tipo: 'CHECKIN',
      dados: { aguaMl: 750, exercicio: true, paginasLidas: 4, storyPostado: false },
    });
    expect(acaoDaTarefa('LEITURA', estado, plano, 'CORRIDA', rng)).toEqual({
      tipo: 'CHECKIN',
      dados: { aguaMl: 750, exercicio: false, paginasLidas: 12, storyPostado: false },
    });
    expect(acaoDaTarefa('FOTO_LEITURA', estado, plano, 'NOITE', rng)).toEqual({
      tipo: 'FOTO',
      foto: 'LEITURA',
    });
  });
});

describe('um dia inteiro de rodadas a cada 15 min', () => {
  /** Aplica as ações no estado como a API faria (sem rede). */
  function simularDia(
    email: string,
    persona: Persona,
    semente: number,
  ): { plano: ReturnType<typeof planoDoDia>; estado: EstadoDia } {
    const plano = planoDoDia(email, 1, persona);
    const rng = criarAleatorio(semente);
    let estado: EstadoDia = { ...VAZIO, fotosEnviadas: [] };
    for (let minutos = 0; minutos < 24 * 60; minutos += 15) {
      const periodo = periodoDoHorario(Math.floor(minutos / 60), minutos % 60);
      const k = quantasTarefas(periodo, rng);
      for (const t of escolherTarefas(rng, tarefasDisponiveis(plano, estado, periodo), k)) {
        const acao = acaoDaTarefa(t, estado, plano, periodo, rng);
        estado =
          acao.tipo === 'CHECKIN'
            ? { ...estado, ...acao.dados }
            : { ...estado, fotosEnviadas: [...estado.fotosEnviadas, acao.foto] };
      }
    }
    return { plano, estado };
  }

  it('todo VU termina o dia com o plano cumprido (a corrida das 22h pega o que faltou)', () => {
    let semente = 10;
    for (const e of emails(60)) {
      for (const persona of PERSONAS) {
        const { plano, estado } = simularDia(e, persona, semente++);
        expect(tarefasPendentes(plano, estado)).toEqual([]);
        expect(estado.aguaMl).toBe(plano.aguaMl);
        expect(estado.paginasLidas).toBe(plano.paginas);
      }
    }
  });
});
