import type { AdminMetricas } from '@everest/shared';
import {
  calcularMetricas,
  diaLimite,
  faixaEtaria,
  horaNoFuso,
  type DiaMetricas,
  type EntradaMetricas,
  type ParticipanteMetricas,
} from './metricas';

const TZ = 'America/Sao_Paulo';
const DESAFIO = {
  slug: 'desafio-teste',
  nome: 'Desafio Teste',
  dataInicio: '2026-11-01',
  totalDias: 30,
  totalVagas: 10,
  timezone: TZ,
};

/** Instante a partir da hora local de São Paulo (UTC-3, sem horário de verão). */
const em = (data: string, hora: number, minuto = 0): Date =>
  new Date(`${data}T${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00-03:00`);

let seq = 0;
function participante(extra: Partial<ParticipanteMetricas> = {}): ParticipanteMetricas {
  seq += 1;
  return {
    id: `p${seq}`,
    nome: `Pessoa ${seq}`,
    whatsapp: '11987654321',
    ehEmbaixador: false,
    isento: false,
    vagaNumero: seq,
    dataInscricao: em('2026-10-20', 12),
    pagamentoStatus: 'CONFIRMADO',
    pagamentoInformadoEm: null,
    pagamentoConfirmadoEm: em('2026-10-21', 12),
    dataNascimento: '1995-04-12',
    cidade: 'São Paulo',
    uf: 'SP',
    aceitouMarketing: false,
    contaExcluida: false,
    ...extra,
  };
}

/** Dia completo (5 requisitos) por padrão, atualizado às 21h do próprio dia. */
function dia(p: ParticipanteMetricas, numeroDia: number, extra: Partial<DiaMetricas> = {}): DiaMetricas {
  const data = new Date(Date.UTC(2026, 10, numeroDia)).toISOString().slice(0, 10);
  return {
    participanteId: p.id,
    numeroDia,
    aguaMl: 3000,
    exercicio: true,
    paginasLidas: 10,
    storyPostado: true,
    concluido: true,
    invalidado: false,
    conferido: false,
    atualizadoEm: em(data, 21),
    fotosValidas: ['AGUA', 'EXERCICIO', 'LEITURA'],
    ...extra,
  };
}

const PARCIAL: Partial<DiaMetricas> = {
  aguaMl: 500,
  exercicio: false,
  paginasLidas: 0,
  storyPostado: false,
  concluido: false,
  fotosValidas: [],
};

function metricas(extra: Partial<EntradaMetricas>): AdminMetricas {
  return calcularMetricas({
    agora: em('2026-10-31', 12),
    desafio: DESAFIO,
    valorInscricaoCentavos: 5000,
    contas: 0,
    cadastrosCompletos: 0,
    participantes: [],
    dias: [],
    feedbacks: [],
    ...extra,
  });
}

describe('auxiliares', () => {
  it('diaLimite: dia atual em andamento, todos depois do fim, 0 antes do início', () => {
    expect(diaLimite('EM_ANDAMENTO', 4, 30)).toBe(4);
    expect(diaLimite('ENCERRADO', null, 30)).toBe(30);
    expect(diaLimite('NAO_INICIADO', null, 30)).toBe(0);
  });

  it('horaNoFuso usa o fuso do desafio (0–23)', () => {
    expect(horaNoFuso(new Date('2026-11-01T02:30:00Z'), TZ)).toBe(23);
    expect(horaNoFuso(new Date('2026-11-01T03:00:00Z'), TZ)).toBe(0);
    expect(horaNoFuso(new Date('2026-11-01T15:59:00Z'), TZ)).toBe(12);
    expect(horaNoFuso(new Date('2026-11-01T15:59:00Z'), 'UTC')).toBe(15);
  });

  it('faixaEtaria pela idade completa no dia (aniversário no próprio dia já conta)', () => {
    const hoje = '2026-10-31';
    expect(faixaEtaria('2008-10-31', hoje)).toBe('18–24');
    expect(faixaEtaria('2001-11-01', hoje)).toBe('18–24');
    expect(faixaEtaria('2001-10-31', hoje)).toBe('25–34');
    expect(faixaEtaria('1991-11-01', hoje)).toBe('25–34');
    expect(faixaEtaria('1991-10-31', hoje)).toBe('35–44');
    expect(faixaEtaria('1981-10-31', hoje)).toBe('45–54');
    expect(faixaEtaria('1971-11-01', hoje)).toBe('45–54');
    expect(faixaEtaria('1971-10-31', hoje)).toBe('55+');
    expect(faixaEtaria(null, hoje)).toBe('Sem data');
  });
});

describe('antes do início', () => {
  const agora = em('2026-10-31', 12);
  const embaixador = participante({ nome: 'Tt Embaixador', ehEmbaixador: true, isento: true, pagamentoConfirmadoEm: em('2026-10-19', 9) });
  const confirmado = participante({
    pagamentoInformadoEm: new Date('2026-10-20T15:00:00Z'),
    pagamentoConfirmadoEm: new Date('2026-10-21T01:00:00Z'),
  });
  const informado = participante({
    pagamentoStatus: 'INFORMADO',
    pagamentoInformadoEm: new Date(agora.getTime() - 5 * 3_600_000),
    pagamentoConfirmadoEm: null,
  });
  const pendente = participante({ pagamentoStatus: 'PENDENTE', pagamentoConfirmadoEm: null });
  const excluido = participante({ contaExcluida: true, dataNascimento: null, cidade: null, uf: null });
  const participantes = [embaixador, confirmado, informado, pendente, excluido];

  it('séries por dia vazias, todos os ativos com 0 dias e ninguém em risco', () => {
    const m = metricas({ agora, participantes });
    expect(m.geradoEm).toBe(agora.toISOString());
    expect(m.desafio).toEqual({
      slug: 'desafio-teste',
      nome: 'Desafio Teste',
      dataInicio: '2026-11-01',
      dataFim: '2026-11-30',
      totalDias: 30,
      diaAtual: null,
      status: 'NAO_INICIADO',
      totalVagas: 10,
      valorInscricaoCentavos: 5000,
    });
    expect(m.adesaoPorDia).toEqual([]);
    expect(m.invictosPorDia).toEqual([]);
    // Ativos: embaixador e o confirmado (a conta excluída não faz check-in).
    expect(m.distribuicaoDiasConcluidos).toEqual([{ dias: 0, participantes: 2 }]);
    expect(m.emRisco).toEqual([]);
    expect(m.checkinsPorHora).toHaveLength(24);
    expect(m.checkinsPorHora.every((h, i) => h.hora === i && h.checkins === 0)).toBe(true);
    expect(m.requisitos.map((r) => r.requisito)).toEqual(['AGUA', 'EXERCICIO', 'LEITURA', 'FOTOS', 'STORY']);
    expect(m.requisitos.every((r) => r.cumpridos === 0 && r.total === 0)).toBe(true);
  });

  it('funil, vagas e receita sem o embaixador', () => {
    const m = metricas({ agora, participantes, contas: 12, cadastrosCompletos: 8 });
    expect(m.funil).toEqual({ contas: 12, cadastrosCompletos: 8, inscritos: 5, informaram: 4, confirmados: 3 });
    expect(m.vagas).toEqual({ total: 10, ocupadas: 5, livres: 5 });
    expect(m.receita).toEqual({
      confirmadaCentavos: 2 * 5000,
      aguardandoConferenciaCentavos: 5000,
      pendenteCentavos: 5000,
    });
  });

  it('admin inscrito (confirmado sem Pix) não entra na receita; o funil continua monotônico', () => {
    const admin = participante({ nome: 'Admin Teste', isento: true, pagamentoInformadoEm: null });
    const base = metricas({ agora, participantes });
    const comAdmin = metricas({ agora, participantes: [...participantes, admin] });
    expect(comAdmin.receita).toEqual(base.receita);
    expect(comAdmin.funil.inscritos).toBe(base.funil.inscritos + 1);
    expect(comAdmin.funil.informaram).toBe(base.funil.informaram + 1);
    expect(comAdmin.funil.confirmados).toBe(base.funil.confirmados + 1);
    const { inscritos, informaram, confirmados } = comAdmin.funil;
    expect(inscritos >= informaram && informaram >= confirmados).toBe(true);
  });

  it('embaixador fora das vagas não ocupa; sem Pix configurado a receita fica zerada', () => {
    const semVaga = { ...embaixador, vagaNumero: null };
    const m = metricas({ agora, participantes: [semVaga, confirmado, informado], valorInscricaoCentavos: null });
    expect(m.vagas).toEqual({ total: 10, ocupadas: 2, livres: 8 });
    expect(m.desafio.valorInscricaoCentavos).toBeNull();
    expect(m.receita).toEqual({ confirmadaCentavos: 0, aguardandoConferenciaCentavos: 0, pendenteCentavos: 0 });
  });

  it('pagamentos: média até confirmar e espera do aviso mais antigo, em horas com 1 casa', () => {
    const m = metricas({ agora, participantes });
    expect(m.pagamentos).toEqual({ aguardandoConferencia: 1, horasMediasAteConfirmar: 10, horasEsperaMaisAntiga: 5 });
    const outro = participante({
      pagamentoInformadoEm: new Date('2026-10-22T10:00:00Z'),
      pagamentoConfirmadoEm: new Date('2026-10-22T10:20:00Z'),
    });
    const semFila = metricas({ agora, participantes: [embaixador, confirmado, outro] });
    expect(semFila.pagamentos).toEqual({
      aguardandoConferencia: 0,
      horasMediasAteConfirmar: 5.2,
      horasEsperaMaisAntiga: null,
    });
    expect(metricas({ agora }).pagamentos).toEqual({
      aguardandoConferencia: 0,
      horasMediasAteConfirmar: null,
      horasEsperaMaisAntiga: null,
    });
  });
});

describe('dia 1', () => {
  it('adesão, invictos, distribuição e requisitos do primeiro dia; ninguém em risco', () => {
    const a = participante();
    const b = participante();
    const pendente = participante({ pagamentoStatus: 'PENDENTE', pagamentoConfirmadoEm: null });
    const m = metricas({
      agora: em('2026-11-01', 22),
      participantes: [a, b, pendente],
      dias: [dia(a, 1), dia(b, 1, PARCIAL)],
    });
    expect(m.desafio).toMatchObject({ status: 'EM_ANDAMENTO', diaAtual: 1 });
    expect(m.adesaoPorDia).toEqual([
      { dia: 1, data: '2026-11-01', ativos: 2, comCheckin: 2, concluidos: 1, invalidados: 0 },
    ]);
    expect(m.invictosPorDia).toEqual([{ dia: 1, participantes: 1 }]);
    expect(m.distribuicaoDiasConcluidos).toEqual([
      { dias: 0, participantes: 1 },
      { dias: 1, participantes: 1 },
    ]);
    expect(m.emRisco).toEqual([]);
    expect(m.requisitos.every((r) => r.cumpridos === 1 && r.total === 2)).toBe(true);
    expect(m.checkinsPorHora[21]).toEqual({ hora: 21, checkins: 2 });
  });
});

describe('dias com invalidação', () => {
  const a = participante();
  const b = participante();
  const dias = [
    dia(a, 1),
    // Invalidado: o recalcularDia grava concluido = false.
    dia(a, 2, { invalidado: true, concluido: false }),
    dia(b, 1, { conferido: true }),
    dia(b, 2),
    // Faltam 1 ml de água e uma foto.
    dia(b, 3, { aguaMl: 2999, fotosValidas: ['AGUA', 'LEITURA'], concluido: false }),
  ];
  const m = metricas({ agora: em('2026-11-03', 10), participantes: [a, b], dias });

  it('adesão separa concluídos e invalidados; invictos caem no dia invalidado', () => {
    expect(m.adesaoPorDia).toEqual([
      { dia: 1, data: '2026-11-01', ativos: 2, comCheckin: 2, concluidos: 2, invalidados: 0 },
      { dia: 2, data: '2026-11-02', ativos: 2, comCheckin: 2, concluidos: 1, invalidados: 1 },
      { dia: 3, data: '2026-11-03', ativos: 2, comCheckin: 1, concluidos: 0, invalidados: 0 },
    ]);
    expect(m.invictosPorDia).toEqual([
      { dia: 1, participantes: 2 },
      { dia: 2, participantes: 1 },
      { dia: 3, participantes: 0 },
    ]);
    expect(m.distribuicaoDiasConcluidos).toEqual([
      { dias: 0, participantes: 0 },
      { dias: 1, participantes: 1 },
      { dias: 2, participantes: 1 },
      { dias: 3, participantes: 0 },
    ]);
  });

  it('requisitos e somatórios ignoram o dia invalidado; conferência bate com a fila', () => {
    expect(m.requisitos).toEqual([
      { requisito: 'AGUA', cumpridos: 3, total: 4 },
      { requisito: 'EXERCICIO', cumpridos: 4, total: 4 },
      { requisito: 'LEITURA', cumpridos: 4, total: 4 },
      { requisito: 'FOTOS', cumpridos: 3, total: 4 },
      { requisito: 'STORY', cumpridos: 4, total: 4 },
    ]);
    expect(m.totais).toEqual({
      aguaLitros: 12,
      paginasLidas: 40,
      treinos: 4,
      stories: 4,
      fotos: 11,
      diasConcluidos: 3,
    });
    expect(m.conferencia).toEqual({ concluidos: 3, conferidos: 1, aguardando: 2, invalidados: 1 });
    expect(m.checkinsPorHora[21]?.checkins).toBe(4);
  });
});

describe('em risco', () => {
  const a = participante({ nome: 'Ana' });
  const b = participante({ nome: 'Bruna', whatsapp: '21987654321' });
  const c = participante({ nome: 'Caio', whatsapp: null });
  const d = participante({ nome: 'Duda' });
  const e = participante({ nome: 'Edu' });
  const h = participante({ nome: 'Helena' });
  const embaixador = participante({ nome: 'Tt Embaixador', ehEmbaixador: true, isento: true });
  const pendente = participante({ nome: 'Pedro', pagamentoStatus: 'PENDENTE', pagamentoConfirmadoEm: null });
  const excluido = participante({ nome: 'Participante removido', contaExcluida: true });
  const participantes = [a, b, c, d, e, h, embaixador, pendente, excluido];
  const dias = [
    ...[1, 2, 3, 4].map((n) => dia(a, n)),
    dia(b, 1),
    dia(b, 2),
    dia(b, 3, PARCIAL),
    dia(d, 3),
    dia(e, 5),
    dia(h, 1),
    dia(h, 2),
    dia(h, 4, { invalidado: true, concluido: false }),
  ];

  it('no dia 5: quem não concluiu os dias 3 e 4, mais dias sem concluir primeiro', () => {
    const m = metricas({ agora: em('2026-11-05', 9), participantes, dias });
    expect(m.emRisco).toEqual([
      { participanteId: c.id, nome: 'Caio', whatsapp: null, diasSemConcluir: 4, diasConcluidos: 0, ultimoDiaConcluido: null },
      { participanteId: e.id, nome: 'Edu', whatsapp: e.whatsapp, diasSemConcluir: 4, diasConcluidos: 1, ultimoDiaConcluido: 5 },
      { participanteId: b.id, nome: 'Bruna', whatsapp: '21987654321', diasSemConcluir: 2, diasConcluidos: 2, ultimoDiaConcluido: 2 },
      { participanteId: h.id, nome: 'Helena', whatsapp: h.whatsapp, diasSemConcluir: 2, diasConcluidos: 2, ultimoDiaConcluido: 2 },
    ]);
  });

  it('vazio nos dias 1 e 2 e depois do fim', () => {
    expect(metricas({ agora: em('2026-11-02', 23), participantes, dias: [] }).emRisco).toEqual([]);
    expect(metricas({ agora: em('2026-11-01', 8), participantes, dias: [] }).emRisco).toEqual([]);
    expect(metricas({ agora: em('2026-12-05', 10), participantes, dias }).emRisco).toEqual([]);
  });

  it('dia 3: entra quem não concluiu os dias 1 e 2 (dias futuros não contam); empate → menos dias concluídos', () => {
    const m = metricas({ agora: em('2026-11-03', 9), participantes, dias });
    expect(m.emRisco.map((r) => r.nome)).toEqual(['Caio', 'Edu', 'Duda']);
    expect(m.emRisco.every((r) => r.diasSemConcluir === 2)).toBe(true);
  });
});

describe('depois do fim', () => {
  it('séries cobrem todos os dias do desafio', () => {
    const a = participante();
    const m = metricas({ agora: em('2026-12-05', 10), participantes: [a], dias: [dia(a, 1), dia(a, 30)] });
    expect(m.desafio).toMatchObject({ status: 'ENCERRADO', diaAtual: null });
    expect(m.adesaoPorDia).toHaveLength(30);
    expect(m.adesaoPorDia[29]).toEqual({
      dia: 30,
      data: '2026-11-30',
      ativos: 1,
      comCheckin: 1,
      concluidos: 1,
      invalidados: 0,
    });
    expect(m.invictosPorDia).toHaveLength(30);
    expect(m.invictosPorDia[0]).toEqual({ dia: 1, participantes: 1 });
    expect(m.invictosPorDia[1]).toEqual({ dia: 2, participantes: 0 });
    expect(m.distribuicaoDiasConcluidos).toHaveLength(31);
    expect(m.distribuicaoDiasConcluidos[2]).toEqual({ dias: 2, participantes: 1 });
  });
});

describe('perfil', () => {
  it('faixas etárias (todas, na ordem), top cidades agrupadas sem acento e marketing; sem contas excluídas', () => {
    const participantes = [
      participante({ dataNascimento: '2008-10-31', aceitouMarketing: true }),
      participante({ dataNascimento: '2001-10-31', cidade: 'sao paulo ' }),
      participante({ dataNascimento: '2001-10-30', cidade: 'São  Paulo', aceitouMarketing: true }),
      participante({ dataNascimento: '1971-10-31', cidade: 'Campinas' }),
      participante({ dataNascimento: null, cidade: null, uf: null }),
      participante({ dataNascimento: '1990-01-01', cidade: 'São Paulo', uf: 'SP', contaExcluida: true }),
    ];
    const m = metricas({ agora: em('2026-10-31', 12), participantes });
    expect(m.perfil.total).toBe(5);
    expect(m.perfil.faixasEtarias).toEqual([
      { faixa: '18–24', participantes: 1 },
      { faixa: '25–34', participantes: 2 },
      { faixa: '35–44', participantes: 0 },
      { faixa: '45–54', participantes: 0 },
      { faixa: '55+', participantes: 1 },
      { faixa: 'Sem data', participantes: 1 },
    ]);
    expect(m.perfil.cidades).toEqual([
      { cidade: 'São Paulo', uf: 'SP', participantes: 3 },
      { cidade: 'Campinas', uf: 'SP', participantes: 1 },
    ]);
    expect(m.perfil.aceitaramMarketing).toBe(2);
  });

  it('só as 10 cidades com mais participantes; mesma cidade em UFs diferentes não se mistura', () => {
    const participantes = [
      ...Array.from({ length: 12 }, (_, i) => participante({ cidade: `Cidade ${String(i).padStart(2, '0')}` })),
      participante({ cidade: 'Cidade 11' }),
      participante({ cidade: 'Cidade 11', uf: 'RJ' }),
    ];
    const cidades = metricas({ participantes }).perfil.cidades;
    expect(cidades).toHaveLength(10);
    expect(cidades[0]).toEqual({ cidade: 'Cidade 11', uf: 'SP', participantes: 2 });
    expect(cidades[1]).toEqual({ cidade: 'Cidade 00', uf: 'SP', participantes: 1 });
  });
});

describe('inscrições por data', () => {
  it('dias corridos no fuso do desafio, do primeiro evento até hoje, sem acumular', () => {
    const participantes = [
      // 23h de 27/10 em São Paulo (já 28/10 em UTC).
      participante({ dataInscricao: new Date('2026-10-28T02:00:00Z'), pagamentoConfirmadoEm: null, pagamentoStatus: 'PENDENTE' }),
      participante({ dataInscricao: em('2026-10-29', 9), pagamentoConfirmadoEm: em('2026-10-30', 9) }),
      participante({ dataInscricao: em('2026-10-29', 20), pagamentoStatus: 'INFORMADO', pagamentoConfirmadoEm: null }),
    ];
    const m = metricas({ agora: em('2026-10-31', 12), participantes });
    expect(m.inscricoesPorData).toEqual([
      { data: '2026-10-27', inscricoes: 1, confirmacoes: 0 },
      { data: '2026-10-28', inscricoes: 0, confirmacoes: 0 },
      { data: '2026-10-29', inscricoes: 2, confirmacoes: 0 },
      { data: '2026-10-30', inscricoes: 0, confirmacoes: 1 },
      { data: '2026-10-31', inscricoes: 0, confirmacoes: 0 },
    ]);
  });

  it('vazio sem inscrições; desafio encerrado vai até o último dia', () => {
    expect(metricas({}).inscricoesPorData).toEqual([]);
    const p = participante({ dataInscricao: em('2026-11-28', 9), pagamentoConfirmadoEm: em('2026-11-29', 9) });
    const serie = metricas({ agora: em('2027-03-01', 9), participantes: [p] }).inscricoesPorData;
    expect(serie.map((s) => s.data)).toEqual(['2026-11-28', '2026-11-29', '2026-11-30']);
  });
});

describe('feedback', () => {
  it('média com 1 casa, distribuição de 1 a 5 e autorizações', () => {
    const m = metricas({
      feedbacks: [
        { nota: 5, autorizaDivulgacao: true },
        { nota: 4, autorizaDivulgacao: false },
        { nota: 4, autorizaDivulgacao: true },
      ],
    });
    expect(m.feedback).toEqual({
      respostas: 3,
      notaMedia: 4.3,
      distribuicao: [
        { nota: 1, respostas: 0 },
        { nota: 2, respostas: 0 },
        { nota: 3, respostas: 0 },
        { nota: 4, respostas: 2 },
        { nota: 5, respostas: 1 },
      ],
      autorizamDivulgacao: 2,
    });
    expect(metricas({}).feedback.notaMedia).toBeNull();
  });
});
