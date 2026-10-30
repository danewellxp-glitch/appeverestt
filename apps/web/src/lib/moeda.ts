const REAIS = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Centavos → "R$ 50,00". O Intl põe um espaço não separável entre "R$" e o número
 * (nos testes E2E, procure por /R\$\s*50,00/).
 */
export function formatarReais(centavos: number): string {
  return REAIS.format(centavos / 100);
}
