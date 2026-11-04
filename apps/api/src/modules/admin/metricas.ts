// Indicadores do painel do admin (GET /admin/desafios/:slug/metricas). Funções puras: o serviço
// carrega as linhas do banco e tudo é calculado aqui (volume pequeno: ≤ alguns milhares de dias).
// Bases:
// - "Ativos" = pagamento CONFIRMADO e conta não excluída (quem pode fazer check-in). Adesão por dia,
//   invictos, distribuição e "em risco" olham só os ativos e os dias deles.
// - Requisitos, somatórios, conferência e horários olham todos os dias do desafio (a conferência
//   bate com a fila "para revisar" da lista de participantes).
// - Datas e horas no fuso do desafio.
import {
  REQUISITOS,
  calcularDiaAtual,
  contarFotosDistintas,
  dataDoDia,
  diferencaEmDias,
  hojeNoFuso,
  idadeEm,
  requisitosPendentes,
  somarDias,
  type AdminMetricas,
  type MetricaDia,
  type StatusDesafio,
  type StatusPagamento,
  type TipoFoto,
} from '@everest/shared';

export interface ParticipanteMetricas {
  id: string;
  nome: string;
  whatsapp: string | null;
  ehEmbaixador: boolean;
  /**
   * Não paga a inscrição: o embaixador e o admin que se inscreveu sem avisar Pix (nasce com o
   * pagamento confirmado). Fica fora da receita; no funil conta em todas as etapas (pula o aviso).
   */
  isento: boolean;
  vagaNumero: number | null;
  dataInscricao: Date;
  pagamentoStatus: StatusPagamento;
  pagamentoInformadoEm: Date | null;
  pagamentoConfirmadoEm: Date | null;
  /** 'YYYY-MM-DD' */
  dataNascimento: string | null;
  cidade: string | null;
  uf: string | null;
  aceitouMarketing: boolean;
  contaExcluida: boolean;
}

export interface DiaMetricas {
  participanteId: string;
  numeroDia: number;
  aguaMl: number;
  exercicio: boolean;
  paginasLidas: number;
  storyPostado: boolean;
  /** Campo derivado gravado pelo `recalcularDia` (fonte única da conclusão). */
  concluido: boolean;
  invalidado: boolean;
  conferido: boolean;
  atualizadoEm: Date;
  /** Tipos com foto ENVIADA ou CONFIRMADA (as que contam para a conclusão). */
  fotosValidas: TipoFoto[];
}

export interface EntradaMetricas {
  agora: Date;
  desafio: {
    slug: string;
    nome: string;
    /** 'YYYY-MM-DD' */
    dataInicio: string;
    totalDias: number;
    totalVagas: number;
    timezone: string;
  };
  /** null quando o Pix não está configurado (a receita sai zerada). */
  valorInscricaoCentavos: number | null;
  /** Contas não excluídas. */
  contas: number;
  /** Contas com o perfil completo (`perfilEstaCompleto`). */
  cadastrosCompletos: number;
  participantes: ParticipanteMetricas[];
  dias: DiaMetricas[];
  feedbacks: { nota: number; autorizaDivulgacao: boolean }[];
}

export const FAIXAS_ETARIAS = ['18–24', '25–34', '35–44', '45–54', '55+', 'Sem data'] as const;
export type FaixaEtaria = (typeof FAIXAS_ETARIAS)[number];

const HORA_MS = 60 * 60 * 1000;
const TOP_CIDADES = 10;

const umaCasa = (n: number): number => Math.round(n * 10) / 10;
const media = (valores: readonly number[]): number | null =>
  valores.length === 0 ? null : valores.reduce((s, v) => s + v, 0) / valores.length;

/** Último dia já começado: o dia atual em andamento, todos depois do fim, 0 antes do início. */
export function diaLimite(status: StatusDesafio, diaAtual: number | null, totalDias: number): number {
  if (status === 'EM_ANDAMENTO') return diaAtual ?? 0;
  if (status === 'ENCERRADO') return totalDias;
  return 0;
}

const formatadoresHora = new Map<string, Intl.DateTimeFormat>();

/** Hora (0–23) do instante no fuso informado. */
export function horaNoFuso(instante: Date, timezone: string): number {
  let f = formatadoresHora.get(timezone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: '2-digit', hourCycle: 'h23' });
    formatadoresHora.set(timezone, f);
  }
  const hora = f.formatToParts(instante).find((p) => p.type === 'hour')?.value;
  return Number(hora) % 24;
}

/** Faixa etária pela idade em `hoje` ('YYYY-MM-DD'). O cadastro exige 18+, então não há faixa abaixo. */
export function faixaEtaria(dataNascimento: string | null, hoje: string): FaixaEtaria {
  if (!dataNascimento) return 'Sem data';
  const idade = idadeEm(dataNascimento, hoje);
  if (idade < 25) return '18–24';
  if (idade < 35) return '25–34';
  if (idade < 45) return '35–44';
  if (idade < 55) return '45–54';
  return '55+';
}

/** "São Paulo " e "sao paulo" são a mesma cidade (sem acento, minúsculo, espaços simples). */
function chaveCidade(cidade: string, uf: string | null): string {
  const nome = cidade
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  return `${nome}|${uf ?? ''}`;
}

function contarPor<T>(itens: readonly T[], chave: (item: T) => string): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const item of itens) {
    const k = chave(item);
    mapa.set(k, (mapa.get(k) ?? 0) + 1);
  }
  return mapa;
}

const concluiu = (d: DiaMetricas): boolean => d.concluido && !d.invalidado;

function cidadesMaisComuns(participantes: readonly ParticipanteMetricas[]): AdminMetricas['perfil']['cidades'] {
  const grupos = new Map<string, { uf: string | null; total: number; grafias: Map<string, number> }>();
  for (const p of participantes) {
    const cidade = p.cidade?.trim().replace(/\s+/g, ' ');
    if (!cidade) continue;
    const uf = p.uf?.trim().toUpperCase() || null;
    const k = chaveCidade(cidade, uf);
    const g = grupos.get(k) ?? { uf, total: 0, grafias: new Map<string, number>() };
    g.total += 1;
    g.grafias.set(cidade, (g.grafias.get(cidade) ?? 0) + 1);
    grupos.set(k, g);
  }
  return [...grupos.values()]
    .map((g) => {
      // A grafia mais usada vira o rótulo (empate: a primeira que apareceu).
      let cidade = '';
      let maior = 0;
      for (const [grafia, n] of g.grafias) {
        if (n > maior) [cidade, maior] = [grafia, n];
      }
      return { cidade, uf: g.uf, participantes: g.total };
    })
    .sort((a, b) => b.participantes - a.participantes || a.cidade.localeCompare(b.cidade, 'pt-BR'))
    .slice(0, TOP_CIDADES);
}

function inscricoesPorData(
  participantes: readonly ParticipanteMetricas[],
  timezone: string,
  fimDoDesafio: string,
  hoje: string,
): AdminMetricas['inscricoesPorData'] {
  const inscricoes = contarPor(participantes, (p) => hojeNoFuso(p.dataInscricao, timezone));
  const confirmadas = participantes.filter((p) => p.pagamentoConfirmadoEm !== null);
  const confirmacoes = contarPor(confirmadas, (p) => hojeNoFuso(p.pagamentoConfirmadoEm as Date, timezone));
  const datas = [...inscricoes.keys(), ...confirmacoes.keys()].sort();
  const primeira = datas[0];
  const ultima = datas[datas.length - 1];
  if (!primeira || !ultima) return [];
  // Até hoje; num desafio encerrado, até o último dia (ou a última confirmação, se veio depois).
  const ateHoje = hoje < fimDoDesafio ? hoje : fimDoDesafio;
  const fim = ateHoje > ultima ? ateHoje : ultima;
  const serie: AdminMetricas['inscricoesPorData'] = [];
  for (let i = 0; i <= diferencaEmDias(primeira, fim); i++) {
    const data = somarDias(primeira, i);
    serie.push({ data, inscricoes: inscricoes.get(data) ?? 0, confirmacoes: confirmacoes.get(data) ?? 0 });
  }
  return serie;
}

/** Monta o `AdminMetricas` a partir das linhas já carregadas. */
export function calcularMetricas(e: EntradaMetricas): AdminMetricas {
  const { agora, desafio: d } = e;
  const tempo = calcularDiaAtual(d.dataInicio, agora, d.timezone, d.totalDias);
  const limite = diaLimite(tempo.status, tempo.numeroDia, d.totalDias);
  const hoje = hojeNoFuso(agora, d.timezone);
  const dataFim = somarDias(d.dataInicio, d.totalDias - 1);
  const valor = e.valorInscricaoCentavos ?? 0;

  const ps = e.participantes;
  const pagantes = ps.filter((p) => !p.isento);
  const comStatus = (lista: readonly ParticipanteMetricas[], s: StatusPagamento): ParticipanteMetricas[] =>
    lista.filter((p) => p.pagamentoStatus === s);
  const informados = comStatus(ps, 'INFORMADO');
  const ativos = ps.filter((p) => p.pagamentoStatus === 'CONFIRMADO' && !p.contaExcluida);
  const ocupadas = ps.filter((p) => p.vagaNumero !== null).length;

  // Dias concluídos (1..limite) de cada ativo.
  const concluidosPor = new Map<string, Set<number>>(ativos.map((p) => [p.id, new Set<number>()]));
  const diasDosAtivos = e.dias.filter((x) => concluidosPor.has(x.participanteId));
  for (const x of diasDosAtivos) {
    if (concluiu(x) && x.numeroDia >= 1 && x.numeroDia <= limite) concluidosPor.get(x.participanteId)?.add(x.numeroDia);
  }
  const concluidosDe = (id: string): Set<number> => concluidosPor.get(id) ?? new Set<number>();

  // ---------------------------------------------------------------- adesão
  const adesaoPorDia: MetricaDia[] = [];
  const doDia = new Map<number, DiaMetricas[]>();
  for (const x of diasDosAtivos) {
    const linhas = doDia.get(x.numeroDia);
    if (linhas) linhas.push(x);
    else doDia.set(x.numeroDia, [x]);
  }
  for (let n = 1; n <= limite; n++) {
    const linhas = doDia.get(n) ?? [];
    adesaoPorDia.push({
      dia: n,
      data: dataDoDia(d.dataInicio, n),
      ativos: ativos.length,
      comCheckin: linhas.length,
      concluidos: linhas.filter(concluiu).length,
      invalidados: linhas.filter((x) => x.invalidado).length,
    });
  }

  // Invicto até n = concluiu 1..n. `primeiraFalha` = primeiro dia não concluído (limite + 1 se nenhum).
  const primeiraFalha = ativos.map((p) => {
    const c = concluidosDe(p.id);
    let n = 1;
    while (n <= limite && c.has(n)) n++;
    return n;
  });
  const invictosPorDia = Array.from({ length: limite }, (_, i) => ({
    dia: i + 1,
    participantes: primeiraFalha.filter((f) => f > i + 1).length,
  }));

  const porQuantidade = contarPor(ativos, (p) => String(concluidosDe(p.id).size));
  const distribuicaoDiasConcluidos = Array.from({ length: limite + 1 }, (_, dias) => ({
    dias,
    participantes: porQuantidade.get(String(dias)) ?? 0,
  }));

  // Em risco: nenhum dos 2 dias anteriores ao atual concluído (só com o desafio em andamento, do dia 3
  // em diante). O embaixador fica de fora: a lista é para ele chamar os outros no WhatsApp.
  const emRisco: AdminMetricas['emRisco'] = [];
  if (tempo.status === 'EM_ANDAMENTO' && tempo.numeroDia !== null && tempo.numeroDia >= 3) {
    const ontem = tempo.numeroDia - 1;
    for (const p of ativos) {
      if (p.ehEmbaixador) continue;
      const c = concluidosDe(p.id);
      if (c.has(ontem) || c.has(ontem - 1)) continue;
      let diasSemConcluir = 0;
      for (let n = ontem; n >= 1 && !c.has(n); n--) diasSemConcluir++;
      emRisco.push({
        participanteId: p.id,
        nome: p.nome,
        whatsapp: p.whatsapp,
        diasSemConcluir,
        diasConcluidos: c.size,
        ultimoDiaConcluido: c.size === 0 ? null : Math.max(...c),
      });
    }
    emRisco.sort(
      (a, b) =>
        b.diasSemConcluir - a.diasSemConcluir ||
        a.diasConcluidos - b.diasConcluidos ||
        a.nome.localeCompare(b.nome, 'pt-BR'),
    );
  }

  // ---------------------------------------------------------------- check-ins (todos os dias)
  const validos = e.dias.filter((x) => !x.invalidado);
  const pendentes = validos.map((x) => requisitosPendentes(x));
  const requisitos = REQUISITOS.map((requisito) => ({
    requisito,
    cumpridos: pendentes.filter((p) => !p.includes(requisito)).length,
    total: validos.length,
  }));

  const porHora = contarPor(validos, (x) => String(horaNoFuso(x.atualizadoEm, d.timezone)));
  const checkinsPorHora = Array.from({ length: 24 }, (_, hora) => ({
    hora,
    checkins: porHora.get(String(hora)) ?? 0,
  }));

  const concluidosTodos = e.dias.filter(concluiu);
  const conferidos = concluidosTodos.filter((x) => x.conferido).length;

  // ---------------------------------------------------------------- pagamentos
  const horasAteConfirmar = pagantes
    .filter((p) => p.pagamentoStatus === 'CONFIRMADO' && p.pagamentoInformadoEm && p.pagamentoConfirmadoEm)
    .map((p) => ((p.pagamentoConfirmadoEm as Date).getTime() - (p.pagamentoInformadoEm as Date).getTime()) / HORA_MS)
    .filter((h) => h >= 0);
  const mediaAteConfirmar = media(horasAteConfirmar);
  const avisosNaFila = informados
    .map((p) => p.pagamentoInformadoEm?.getTime())
    .filter((t): t is number => t !== undefined);
  const avisoMaisAntigo = avisosNaFila.length === 0 ? null : Math.min(...avisosNaFila);

  // ---------------------------------------------------------------- perfil e feedback
  const comConta = ps.filter((p) => !p.contaExcluida);
  const porFaixa = contarPor(comConta, (p) => faixaEtaria(p.dataNascimento, hoje));
  const notas = e.feedbacks.map((f) => f.nota);
  const notaMedia = media(notas);

  return {
    geradoEm: agora.toISOString(),
    desafio: {
      slug: d.slug,
      nome: d.nome,
      dataInicio: d.dataInicio,
      dataFim,
      totalDias: d.totalDias,
      diaAtual: tempo.numeroDia,
      status: tempo.status,
      totalVagas: d.totalVagas,
      valorInscricaoCentavos: e.valorInscricaoCentavos,
    },
    funil: {
      contas: e.contas,
      cadastrosCompletos: e.cadastrosCompletos,
      inscritos: ps.length,
      // Monotônico: inscritos ≥ informaram ≥ confirmados (quem é isento pula o aviso e conta aqui).
      informaram: ps.filter((p) => p.pagamentoStatus !== 'PENDENTE').length,
      confirmados: comStatus(ps, 'CONFIRMADO').length,
    },
    vagas: { total: d.totalVagas, ocupadas, livres: Math.max(0, d.totalVagas - ocupadas) },
    receita: {
      confirmadaCentavos: comStatus(pagantes, 'CONFIRMADO').length * valor,
      aguardandoConferenciaCentavos: comStatus(pagantes, 'INFORMADO').length * valor,
      pendenteCentavos: comStatus(pagantes, 'PENDENTE').length * valor,
    },
    pagamentos: {
      aguardandoConferencia: informados.length,
      horasMediasAteConfirmar: mediaAteConfirmar === null ? null : umaCasa(mediaAteConfirmar),
      horasEsperaMaisAntiga:
        avisoMaisAntigo === null ? null : umaCasa(Math.max(0, agora.getTime() - avisoMaisAntigo) / HORA_MS),
    },
    inscricoesPorData: inscricoesPorData(ps, d.timezone, dataFim, hoje),
    adesaoPorDia,
    requisitos,
    invictosPorDia,
    distribuicaoDiasConcluidos,
    checkinsPorHora,
    conferencia: {
      concluidos: concluidosTodos.length,
      conferidos,
      aguardando: concluidosTodos.length - conferidos,
      invalidados: e.dias.filter((x) => x.invalidado).length,
    },
    emRisco,
    perfil: {
      total: comConta.length,
      faixasEtarias: FAIXAS_ETARIAS.map((faixa) => ({ faixa, participantes: porFaixa.get(faixa) ?? 0 })),
      cidades: cidadesMaisComuns(comConta),
      aceitaramMarketing: comConta.filter((p) => p.aceitouMarketing).length,
    },
    totais: {
      aguaLitros: umaCasa(validos.reduce((s, x) => s + x.aguaMl, 0) / 1000),
      paginasLidas: validos.reduce((s, x) => s + x.paginasLidas, 0),
      treinos: validos.filter((x) => x.exercicio).length,
      stories: validos.filter((x) => x.storyPostado).length,
      fotos: validos.reduce((s, x) => s + contarFotosDistintas(x.fotosValidas), 0),
      diasConcluidos: concluidosTodos.length,
    },
    feedback: {
      respostas: notas.length,
      notaMedia: notaMedia === null ? null : umaCasa(notaMedia),
      distribuicao: [1, 2, 3, 4, 5].map((nota) => ({ nota, respostas: notas.filter((n) => n === nota).length })),
      autorizamDivulgacao: e.feedbacks.filter((f) => f.autorizaDivulgacao).length,
    },
  };
}
