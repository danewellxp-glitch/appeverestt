/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_URL?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  /** Só dev: URL do emulador de Auth (ex.: http://127.0.0.1:9099). */
  readonly VITE_FIREBASE_EMULADOR?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
