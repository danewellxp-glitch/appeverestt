import { TOTAL_DIAS_PADRAO, type DesafioAtual } from '@everest/shared';
import { formatarReais } from '../../lib/moeda';

/** Vagas quando o desafio ainda não carregou (ou não há desafio ativo). */
export const VAGAS_PADRAO = 50;

/**
 * Números que os textos da landing usam. Sem desafio (carregando ou nenhum ativo) valem os
 * padrões; `valor` é null quando o Pix não está configurado neste ambiente.
 */
export function numerosDoDesafio(desafio: DesafioAtual | undefined): {
  totalDias: number;
  totalVagas: number;
  valor: string | null;
} {
  return {
    totalDias: desafio?.totalDias ?? TOTAL_DIAS_PADRAO,
    totalVagas: desafio?.totalVagas ?? VAGAS_PADRAO,
    valor: desafio?.inscricao ? formatarReais(desafio.inscricao.valorCentavos) : null,
  };
}
