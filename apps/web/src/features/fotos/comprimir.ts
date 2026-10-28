// Cópia local da lib para o Web Worker (evita baixar do CDN jsdelivr, que é o padrão da lib).
import urlLibCompressao from 'browser-image-compression/dist/browser-image-compression.js?url';

/** Redimensiona para no máximo 1600 px e converte para JPEG (~1 MB). */
export async function comprimirFoto(arquivo: File): Promise<File> {
  // Carregada sob demanda: só quem envia uma foto paga o download da lib.
  const { default: imageCompression } = await import('browser-image-compression');
  return imageCompression(arquivo, {
    maxWidthOrHeight: 1600,
    maxSizeMB: 1,
    fileType: 'image/jpeg',
    useWebWorker: true,
    // O worker é criado a partir de um blob: a URL precisa ser absoluta.
    libURL: new URL(urlLibCompressao, window.location.href).href,
  });
}
