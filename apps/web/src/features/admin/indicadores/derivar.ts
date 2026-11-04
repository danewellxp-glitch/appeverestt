import type { AdminMetricas, MetricaDia, Requisito } from '@everest/shared';
import { acumular, indiceDoMaior, percentual } from '../graficos/escalas';
import { ROTULO_REQUISITO } from '../graficos/formato';

/** Indicadores derivados de `AdminMetricas` (funções puras: a tela só formata e desenha). */

export interface EtapaFunil {
  chave: keyof AdminMetricas['funil'];
  rotulo: string;
  valor: number;
  /** Conversão a partir da etapa anterior (null na primeira ou com a anterior zerada). */
  pctAnterior: number | null;
  /** Fatia do topo do funil. */
  pctTopo: number | null;
}

const ROTULOS_FUNIL: { chave: keyof AdminMetricas['funil']; rotulo: string }[] = [
  { chave: 'contas', rotulo: 'Contas no app' },
  { chave: 'cadastrosCompletos', rotulo: 'Cadastro completo' },
  { chave: 'inscritos', rotulo: 'Inscritos' },
  { chave: 'informaram', rotulo: 'Avisaram o pagamento' },
  { chave: 'confirmados', rotulo: 'Confirmados' },
];

export function etapasFunil(funil: AdminMetricas['funil']): EtapaFunil[] {
  const topo = funil.contas;
  return ROTULOS_FUNIL.map(({ chave, rotulo }, i) => {
    const anterior = i > 0 ? ROTULOS_FUNIL[i - 1] : undefined;
    return {
      chave,
      rotulo,
      valor: funil[chave],
      pctAnterior: anterior ? percentual(funil[chave], funil[anterior.chave]) : null,
      pctTopo: percentual(funil[chave], topo),
    };
  });
}

/** Etapa com a maior perda em relação à anterior (onde as pessoas mais desistem). */
export function maiorQuedaFunil(etapas: readonly EtapaFunil[]): EtapaFunil | null {
  let pior: EtapaFunil | null = null;
  for (const e of etapas) {
    if (e.pctAnterior === null) continue;
    if (!pior || e.pctAnterior < (pior.pctAnterior ?? 100)) pior = e;
  }
  return pior && (pior.pctAnterior ?? 100) < 100 ? pior : null;
}

/** O dia mais recente da série de adesão (hoje, durante o desafio; o último, depois). */
export function diaMaisRecente(m: AdminMetricas): MetricaDia | null {
  return m.adesaoPorDia.at(-1) ?? null;
}

export interface Adesao {
  dia: MetricaDia;
  pctConcluidos: number | null;
  pctCheckin: number | null;
}

export function adesaoDoDia(dia: MetricaDia | null): Adesao | null {
  if (!dia) return null;
  return {
    dia,
    pctConcluidos: percentual(dia.concluidos, dia.ativos),
    pctCheckin: percentual(dia.comCheckin, dia.ativos),
  };
}

/** Invictos no dia mais recente e a fatia dos ativos. */
export function invictosAtuais(
  m: AdminMetricas,
): { participantes: number; pct: number | null; dia: number } | null {
  const ultimo = m.invictosPorDia.at(-1);
  if (!ultimo) return null;
  const ativos = m.adesaoPorDia.find((d) => d.dia === ultimo.dia)?.ativos ?? m.funil.confirmados;
  return {
    participantes: ultimo.participantes,
    pct: percentual(ultimo.participantes, ativos),
    dia: ultimo.dia,
  };
}

/** Média ponderada de dias concluídos por participante ativo (null sem participantes). */
export function mediaDiasConcluidos(
  distribuicao: AdminMetricas['distribuicaoDiasConcluidos'],
): number | null {
  let pessoas = 0;
  let dias = 0;
  for (const d of distribuicao) {
    pessoas += d.participantes;
    dias += d.dias * d.participantes;
  }
  return pessoas > 0 ? dias / pessoas : null;
}

export interface RequisitoPct {
  requisito: Requisito;
  rotulo: string;
  cumpridos: number;
  total: number;
  pct: number | null;
}

/** Requisitos do menos cumprido (o hábito mais difícil) para o mais cumprido. */
export function requisitosPorDificuldade(requisitos: AdminMetricas['requisitos']): RequisitoPct[] {
  return requisitos
    .map((r) => ({
      requisito: r.requisito,
      rotulo: ROTULO_REQUISITO[r.requisito],
      cumpridos: r.cumpridos,
      total: r.total,
      pct: percentual(r.cumpridos, r.total),
    }))
    .sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101));
}

export interface SerieInscricoes {
  datas: string[];
  inscricoes: number[];
  confirmacoes: number[];
  inscricoesAcumuladas: number[];
  confirmacoesAcumuladas: number[];
}

export function serieInscricoes(lista: AdminMetricas['inscricoesPorData']): SerieInscricoes {
  const inscricoes = lista.map((d) => d.inscricoes);
  const confirmacoes = lista.map((d) => d.confirmacoes);
  return {
    datas: lista.map((d) => d.data),
    inscricoes,
    confirmacoes,
    inscricoesAcumuladas: acumular(inscricoes),
    confirmacoesAcumuladas: acumular(confirmacoes),
  };
}

/** Hora com mais check-ins (null sem check-ins). */
export function horaDePico(
  lista: AdminMetricas['checkinsPorHora'],
): { hora: number; checkins: number; pct: number | null } | null {
  const valores = lista.map((h) => h.checkins);
  const i = indiceDoMaior(valores);
  const pico = i >= 0 ? lista[i] : undefined;
  if (!pico) return null;
  const total = valores.reduce((s, v) => s + v, 0);
  return { hora: pico.hora, checkins: pico.checkins, pct: percentual(pico.checkins, total) };
}

/** 24 posições (0–23), mesmo se a API mandar horas faltando. */
export function checkinsPor24Horas(lista: AdminMetricas['checkinsPorHora']): number[] {
  const horas = Array.from({ length: 24 }, () => 0);
  for (const h of lista) if (h.hora >= 0 && h.hora < 24) horas[h.hora] = h.checkins;
  return horas;
}

/** Nota média com uma casa a partir da distribuição (usado quando a API não manda a média). */
export function notaMediaDaDistribuicao(
  distribuicao: AdminMetricas['feedback']['distribuicao'],
): number | null {
  let respostas = 0;
  let soma = 0;
  for (const d of distribuicao) {
    respostas += d.respostas;
    soma += d.nota * d.respostas;
  }
  return respostas > 0 ? Math.round((soma / respostas) * 10) / 10 : null;
}

/** Feedback de 5 a 1 estrela, sempre com as 5 notas. */
export function distribuicaoNotas(
  distribuicao: AdminMetricas['feedback']['distribuicao'],
): { nota: number; respostas: number }[] {
  return [5, 4, 3, 2, 1].map((nota) => ({
    nota,
    respostas: distribuicao.find((d) => d.nota === nota)?.respostas ?? 0,
  }));
}
