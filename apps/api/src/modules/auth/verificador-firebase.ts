import { Logger } from '@nestjs/common';
import type { App } from 'firebase-admin/app';
import type { Auth, DecodedIdToken } from 'firebase-admin/auth';
import { ErroApp } from '../../common/erros';
import type { AppConfig } from '../../config/app-config.service';

/** Token de injeção do verificador (real em produção/dev; falso nos testes). */
export const VERIFICADOR_FIREBASE = Symbol('VERIFICADOR_FIREBASE');

export interface DadosToken {
  uid: string;
  email: string | null;
  emailVerificado: boolean;
  nome: string | null;
  foto: string | null;
  /** 'google.com', 'password'… */
  provedor: string;
  /** Momento do login no Firebase (segundos desde 1970). */
  authTime: number;
}

export interface VerificadorFirebase {
  /** Valida o idToken (assinatura, projeto, expiração e revogação). Lança NAO_AUTENTICADO se inválido. */
  verificar(idToken: string): Promise<DadosToken>;
  /** Exclui o usuário no Firebase Auth. Não falha se ele já não existir. */
  excluir(uid: string): Promise<void>;
}

function dadosDoToken(t: DecodedIdToken): DadosToken {
  const nome: unknown = t.name;
  return {
    uid: t.uid,
    email: t.email ? t.email.trim().toLowerCase() : null,
    emailVerificado: t.email_verified === true,
    nome: typeof nome === 'string' && nome.trim() ? nome.trim() : null,
    foto: t.picture ?? null,
    provedor: t.firebase.sign_in_provider,
    authTime: t.auth_time,
  };
}

function codigoFirebase(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'code' in e) {
    const codigo = (e as { code: unknown }).code;
    if (typeof codigo === 'string') return codigo;
  }
  return '';
}

/** Implementação real com firebase-admin. O SDK só é carregado no primeiro uso. */
export class VerificadorFirebaseAdmin implements VerificadorFirebase {
  private readonly logger = new Logger(VerificadorFirebaseAdmin.name);
  private auth: Promise<Auth> | null = null;

  constructor(private readonly config: AppConfig) {}

  private obterAuth(): Promise<Auth> {
    this.auth ??= (async () => {
      const emulador = this.config.get('FIREBASE_AUTH_EMULATOR_HOST');
      // O admin SDK lê o emulador desta variável de ambiente.
      if (emulador) process.env.FIREBASE_AUTH_EMULATOR_HOST = emulador;
      const { cert, getApps, initializeApp } = await import('firebase-admin/app');
      const { getAuth } = await import('firebase-admin/auth');
      const nomeApp = 'everest-api';
      const existente: App | undefined = getApps().find((a) => a.name === nomeApp);
      const contaBase64 = this.config.get('FIREBASE_SERVICE_ACCOUNT_BASE64');
      const app =
        existente ??
        initializeApp(
          {
            projectId: this.config.get('FIREBASE_PROJECT_ID'),
            ...(contaBase64
              ? {
                  credential: cert(
                    JSON.parse(Buffer.from(contaBase64, 'base64').toString('utf8')) as Record<string, string>,
                  ),
                }
              : {}),
          },
          nomeApp,
        );
      return getAuth(app);
    })();
    return this.auth;
  }

  async verificar(idToken: string): Promise<DadosToken> {
    const auth = await this.obterAuth();
    try {
      return dadosDoToken(await auth.verifyIdToken(idToken, true));
    } catch (e) {
      const codigo = codigoFirebase(e);
      if (codigo.startsWith('auth/')) {
        throw new ErroApp('NAO_AUTENTICADO', 'Sua sessão expirou. Entre de novo.');
      }
      throw e;
    }
  }

  async excluir(uid: string): Promise<void> {
    const auth = await this.obterAuth();
    try {
      await auth.deleteUser(uid);
    } catch (e) {
      if (codigoFirebase(e) === 'auth/user-not-found') return;
      this.logger.error(`Não foi possível excluir o usuário ${uid} no Firebase: ${String(e)}`);
      throw e;
    }
  }
}
