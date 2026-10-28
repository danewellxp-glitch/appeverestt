import { METAS, TIPOS_FOTO, type Requisito, type TipoFoto } from '../constantes';

export interface RegistroDia {
  aguaMl: number;
  exercicio: boolean;
  paginasLidas: number;
  /** Tipos de foto com status ENVIADA ou CONFIRMADA. */
  fotosValidas: TipoFoto[];
  storyPostado: boolean;
  invalidado?: boolean;
}

/** Quantos tipos distintos de foto válida existem (repetidos não contam). */
export function contarFotosDistintas(fotosValidas: readonly TipoFoto[]): number {
  return new Set(fotosValidas.filter((t) => TIPOS_FOTO.includes(t))).size;
}

/** Lista exatamente os requisitos que ainda faltam no dia, em ordem fixa. */
export function requisitosPendentes(r: RegistroDia): Requisito[] {
  const pendentes: Requisito[] = [];
  if (r.aguaMl < METAS.aguaMl) pendentes.push('AGUA');
  if (!r.exercicio) pendentes.push('EXERCICIO');
  if (r.paginasLidas < METAS.paginas) pendentes.push('LEITURA');
  if (contarFotosDistintas(r.fotosValidas) < METAS.fotos) pendentes.push('FOTOS');
  if (!r.storyPostado) pendentes.push('STORY');
  return pendentes;
}

/** Um dia só conclui com os 5 requisitos e se não estiver invalidado. */
export function calcularConcluido(r: RegistroDia): boolean {
  if (r.invalidado) return false;
  return requisitosPendentes(r).length === 0;
}
