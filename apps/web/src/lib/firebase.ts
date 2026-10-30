import type { Auth } from 'firebase/auth';

let promessa: Promise<Auth> | null = null;

/**
 * Firebase Auth carregado sob demanda (import dinâmico): a rota `/` nunca baixa o SDK.
 * Use `preCarregarAuth()` no pointerdown/focus dos botões que levam às telas de auth.
 */
export function obterAuth(): Promise<Auth> {
  promessa ??= (async () => {
    const [{ initializeApp }, fa] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
    const app = initializeApp({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    });
    const auth = fa.initializeAuth(app, {
      persistence: fa.browserSessionPersistence, // necessário para o redirect do iOS
      popupRedirectResolver: fa.browserPopupRedirectResolver,
    });
    auth.languageCode = 'pt-BR';
    const emu = import.meta.env.VITE_FIREBASE_EMULADOR?.trim();
    if (emu) fa.connectAuthEmulator(auth, emu, { disableWarnings: true });
    return auth;
  })();
  // Se falhar (rede), a próxima chamada tenta de novo.
  promessa.catch(() => {
    promessa = null;
  });
  return promessa;
}

/** Pré-carrega o SDK sem esperar (para usar em onPointerDown/onFocus). */
export function preCarregarAuth(): void {
  void obterAuth().catch(() => undefined);
}
