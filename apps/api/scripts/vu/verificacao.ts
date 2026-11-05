// Partes puras do smoke da turma (R23): papéis dos VUs, conferência das respostas, perfil do PATCH /me
// e a tabela final. Nada de rede/banco aqui, para poder testar.
import type { AtualizarPerfilInput, UsuarioMe } from '@everest/shared';
import type { Medicao } from './cliente';
import { rotuloVu } from './config';

/** O mínimo de VUs pagos para o roteiro (A e B fecham, C sem treino, D desliga as cutucadas, E cutuca). */
export const MINIMO_VUS_TURMA = 5;

export interface Esperado {
  status: number;
  /** `codigo` da API (só nos erros). */
  codigo?: string;
}

export const OK_200: Esperado = { status: 200 };

export function confere(esperado: Esperado, status: number, codigo: string | null): boolean {
  if (status !== esperado.status) return false;
  return esperado.codigo === undefined || esperado.codigo === codigo;
}

export function descreverEsperado(e: Esperado): string {
  return e.codigo ? `${e.status} ${e.codigo}` : String(e.status);
}

export interface ResultadoCheck {
  ok: boolean;
  descricao: string;
  /** 0 = falha de rede. */
  status: number;
  codigo: string | null;
  ms: number;
  /** Por que falhou (status inesperado ou corpo inválido). */
  motivo?: string;
}

/** "ok VU 01 GET turma/hoje (200 84ms)" / "FALHOU ... (409 JA_CUTUCOU 51ms) — esperado 200". */
export function linhaCheck(r: ResultadoCheck): string {
  const status = `${r.status || 'rede'}${r.codigo ? ` ${r.codigo}` : ''}`;
  const base = `${r.ok ? 'ok' : 'FALHOU'} ${r.descricao} (${status} ${r.ms}ms)`;
  return r.ok || !r.motivo ? base : `${base} — ${r.motivo}`;
}

/** Percentil pelo método do posto mais próximo; null sem valores. */
export function percentil(valores: readonly number[], p: number): number | null {
  if (valores.length === 0) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  const posto = Math.ceil((Math.min(100, Math.max(0, p)) / 100) * ordenados.length);
  return ordenados[Math.max(0, posto - 1)]!;
}

/**
 * Corpo completo do PATCH /me a partir do GET /auth/me (o schema exige o cadastro inteiro),
 * mudando só `aceitaCutucadas`.
 */
export function perfilDoMe(u: UsuarioMe, aceitaCutucadas: boolean): AtualizarPerfilInput {
  const { instagram, dataNascimento, whatsapp, bairro, cidade, uf } = u;
  if (
    !u.perfilCompleto ||
    !instagram ||
    !dataNascimento ||
    !whatsapp ||
    !bairro ||
    !cidade ||
    !uf
  ) {
    throw new Error(`O perfil de ${u.email} está incompleto; rode preparar de novo.`);
  }
  return {
    nome: u.nome,
    instagram,
    dataNascimento,
    whatsapp,
    bairro,
    cidade,
    uf: uf as AtualizarPerfilInput['uf'],
    aceitouTermos: true,
    aceitouMarketing: u.aceitouMarketing,
    aceitaCutucadas,
  };
}

export interface CandidatoTurma {
  numero: number;
  participanteId: string;
  /** Dia atual fechado (e não invalidado). */
  concluido: boolean;
  /** Já tem foto do treino ENVIADA/CONFIRMADA no dia atual. */
  temTreino: boolean;
  aceitaCutucadas: boolean;
}

export interface PapeisTurma<T extends CandidatoTurma = CandidatoTurma> {
  /** Fecha o dia e sugere a pose (200). */
  a: T;
  /** Fecha o dia, tenta a pose (409) e esconde/mostra a foto do treino. */
  b: T;
  /** Sem foto do treino e sem fechar o dia: pose 403 e alvo da cutucada que dá certo. */
  c: T;
  /** Desliga as cutucadas (e religa no fim). */
  d: T;
  /** Quem cutuca. */
  e: T;
}

/**
 * A e B: os dois primeiros (menor número). C: o primeiro dos demais que ainda não fechou o dia,
 * não mandou o treino e aceita cutucadas. D e E: os próximos dois. Lança se não der.
 */
export function escolherPapeis<T extends CandidatoTurma>(candidatos: readonly T[]): PapeisTurma<T> {
  if (candidatos.length < MINIMO_VUS_TURMA) {
    throw new Error(
      `São precisos pelo menos ${MINIMO_VUS_TURMA} VUs com pagamento confirmado (há ${candidatos.length}).`,
    );
  }
  const ordem = [...candidatos].sort((x, y) => x.numero - y.numero);
  const [a, b, ...resto] = ordem as [T, T, ...T[]];
  const c = resto.find((v) => !v.concluido && !v.temTreino && v.aceitaCutucadas);
  if (!c) {
    throw new Error(
      'Nenhum VU (além dos dois primeiros) está sem a foto do treino, sem fechar o dia e aceitando ' +
        'cutucadas. Rode o smoke mais cedo no dia ou prepare mais VUs (preparar --inicio).',
    );
  }
  const [d, e] = resto.filter((v) => v !== c) as [T, T];
  return { a, b, c, d, e };
}

export function rotuloPapel(numero: number): string {
  return `VU ${rotuloVu(numero)}`;
}

export interface Totais {
  checks: number;
  falhas: number;
  /** Todas as requisições HTTP (inclui storage, logins e repetições). */
  requisicoesHttp: number;
  logins: number;
  duracaoS: number;
}

function ms(v: number | null): string {
  return v === null ? '-' : `${v}ms`;
}

/** Tabela final: uma linha por rota (n, respostas não-2xx — inclui os 4xx esperados —, p50, p95) e o total. */
export function tabelaResumo(medicoes: readonly Medicao[], t: Totais): string {
  const porRota = new Map<string, Medicao[]>();
  for (const m of medicoes) {
    // "GET dias/4" e "GET dias/5" viram a mesma linha.
    const chave = m.rota.replace(/\/\d+(?=\/|$|\s)/g, '/:n');
    porRota.set(chave, [...(porRota.get(chave) ?? []), m]);
  }
  const linhas: string[][] = [['rota', 'req', 'não-2xx', 'p50', 'p95']];
  for (const [rota, lista] of [...porRota].sort(([x], [y]) => x.localeCompare(y))) {
    const tempos = lista.map((m) => m.ms);
    linhas.push([
      rota,
      String(lista.length),
      String(lista.filter((m) => m.status >= 400 || m.status === 0).length),
      ms(percentil(tempos, 50)),
      ms(percentil(tempos, 95)),
    ]);
  }
  const todos = medicoes.map((m) => m.ms);
  linhas.push([
    'TOTAL',
    String(medicoes.length),
    String(medicoes.filter((m) => m.status >= 400 || m.status === 0).length),
    ms(percentil(todos, 50)),
    ms(percentil(todos, 95)),
  ]);
  const larguras = linhas[0]!.map((_, i) => Math.max(...linhas.map((l) => l[i]!.length)));
  const fmt = (l: string[]): string =>
    l.map((c, i) => (i === 0 ? c.padEnd(larguras[i]!) : c.padStart(larguras[i]!))).join('  ');
  const sep = larguras.map((w) => '-'.repeat(w)).join('  ');
  return [
    fmt(linhas[0]!),
    sep,
    ...linhas.slice(1, -1).map(fmt),
    sep,
    fmt(linhas[linhas.length - 1]!),
    '',
    `Checks: ${t.checks} · falhas: ${t.falhas} · ${t.requisicoesHttp} requisições HTTP no total ` +
      `(com storage, logins e repetições) · ${t.logins} login(s) · ${t.duracaoS}s`,
  ].join('\n');
}
