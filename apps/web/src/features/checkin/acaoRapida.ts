import { LIMITES, METAS, type CheckinInput } from '@everest/shared';

/**
 * Ações rápidas do check-in (`/hoje?acao=...`): a porta de entrada curta para marcar um hábito
 * sem navegar no app. Usadas pelos atalhos do ícone no Android (`shortcuts` do manifest,
 * features/pwa/atalhos.ts) e por atalhos que a pessoa cria no iPhone (app Atalhos).
 *
 * - `agua`: soma 250 ml (como o botão "+250 ml" do card).
 * - `treino`: marca o treino como feito.
 * - `leitura`: marca a meta de páginas do dia como batida.
 */
export const ACOES_RAPIDAS = ['agua', 'treino', 'leitura'] as const;
export type AcaoRapida = (typeof ACOES_RAPIDAS)[number];

export const PARAMETRO_ACAO = 'acao';
export const AGUA_POR_ACAO_ML = 250;

export function ehAcaoRapida(valor: string | null | undefined): valor is AcaoRapida {
  return (ACOES_RAPIDAS as readonly string[]).includes(valor ?? '');
}

/** A ação pedida na query string, ou null se não houver (ou for inválida). */
export function lerAcaoRapida(params: URLSearchParams): AcaoRapida | null {
  const v = params.get(PARAMETRO_ACAO);
  return ehAcaoRapida(v) ? v : null;
}

/** URL da ação dentro do app (usada pelos atalhos do manifest e da folha "Instalar app"). */
export function urlDaAcaoRapida(acao: AcaoRapida): string {
  return `/hoje?${PARAMETRO_ACAO}=${acao}`;
}

export interface ResultadoAcaoRapida {
  valores: CheckinInput;
  /** Texto do toast de confirmação. */
  mensagem: string;
  /** false quando a ação não muda nada (treino/leitura já marcados, água no máximo). */
  mudou: boolean;
}

/** Aplica a ação aos valores atuais do dia. Nunca ultrapassa os limites do checkinSchema. */
export function aplicarAcaoRapida(acao: AcaoRapida, atual: CheckinInput): ResultadoAcaoRapida {
  switch (acao) {
    case 'agua': {
      const aguaMl = Math.min(atual.aguaMl + AGUA_POR_ACAO_ML, LIMITES.aguaMlMax);
      const mudou = aguaMl !== atual.aguaMl;
      return {
        valores: { ...atual, aguaMl },
        mudou,
        mensagem: mudou
          ? `+${AGUA_POR_ACAO_ML} ml registrados. ${aguaMl >= METAS.aguaMl ? 'Meta de água batida!' : `Total: ${formatarMl(aguaMl)} ml.`}`
          : 'Água já está no máximo do dia.',
      };
    }
    case 'treino':
      return {
        valores: { ...atual, exercicio: true },
        mudou: !atual.exercicio,
        mensagem: atual.exercicio ? 'Treino de hoje já estava marcado.' : 'Treino de hoje marcado como feito.',
      };
    case 'leitura': {
      const paginasLidas = Math.max(atual.paginasLidas, METAS.paginas);
      const mudou = paginasLidas !== atual.paginasLidas;
      return {
        valores: { ...atual, paginasLidas },
        mudou,
        mensagem: mudou ? `Leitura de hoje marcada: ${METAS.paginas} páginas.` : 'Leitura de hoje já estava marcada.',
      };
    }
  }
}

function formatarMl(n: number): string {
  return new Intl.NumberFormat('pt-BR').format(n);
}
