import { nomeExibicao, type FotoParecida, type TipoFoto } from '@everest/shared';

/** Tipo da foto em minúsculas, para o meio da frase. */
export const TIPO_NA_FRASE: Record<TipoFoto, string> = {
  AGUA: 'água',
  EXERCICIO: 'exercício',
  LEITURA: 'leitura',
};

/**
 * Frase do aviso de foto parecida (X20) numa foto do dia `numeroDia`. `mesmoDia` = a outra foto está
 * neste mesmo dia da mesma pessoa (não há para onde levar).
 */
export function descreverParecida(
  parecida: FotoParecida,
  numeroDia: number,
): { texto: string; mesmoDia: boolean } {
  const tipo = TIPO_NA_FRASE[parecida.tipo];
  if (parecida.mesmaPessoa && parecida.numeroDia === numeroDia) {
    return { texto: `Parecida com a foto de ${tipo} deste mesmo dia`, mesmoDia: true };
  }
  const quem = parecida.mesmaPessoa
    ? 'outra foto desta pessoa'
    : `a foto de ${nomeExibicao(parecida.nome) || 'outro participante'}`;
  return { texto: `Parecida com ${quem} · dia ${parecida.numeroDia} · ${tipo}`, mesmoDia: false };
}

/** "dia 3", "dias 3 e 5", "dias 2, 3 e 5". */
export function listarDias(dias: readonly number[]): string {
  if (dias.length <= 1) return `dia ${dias[0] ?? ''}`.trim();
  return `dias ${dias.slice(0, -1).join(', ')} e ${dias[dias.length - 1]}`;
}
