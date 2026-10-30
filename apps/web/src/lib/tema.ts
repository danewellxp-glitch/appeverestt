import { useSyncExternalStore } from 'react';

/** Preferência guardada (X7: padrão = sistema) e tema efetivamente aplicado. */
export type PreferenciaTema = 'claro' | 'escuro' | 'sistema';
export type TemaResolvido = 'claro' | 'escuro';

export const CHAVE_TEMA = 'everest-tema';
const CONSULTA_ESCURO = '(prefers-color-scheme: dark)';

interface EstadoTema {
  preferencia: PreferenciaTema;
  resolvido: TemaResolvido;
}

function ehPreferencia(v: unknown): v is PreferenciaTema {
  return v === 'claro' || v === 'escuro' || v === 'sistema';
}

function lerPreferencia(): PreferenciaTema {
  try {
    const v = localStorage.getItem(CHAVE_TEMA);
    return ehPreferencia(v) ? v : 'sistema';
  } catch {
    return 'sistema';
  }
}

function sistemaEscuro(): boolean {
  return typeof matchMedia === 'function' && matchMedia(CONSULTA_ESCURO).matches;
}

function resolver(p: PreferenciaTema): TemaResolvido {
  if (p === 'sistema') return sistemaEscuro() ? 'escuro' : 'claro';
  return p;
}

let estado: EstadoTema = { preferencia: 'sistema', resolvido: 'escuro' };
const ouvintes = new Set<() => void>();

function avisar(): void {
  for (const fn of ouvintes) fn();
}

/** Escreve data-tema / data-tema-pref no <html> e a cor da barra do navegador (= --fundo). */
function aplicar(p: PreferenciaTema): void {
  const resolvido = resolver(p);
  const raiz = document.documentElement;
  raiz.dataset.tema = resolvido;
  raiz.dataset.temaPref = p;
  const fundo = getComputedStyle(raiz).getPropertyValue('--fundo').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content',
    fundo || (resolvido === 'escuro' ? '#000000' : '#f7f6f6'),
  );
  if (estado.preferencia !== p || estado.resolvido !== resolvido) {
    estado = { preferencia: p, resolvido };
    avisar();
  }
}

let iniciado = false;

/** Chame uma vez no boot: sincroniza com o script inline e acompanha o modo do celular. */
export function iniciarTema(): void {
  if (iniciado || typeof document === 'undefined') return;
  iniciado = true;
  aplicar(lerPreferencia());
  if (typeof matchMedia === 'function') {
    matchMedia(CONSULTA_ESCURO).addEventListener('change', () => {
      if (estado.preferencia === 'sistema') aplicar('sistema');
    });
  }
  // Outra aba trocou o tema.
  window.addEventListener('storage', (e) => {
    if (e.key === CHAVE_TEMA) aplicar(lerPreferencia());
  });
}

/** Troca e grava a preferência, com crossfade de 300 ms quando o navegador suporta. */
export function definirTema(p: PreferenciaTema): void {
  try {
    localStorage.setItem(CHAVE_TEMA, p);
  } catch {
    // modo privado/armazenamento bloqueado: vale só nesta sessão
  }
  const reduzir = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduzir && typeof document.startViewTransition === 'function') {
    document.startViewTransition(() => aplicar(p));
  } else {
    aplicar(p);
  }
}

function assinar(fn: () => void): () => void {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

function obter(): EstadoTema {
  return estado;
}

export function useTema(): EstadoTema & { definir: (p: PreferenciaTema) => void } {
  const atual = useSyncExternalStore(assinar, obter, obter);
  return { ...atual, definir: definirTema };
}
