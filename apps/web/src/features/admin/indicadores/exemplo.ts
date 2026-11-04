import type { AdminMetricas } from '@everest/shared';

/**
 * Métricas de exemplo, determinísticas (só para os testes): desafio no dia 12 de 30,
 * 42 de 50 vagas ocupadas, Pix de R$ 50,00.
 */
export function metricasExemplo(sobrescrever: Partial<AdminMetricas> = {}): AdminMetricas {
  const diaAtual = 12;
  const ativos = 36;
  const adesaoPorDia = Array.from({ length: diaAtual }, (_, i) => {
    const dia = i + 1;
    const concluidos = Math.max(8, 34 - i * 2);
    return {
      dia,
      data: `2026-11-${String(dia).padStart(2, '0')}`,
      ativos,
      comCheckin: Math.min(ativos, concluidos + 3),
      concluidos: dia === diaAtual ? 11 : concluidos,
      invalidados: dia % 5 === 0 ? 1 : 0,
    };
  });
  return {
    geradoEm: '2026-11-12T17:05:00.000Z',
    desafio: {
      slug: 'desafio-teste',
      nome: 'Desafio Teste',
      dataInicio: '2026-11-01',
      dataFim: '2026-11-30',
      totalDias: 30,
      diaAtual,
      status: 'EM_ANDAMENTO',
      totalVagas: 50,
      valorInscricaoCentavos: 5000,
    },
    funil: { contas: 120, cadastrosCompletos: 90, inscritos: 42, informaram: 38, confirmados: 36 },
    vagas: { total: 50, ocupadas: 42, livres: 8 },
    receita: {
      confirmadaCentavos: 175_000,
      aguardandoConferenciaCentavos: 15_000,
      pendenteCentavos: 20_000,
    },
    pagamentos: {
      aguardandoConferencia: 3,
      horasMediasAteConfirmar: 5.5,
      horasEsperaMaisAntiga: 26,
    },
    inscricoesPorData: [
      { data: '2026-10-20', inscricoes: 12, confirmacoes: 4 },
      { data: '2026-10-21', inscricoes: 8, confirmacoes: 10 },
      { data: '2026-10-22', inscricoes: 0, confirmacoes: 3 },
      { data: '2026-10-23', inscricoes: 15, confirmacoes: 9 },
      { data: '2026-10-24', inscricoes: 7, confirmacoes: 10 },
    ],
    adesaoPorDia,
    requisitos: [
      { requisito: 'AGUA', cumpridos: 300, total: 330 },
      { requisito: 'EXERCICIO', cumpridos: 280, total: 330 },
      { requisito: 'LEITURA', cumpridos: 210, total: 330 },
      { requisito: 'FOTOS', cumpridos: 250, total: 330 },
      { requisito: 'STORY', cumpridos: 230, total: 330 },
    ],
    invictosPorDia: adesaoPorDia.map((d) => ({
      dia: d.dia,
      participantes: Math.max(4, 34 - d.dia * 3),
    })),
    distribuicaoDiasConcluidos: Array.from({ length: diaAtual + 1 }, (_, dias) => ({
      dias,
      participantes: dias === 0 ? 2 : dias >= 9 ? 5 : 1,
    })),
    checkinsPorHora: Array.from({ length: 24 }, (_, hora) => ({
      hora,
      checkins: hora < 6 ? 0 : hora === 21 ? 60 : hora >= 18 ? 30 : 10,
    })),
    conferencia: { concluidos: 250, conferidos: 200, aguardando: 50, invalidados: 2 },
    emRisco: [
      {
        participanteId: 'p1',
        nome: 'Ana Souza',
        whatsapp: '11987654321',
        diasSemConcluir: 4,
        diasConcluidos: 7,
        ultimoDiaConcluido: 7,
      },
      {
        participanteId: 'p2',
        nome: 'Bruno Lima',
        whatsapp: null,
        diasSemConcluir: 2,
        diasConcluidos: 9,
        ultimoDiaConcluido: 9,
      },
    ],
    perfil: {
      total: 42,
      faixasEtarias: [
        { faixa: '18–24', participantes: 6 },
        { faixa: '25–34', participantes: 15 },
        { faixa: '35–44', participantes: 12 },
        { faixa: '45–54', participantes: 5 },
        { faixa: '55+', participantes: 2 },
        { faixa: 'Sem data', participantes: 2 },
      ],
      cidades: [
        { cidade: 'São Paulo', uf: 'SP', participantes: 18 },
        { cidade: 'Campinas', uf: 'SP', participantes: 7 },
        { cidade: 'Curitiba', uf: 'PR', participantes: 4 },
      ],
      aceitaramMarketing: 30,
    },
    totais: {
      aguaLitros: 1234.5,
      paginasLidas: 4321,
      treinos: 310,
      stories: 280,
      fotos: 950,
      diasConcluidos: 250,
    },
    feedback: {
      respostas: 4,
      notaMedia: 4.5,
      distribuicao: [
        { nota: 5, respostas: 2 },
        { nota: 4, respostas: 2 },
      ],
      autorizamDivulgacao: 3,
    },
    ...sobrescrever,
  };
}
