// Leitura dos argumentos numéricos da CLI do simulador (puro: lança Error, quem chama decide sair).
import { NUMERO_MAX_VU, QUANTIDADE_MAX } from './config';

/** `--nome N` inteiro entre min e max; ausente = padrão. */
export function lerInteiro(
  valor: string | undefined,
  nome: string,
  padrao: number,
  min: number,
  max: number,
): number {
  if (valor === undefined) return padrao;
  const n = Number(valor);
  if (valor.trim() === '' || !Number.isInteger(n) || n < min || n > max) {
    throw new Error(`--${nome} deve ser um inteiro entre ${min} e ${max}.`);
  }
  return n;
}

export interface FaixaVus {
  /** Primeiro número de VU (vu-NN). */
  inicio: number;
  quantidade: number;
}

/** `preparar --inicio 101 --quantidade 5` → VUs 101..105. Padrão: 1..30. */
export function lerFaixaVus(args: Record<string, string | undefined>): FaixaVus {
  const quantidade = lerInteiro(args.quantidade, 'quantidade', 30, 1, QUANTIDADE_MAX);
  const inicio = lerInteiro(args.inicio, 'inicio', 1, 1, NUMERO_MAX_VU);
  const ultimo = inicio + quantidade - 1;
  if (ultimo > NUMERO_MAX_VU) {
    throw new Error(
      `--inicio ${inicio} com --quantidade ${quantidade} passaria de vu-${NUMERO_MAX_VU} (último seria ${ultimo}).`,
    );
  }
  return { inicio, quantidade };
}

/** Números dos VUs da faixa, em ordem. */
export function numerosDaFaixa(f: FaixaVus): number[] {
  return Array.from({ length: f.quantidade }, (_, i) => f.inicio + i);
}
