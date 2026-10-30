/** Direção das View Transitions entre rotas (docs/FRONTEND.md §7.3). */
export type Direcao = 'avancar' | 'voltar' | 'aba';

export function reduzirMovimento(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Marca em <html data-nav> qual animação a próxima transição usa (o CSS lê o atributo). */
export function marcarDirecao(d: Direcao): void {
  document.documentElement.dataset.nav = d;
}

/**
 * Container transform: dá o `view-transition-name` ao elemento tocado e navega.
 * A página de destino aplica o mesmo nome no contêiner raiz quando recebe `state.vt`.
 * Só um elemento pode ter o nome por vez; ele é limpo quando a transição termina.
 */
export function abrirComTransformacao(el: HTMLElement, nome: string, navegar: () => void): void {
  if (reduzirMovimento() || typeof document.startViewTransition !== 'function') {
    navegar();
    return;
  }
  el.style.viewTransitionName = nome;
  marcarDirecao('avancar');
  navegar();
  // A navegação com viewTransition captura o estado antigo no próximo frame; depois disso
  // o elemento já não precisa do nome (e não pode duplicá-lo na volta).
  window.setTimeout(() => {
    el.style.viewTransitionName = '';
  }, 600);
}

/** Lê o nome de transição recebido pela navegação (`navigate(to, { state: { vt } })`). */
export function nomeTransicaoDoEstado(estado: unknown): string | undefined {
  if (typeof estado !== 'object' || estado === null || !('vt' in estado)) return undefined;
  const vt = (estado as { vt: unknown }).vt;
  return typeof vt === 'string' && vt ? vt : undefined;
}
