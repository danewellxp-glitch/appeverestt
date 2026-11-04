/** Tira o "@" (ou "#") do começo e os espaços. */
export function semPrefixo(valor: string, prefixo: '@' | '#' = '@'): string {
  return valor.trim().replace(prefixo === '@' ? /^@+/ : /^#+/, '');
}

/** Só links https:// viram botão (nada de "javascript:" ou link quebrado vindo do conteúdo). */
export function linkExterno(url: string | null | undefined): string | null {
  const limpo = url?.trim() ?? '';
  if (!limpo) return null;
  try {
    const u = new URL(limpo);
    return u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Perfil do Instagram a partir do @ (com ou sem "@"). null quando vazio ou inválido. */
export function linkInstagram(handle: string | null | undefined): string | null {
  const h = semPrefixo(handle ?? '');
  if (!/^[A-Za-z0-9._]{1,30}$/.test(h)) return null;
  return `https://instagram.com/${h}`;
}

/** Últimos 4 dígitos do WhatsApp cadastrado ("11987654321" → "4321"). null sem número. */
export function finalDoWhatsapp(whatsapp: string | null | undefined): string | null {
  const digitos = (whatsapp ?? '').replace(/\D/g, '');
  return digitos.length >= 4 ? digitos.slice(-4) : null;
}
