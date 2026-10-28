import type { FotoDia, TipoFoto } from '@everest/shared';

export const ROTULO_TIPO_FOTO: Record<TipoFoto, string> = {
  AGUA: 'Água',
  EXERCICIO: 'Exercício',
  LEITURA: 'Leitura',
};

/** Foto que conta para a conclusão (mesma regra do servidor: ENVIADA ou CONFIRMADA). */
export function fotoEhValida(foto: FotoDia | undefined): foto is FotoDia {
  return foto !== undefined && (foto.status === 'ENVIADA' || foto.status === 'CONFIRMADA');
}

/** Tipos com foto válida no dia (entrada de `requisitosPendentes`). */
export function tiposFotosValidas(fotos: readonly FotoDia[]): TipoFoto[] {
  return fotos.filter(fotoEhValida).map((f) => f.tipo);
}
