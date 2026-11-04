/**
 * Carrega imagens para desenhar no canvas sem "contaminá-lo" (canvas contaminado não exporta PNG).
 * Tudo vira um blob local (object URL), que é da mesma origem do app.
 */
function deObjectUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível abrir a imagem.'));
    img.src = url;
  });
}

/** Foto escolhida na galeria/câmera. Fica só no aparelho, não sobe para o servidor. */
export async function imagemDeArquivo(arquivo: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(arquivo);
  try {
    return await deObjectUrl(url);
  } finally {
    // A imagem já decodificada continua utilizável no canvas depois de liberar a URL.
    URL.revokeObjectURL(url);
  }
}

/** Foto de prova (URL assinada do storage): baixa como blob para evitar problema de CORS no canvas. */
export async function imagemDeUrl(url: string, signal?: AbortSignal): Promise<HTMLImageElement> {
  const resp = await fetch(url, { mode: 'cors', credentials: 'omit', signal });
  if (!resp.ok) throw new Error(`Falha ao baixar a foto (${resp.status}).`);
  return imagemDeArquivo(await resp.blob());
}

/** Logo branco do Everest (public/marca/everest.png, mesma origem). */
export function carregarLogo(): Promise<HTMLImageElement | null> {
  return deObjectUrl('/marca/everest.png').catch(() => null);
}

/** Espera as fontes da marca para o canvas não desenhar com a fonte de reserva. */
export async function carregarFontes(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts?.load) return;
  await Promise.all(
    [
      '900 100px "Big Shoulders Display"',
      '800 100px "Big Shoulders Display"',
      '700 40px "Onest Variable"',
      '600 40px "Onest Variable"',
      '500 40px "Onest Variable"',
    ].map((f) => document.fonts.load(f).catch(() => [])),
  );
}
