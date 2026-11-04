import { PARAMETRO_ACAO, ehAcaoRapida, type AcaoRapida } from '@everest/shared';

/**
 * Ações rápidas do check-in (`/hoje?acao=...`). A regra mora em `@everest/shared`
 * (regras/acaoRapida.ts) porque a API também a usa nos botões das notificações (R22).
 */
export {
  ACOES_RAPIDAS,
  AGUA_POR_ACAO_ML,
  PARAMETRO_ACAO,
  aplicarAcaoRapida,
  ehAcaoRapida,
  urlDaAcaoRapida,
  type AcaoRapida,
  type ResultadoAcaoRapida,
} from '@everest/shared';

/** A ação pedida na query string, ou null se não houver (ou for inválida). */
export function lerAcaoRapida(params: URLSearchParams): AcaoRapida | null {
  const v = params.get(PARAMETRO_ACAO);
  return ehAcaoRapida(v) ? v : null;
}
