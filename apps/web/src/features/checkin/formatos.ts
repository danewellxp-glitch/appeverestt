const numero = new Intl.NumberFormat('pt-BR');

/** 3000 → "3.000" */
export function formatarNumero(n: number): string {
  return numero.format(n);
}

export function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}
