// Comportamento dos VUs (partes puras: nada de rede/banco aqui, para poder testar).
import { METAS, TIPOS_FOTO, type TipoFoto } from '@everest/shared';
import {
  type Aleatorio,
  chance,
  criarAleatorio,
  escolherVarios,
  inteiroEntre,
  sortearPonderado,
} from './aleatorio';

// ------------------------------------------------------------------ persona

export const PERSONAS = ['DEDICADO', 'REGULAR', 'IRREGULAR', 'DESISTENTE'] as const;
export type Persona = (typeof PERSONAS)[number];

/**
 * Chance de concluir o DIA inteiro (os 5 requisitos). O desistente se comporta como regular até
 * desistir. Sortear por dia (e não por requisito) deixa a adesão parecida com a de um desafio real:
 * com chance por requisito, 0,9^5 daria só ~59% de dias completos até para o dedicado.
 */
export const CHANCE_CONCLUIR_DIA: Record<Persona, number> = {
  DEDICADO: 0.88,
  REGULAR: 0.62,
  IRREGULAR: 0.35,
  DESISTENTE: 0.6,
};

/** Num dia que NÃO vai ser concluído, a chance de cada requisito sair mesmo assim (ao menos um falta). */
export const CHANCE_REQUISITO_DIA_PARCIAL = 0.55;

const PESOS_PERSONA: readonly (readonly [Persona, number])[] = [
  ['DEDICADO', 30],
  ['REGULAR', 35],
  ['IRREGULAR', 20],
  ['DESISTENTE', 15],
];

export interface PerfilVu {
  persona: Persona;
  /** Desistente: último dia em que ainda faz alguma coisa (sorteado entre 3 e 10). */
  ultimoDiaAtivo: number | null;
}

/** Persona fixa do VU, sorteada a partir do e-mail (a mesma em todas as rodadas). */
export function perfilDoVu(email: string): PerfilVu {
  const rng = criarAleatorio(`persona:${email}`);
  const persona = sortearPonderado(rng, PESOS_PERSONA);
  return { persona, ultimoDiaAtivo: persona === 'DESISTENTE' ? inteiroEntre(rng, 3, 10) : null };
}

export function estaAtivoNoDia(perfil: PerfilVu, numeroDia: number): boolean {
  return perfil.ultimoDiaAtivo === null || numeroDia <= perfil.ultimoDiaAtivo;
}

// ------------------------------------------------------------------ pagamento

export type GrupoPagamento = 'CONFIRMADO' | 'INFORMADO' | 'PENDENTE';

/** ~75% confirmados pelo "admin", ~15% avisaram (fila do painel), ~10% pendentes. */
export function grupoPagamento(email: string): GrupoPagamento {
  const u = criarAleatorio(`pagamento:${email}`)();
  if (u < 0.75) return 'CONFIRMADO';
  if (u < 0.9) return 'INFORMADO';
  return 'PENDENTE';
}

/** Por rodada (de 15 min), a chance de um VU pendente apertar "Já fiz o pagamento". */
export const CHANCE_AVISAR_PAGAMENTO = 0.005;

// ------------------------------------------------------------------ plano do dia

export interface PlanoDia {
  /** Total de água que o VU vai registrar hoje (>= 3000 = cumpre). */
  aguaMl: number;
  exercicio: boolean;
  /** Total de páginas que vai registrar hoje (>= 10 = cumpre). */
  paginas: number;
  story: boolean;
  /** Fotos que vai enviar hoje (as 3 = cumpre). */
  fotos: TipoFoto[];
}

/**
 * O que o VU vai fazer no dia `numeroDia`. Determinístico (e-mail + dia): todas as rodadas do
 * mesmo dia enxergam o mesmo plano. Primeiro sorteia se o dia é concluído (chance da persona); se
 * não for, cada requisito sai com CHANCE_REQUISITO_DIA_PARCIAL e um deles, sorteado, sempre falta.
 */
export function planoDoDia(email: string, numeroDia: number, persona: Persona): PlanoDia {
  const rng = criarAleatorio(`plano:${email}:${numeroDia}`);
  // Sorteios sempre na mesma ordem e em número fixo (o plano não depende de nada além da semente).
  const concluiDia = chance(rng, CHANCE_CONCLUIR_DIA[persona]);
  const parciais = Array.from({ length: 5 }, () => chance(rng, CHANCE_REQUISITO_DIA_PARCIAL));
  const faltaForcada = inteiroEntre(rng, 0, 4);
  const cumpre = (i: number) => concluiDia || (parciais[i] === true && i !== faltaForcada);
  const cumpreAgua = cumpre(0);
  const cumpreExercicio = cumpre(1);
  const cumpreLeitura = cumpre(2);
  const cumpreFotos = cumpre(3);
  const cumpreStory = cumpre(4);
  const aguaCheia = METAS.aguaMl + 250 * inteiroEntre(rng, 0, 4);
  const aguaParcial = chance(rng, 0.6) ? 250 * inteiroEntre(rng, 1, METAS.aguaMl / 250 - 1) : 0;
  const paginasCheias = inteiroEntre(rng, METAS.paginas, METAS.paginas * 3);
  const paginasParciais = chance(rng, 0.5) ? inteiroEntre(rng, 1, METAS.paginas - 1) : 0;
  const algumasFotos = TIPOS_FOTO.filter(() => chance(rng, 0.4));
  const fotosParciais =
    algumasFotos.length === TIPOS_FOTO.length ? algumasFotos.slice(0, 2) : algumasFotos;
  return {
    aguaMl: cumpreAgua ? aguaCheia : aguaParcial,
    exercicio: cumpreExercicio,
    paginas: cumpreLeitura ? paginasCheias : paginasParciais,
    story: cumpreStory,
    fotos: cumpreFotos ? [...TIPOS_FOTO] : fotosParciais,
  };
}

// ------------------------------------------------------------------ tarefas e horários

export const TAREFAS = [
  'AGUA',
  'EXERCICIO',
  'LEITURA',
  'STORY',
  'FOTO_AGUA',
  'FOTO_EXERCICIO',
  'FOTO_LEITURA',
] as const;
export type Tarefa = (typeof TAREFAS)[number];

export function tipoDaFoto(tarefa: Tarefa): TipoFoto | null {
  switch (tarefa) {
    case 'FOTO_AGUA':
      return 'AGUA';
    case 'FOTO_EXERCICIO':
      return 'EXERCICIO';
    case 'FOTO_LEITURA':
      return 'LEITURA';
    default:
      return null;
  }
}

/** O que já está registrado no dia (vem do GET /dias/:n). */
export interface EstadoDia {
  aguaMl: number;
  exercicio: boolean;
  paginasLidas: number;
  storyPostado: boolean;
  /** Fotos ENVIADA/CONFIRMADA (PENDENTE e REJEITADA contam como não enviadas). */
  fotosEnviadas: TipoFoto[];
}

export type Periodo = 'MADRUGADA' | 'MANHA' | 'TARDE' | 'NOITE' | 'CORRIDA';

/**
 * Manhã: água/exercício; tarde: água/leitura; noite: leitura/story; 22h–23h49: "corrida" de quem
 * deixou para o fim. De madrugada (e a partir de 23h50, perto da virada do dia) ninguém faz nada.
 */
export function periodoDoHorario(hora: number, minuto: number): Periodo {
  if (hora < 6) return 'MADRUGADA';
  if (hora < 12) return 'MANHA';
  if (hora < 18) return 'TARDE';
  if (hora < 22) return 'NOITE';
  if (hora === 23 && minuto >= 50) return 'MADRUGADA';
  return 'CORRIDA';
}

export const TAREFAS_DO_PERIODO: Record<Periodo, readonly Tarefa[]> = {
  MADRUGADA: [],
  MANHA: ['AGUA', 'EXERCICIO', 'FOTO_AGUA', 'FOTO_EXERCICIO'],
  TARDE: ['AGUA', 'LEITURA', 'FOTO_AGUA', 'FOTO_EXERCICIO', 'FOTO_LEITURA'],
  NOITE: ['LEITURA', 'STORY', 'FOTO_LEITURA'],
  CORRIDA: TAREFAS,
};

/** Hora e minuto "de parede" no fuso do desafio. */
export function horarioNoFuso(agora: Date, timezone: string): { hora: number; minuto: number } {
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(agora);
  const valor = (tipo: string): number => Number(partes.find((p) => p.type === tipo)?.value ?? 0);
  return { hora: valor('hour') % 24, minuto: valor('minute') };
}

/** Tudo o que falta para o VU cumprir o plano do dia (independe do horário). */
export function tarefasPendentes(plano: PlanoDia, estado: EstadoDia): Tarefa[] {
  const pendentes: Tarefa[] = [];
  if (estado.aguaMl < plano.aguaMl) pendentes.push('AGUA');
  if (plano.exercicio && !estado.exercicio) pendentes.push('EXERCICIO');
  if (estado.paginasLidas < plano.paginas) pendentes.push('LEITURA');
  if (plano.story && !estado.storyPostado) pendentes.push('STORY');
  for (const tipo of plano.fotos) {
    if (!estado.fotosEnviadas.includes(tipo)) pendentes.push(`FOTO_${tipo}`);
  }
  return pendentes;
}

/** A foto vem depois da atividade (ou a qualquer hora, se a atividade não está no plano). */
function atividadeLiberaFoto(tipo: TipoFoto, plano: PlanoDia, estado: EstadoDia): boolean {
  switch (tipo) {
    case 'AGUA':
      return estado.aguaMl > 0 || plano.aguaMl === 0;
    case 'EXERCICIO':
      return estado.exercicio || !plano.exercicio;
    case 'LEITURA':
      return estado.paginasLidas > 0 || plano.paginas === 0;
  }
}

/** Pendentes que combinam com o horário (na corrida, vale tudo). */
export function tarefasDisponiveis(plano: PlanoDia, estado: EstadoDia, periodo: Periodo): Tarefa[] {
  const doPeriodo = new Set<Tarefa>(TAREFAS_DO_PERIODO[periodo]);
  return tarefasPendentes(plano, estado).filter((t) => {
    if (!doPeriodo.has(t)) return false;
    if (periodo === 'CORRIDA') return true;
    const tipo = tipoDaFoto(t);
    return tipo === null || atividadeLiberaFoto(tipo, plano, estado);
  });
}

/**
 * Quantas tarefas o VU tenta nesta rodada (0–2). Fora da corrida, ~30% dos VUs agem a cada 15 min
 * (`fatorIntervalo` = intervalo/15 ajusta para outros intervalos); na corrida, todo mundo faz 2.
 */
export function quantasTarefas(periodo: Periodo, rng: Aleatorio, fatorIntervalo = 1): number {
  if (periodo === 'MADRUGADA') return 0;
  if (periodo === 'CORRIDA') return 2;
  if (!chance(rng, Math.min(0.9, 0.3 * fatorIntervalo))) return 0;
  return chance(rng, 0.3) ? 2 : 1;
}

export function escolherTarefas(
  rng: Aleatorio,
  disponiveis: readonly Tarefa[],
  k: number,
): Tarefa[] {
  return escolherVarios(rng, disponiveis, k);
}

export interface DadosCheckin {
  aguaMl: number;
  exercicio: boolean;
  paginasLidas: number;
  storyPostado: boolean;
}

export type Acao = { tipo: 'CHECKIN'; dados: DadosCheckin } | { tipo: 'FOTO'; foto: TipoFoto };

/** Água em porções de 250–750 ml (na corrida, o que falta de uma vez). */
export function proximaAgua(atual: number, alvo: number, periodo: Periodo, rng: Aleatorio): number {
  if (periodo === 'CORRIDA') return Math.max(atual, alvo);
  return Math.max(atual, Math.min(alvo, atual + 250 * inteiroEntre(rng, 1, 3)));
}

/** Páginas em sessões de 3–15 (na corrida, o que falta de uma vez). */
export function proximasPaginas(
  atual: number,
  alvo: number,
  periodo: Periodo,
  rng: Aleatorio,
): number {
  if (periodo === 'CORRIDA') return Math.max(atual, alvo);
  return Math.max(atual, Math.min(alvo, atual + inteiroEntre(rng, 3, 15)));
}

/** Traduz a tarefa na chamada à API: o PUT do dia leva sempre os 4 campos (valores absolutos). */
export function acaoDaTarefa(
  tarefa: Tarefa,
  estado: EstadoDia,
  plano: PlanoDia,
  periodo: Periodo,
  rng: Aleatorio,
): Acao {
  const foto = tipoDaFoto(tarefa);
  if (foto) return { tipo: 'FOTO', foto };
  const dados: DadosCheckin = {
    aguaMl: estado.aguaMl,
    exercicio: estado.exercicio,
    paginasLidas: estado.paginasLidas,
    storyPostado: estado.storyPostado,
  };
  switch (tarefa) {
    case 'AGUA':
      dados.aguaMl = proximaAgua(estado.aguaMl, plano.aguaMl, periodo, rng);
      break;
    case 'EXERCICIO':
      dados.exercicio = true;
      break;
    case 'LEITURA':
      dados.paginasLidas = proximasPaginas(estado.paginasLidas, plano.paginas, periodo, rng);
      break;
    case 'STORY':
      dados.storyPostado = true;
      break;
  }
  return { tipo: 'CHECKIN', dados };
}
