import { TOTAL_DIAS_PADRAO } from '../constantes';

export type StatusDesafio = 'NAO_INICIADO' | 'EM_ANDAMENTO' | 'ENCERRADO';

const DIA_MS = 24 * 60 * 60 * 1000;
const DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Data de hoje ('YYYY-MM-DD') no fuso informado. */
export function hojeNoFuso(agora: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora);
}

function paraUtc(data: string): number {
  const m = DATA_ISO.exec(data);
  if (!m) throw new Error(`Data inválida (esperado YYYY-MM-DD): ${data}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Diferença em dias de calendário: b - a. */
export function diferencaEmDias(a: string, b: string): number {
  return Math.round((paraUtc(b) - paraUtc(a)) / DIA_MS);
}

/** Soma dias a uma data 'YYYY-MM-DD'. */
export function somarDias(data: string, dias: number): string {
  return new Date(paraUtc(data) + dias * DIA_MS).toISOString().slice(0, 10);
}

export function calcularDiaAtual(
  dataInicio: string,
  agora: Date,
  timezone: string,
  totalDias = TOTAL_DIAS_PADRAO,
): { status: StatusDesafio; numeroDia: number | null; diasParaInicio: number } {
  const decorridos = diferencaEmDias(dataInicio, hojeNoFuso(agora, timezone));
  if (decorridos < 0) {
    return { status: 'NAO_INICIADO', numeroDia: null, diasParaInicio: -decorridos };
  }
  if (decorridos >= totalDias) {
    return { status: 'ENCERRADO', numeroDia: null, diasParaInicio: 0 };
  }
  return { status: 'EM_ANDAMENTO', numeroDia: decorridos + 1, diasParaInicio: 0 };
}

/** Data ('YYYY-MM-DD') correspondente ao dia N do desafio. */
export function dataDoDia(dataInicio: string, numeroDia: number): string {
  return somarDias(dataInicio, numeroDia - 1);
}
