import { useCallback, useSyncExternalStore } from 'react';
import { rodandoStandalone } from './standalone';

/** Evento `beforeinstallprompt` (Chromium); não está no lib.dom do TypeScript. */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: readonly string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

interface EstadoInstalacao {
  /** Evento guardado para chamar `prompt()` depois (uso único). */
  evento: BeforeInstallPromptEvent | null;
  /** O app já roda instalado (standalone) ou acabou de ser instalado. */
  instalado: boolean;
}

let estado: EstadoInstalacao = { evento: null, instalado: false };
const ouvintes = new Set<() => void>();
let iniciado = false;

function definir(parcial: Partial<EstadoInstalacao>): void {
  estado = { ...estado, ...parcial };
  ouvintes.forEach((cb) => cb());
}

/**
 * Começa a escutar os eventos de instalação. Chame o quanto antes (main.tsx):
 * o `beforeinstallprompt` pode disparar antes do React montar o botão.
 * Idempotente.
 */
export function iniciarCapturaInstalacao(): void {
  if (iniciado || typeof window === 'undefined') return;
  iniciado = true;

  estado = { ...estado, instalado: rodandoStandalone() };

  window.addEventListener('beforeinstallprompt', (e) => {
    // Impede o mini-infobar do Chrome; o prompt sai pelo nosso botão.
    e.preventDefault();
    definir({ evento: e as BeforeInstallPromptEvent });
  });

  window.addEventListener('appinstalled', () => {
    definir({ evento: null, instalado: true });
  });

  if (typeof window.matchMedia === 'function') {
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
      definir({ instalado: e.matches || rodandoStandalone() });
    });
  }
}

// Começa a escutar assim que o módulo é avaliado (main.tsx o importa no boot).
iniciarCapturaInstalacao();

function assinar(cb: () => void): () => void {
  ouvintes.add(cb);
  return () => ouvintes.delete(cb);
}

const lerEstado = () => estado;
const ESTADO_SERVIDOR: EstadoInstalacao = { evento: null, instalado: false };
const lerEstadoServidor = () => ESTADO_SERVIDOR;

/** iPhone/iPad/iPod, incluindo iPadOS 13+ (que se apresenta como Mac). */
export function ehIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

export type ResultadoInstalacao = 'aceito' | 'recusado' | 'indisponivel';

export interface InstallPrompt {
  /** App já instalado/rodando standalone: esconda o botão. */
  instalado: boolean;
  /** iOS: não há `beforeinstallprompt`; mostre o passo a passo. */
  ios: boolean;
  /** Há um `beforeinstallprompt` guardado: `instalar()` abre o prompt nativo. */
  podeInstalar: boolean;
  /** Abre o prompt nativo e espera a escolha do usuário. */
  instalar: () => Promise<ResultadoInstalacao>;
}

export function useInstallPrompt(): InstallPrompt {
  const { evento, instalado } = useSyncExternalStore(assinar, lerEstado, lerEstadoServidor);

  const instalar = useCallback(async (): Promise<ResultadoInstalacao> => {
    const atual = estado.evento;
    if (!atual) return 'indisponivel';
    // O evento só pode ser usado uma vez.
    definir({ evento: null });
    try {
      await atual.prompt();
      const { outcome } = await atual.userChoice;
      if (outcome === 'accepted') definir({ instalado: true });
      return outcome === 'accepted' ? 'aceito' : 'recusado';
    } catch {
      return 'indisponivel';
    }
  }, []);

  return { instalado, ios: ehIOS(), podeInstalar: evento !== null, instalar };
}
