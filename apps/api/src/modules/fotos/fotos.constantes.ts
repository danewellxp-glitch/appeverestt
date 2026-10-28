export const FILA_FOTOS = 'fotos';
export const JOB_PROCESSAR = 'processar-foto';
export const JOB_LIMPAR = 'limpar-pendentes';

/** Fotos PENDENTE (upload nunca confirmado) mais velhas que isso são apagadas. */
export const IDADE_MAX_PENDENTE_MS = 60 * 60 * 1000;

export const LADO_MAX_FOTO = 1600;
export const LADO_THUMB = 400;

export interface DadosProcessarFoto {
  fotoId: string;
}

const EXTENSOES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function extensaoDoMime(mime: string): string {
  return EXTENSOES[mime] ?? 'bin';
}

/** provas/{desafioId}/{participanteId}/{numeroDia}/{tipo}-{fotoId}.{ext} */
export function chaveOriginal(p: {
  desafioId: string;
  participanteId: string;
  numeroDia: number;
  tipo: string;
  fotoId: string;
  mimeType: string;
}): string {
  return `provas/${p.desafioId}/${p.participanteId}/${p.numeroDia}/${p.tipo}-${p.fotoId}.${extensaoDoMime(p.mimeType)}`;
}

/** Chaves das versões processadas (sempre .webp, sem EXIF). */
export function chavesProcessadas(original: string): { cheia: string; thumb: string } {
  const base = original.replace(/\.[a-z0-9]+$/i, '');
  return { cheia: `${base}.full.webp`, thumb: `${base}.thumb.webp` };
}
