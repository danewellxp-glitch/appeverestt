export type ResultadoCompartilhar = 'compartilhado' | 'baixado' | 'cancelado';

export function canvasParaBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Não foi possível gerar a imagem.'))),
      'image/png',
    ),
  );
}

/** O aparelho consegue mandar o arquivo pelo menu de compartilhar (onde aparece "Instagram > Stories")? */
export function podeCompartilharArquivo(arquivo: File): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
  if (typeof navigator.canShare !== 'function') return false;
  try {
    return navigator.canShare({ files: [arquivo] });
  } catch {
    return false;
  }
}

export function baixarArquivo(arquivo: Blob, nome: string): void {
  const url = URL.createObjectURL(arquivo);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Abre o menu de compartilhar do celular com a imagem; se não der, baixa o PNG.
 * Chamar direto no clique, com o blob já pronto: o Safari recusa o share se houver espera antes.
 * Só manda o arquivo (sem texto): alguns Androids não mostram o Instagram quando vai texto junto.
 */
export async function compartilharImagem(blob: Blob, nome: string): Promise<ResultadoCompartilhar> {
  const arquivo = new File([blob], nome, { type: 'image/png' });
  if (podeCompartilharArquivo(arquivo)) {
    try {
      await navigator.share({ files: [arquivo] });
      return 'compartilhado';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelado';
      // NotAllowedError etc.: cai para o download.
    }
  }
  baixarArquivo(arquivo, nome);
  return 'baixado';
}
