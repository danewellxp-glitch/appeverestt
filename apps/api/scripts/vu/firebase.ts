// Firebase dos VUs: cria/atualiza as contas (firebase-admin) e faz o login como o app faria,
// trocando um custom token por um idToken na API REST pública do Firebase Auth.
import { type App, cert, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { type Auth, getAuth } from 'firebase-admin/auth';
import type { ConfigVu } from './config';
import { ehEmailVu } from './config';
import { type Contador, erroDaResposta, ok, requisitar } from './http';

const NOME_APP = 'everest-vu';

function codigo(e: unknown): string {
  return typeof e === 'object' && e !== null && 'code' in e
    ? String((e as { code: unknown }).code)
    : '';
}

export class FirebaseVu {
  private app: App | null = null;
  private auth: Auth | null = null;

  constructor(
    private readonly config: ConfigVu,
    private readonly contador?: Contador,
  ) {}

  private obterAuth(): Auth {
    if (this.auth) return this.auth;
    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    if (!projectId) throw new Error('Defina FIREBASE_PROJECT_ID.');
    const contaBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim();
    if (this.config.emulador) {
      // O admin SDK lê o emulador desta variável (tokens sem assinatura, só desenvolvimento).
      process.env.FIREBASE_AUTH_EMULATOR_HOST = this.config.emulador;
    } else if (!contaBase64) {
      throw new Error('Defina FIREBASE_SERVICE_ACCOUNT_BASE64 (a mesma conta de serviço da API).');
    }
    this.app =
      getApps().find((a) => a.name === NOME_APP) ??
      initializeApp(
        {
          projectId,
          ...(contaBase64
            ? {
                credential: cert(
                  JSON.parse(Buffer.from(contaBase64, 'base64').toString('utf8')) as Record<
                    string,
                    string
                  >,
                ),
              }
            : {}),
        },
        NOME_APP,
      );
    this.auth = getAuth(this.app);
    return this.auth;
  }

  /** Cria (ou atualiza) a conta do VU com e-mail verificado. Devolve o uid. */
  async garantirUsuario(email: string, nome: string): Promise<string> {
    if (!ehEmailVu(email)) throw new Error(`Recusado: ${email} não é e-mail de VU.`);
    const auth = this.obterAuth();
    try {
      const u = await auth.getUserByEmail(email);
      if (!u.emailVerified || u.displayName !== nome || u.disabled) {
        await auth.updateUser(u.uid, { emailVerified: true, displayName: nome, disabled: false });
      }
      return u.uid;
    } catch (e) {
      if (codigo(e) !== 'auth/user-not-found') throw e;
      const novo = await auth.createUser({ email, emailVerified: true, displayName: nome });
      return novo.uid;
    }
  }

  async uidDoEmail(email: string): Promise<string | null> {
    try {
      return (await this.obterAuth().getUserByEmail(email)).uid;
    } catch (e) {
      if (codigo(e) === 'auth/user-not-found') return null;
      throw e;
    }
  }

  /**
   * Login "de verdade": custom token → REST accounts:signInWithCustomToken (a mesma API que o SDK
   * web usa) → idToken recém-emitido (auth_time = agora), com e-mail verificado.
   */
  async idTokenNovo(uid: string): Promise<string> {
    if (!this.config.apiKey && !this.config.emulador) {
      throw new Error('Defina VU_FIREBASE_API_KEY (a chave pública do app web) para logar os VUs.');
    }
    const customToken = await this.obterAuth().createCustomToken(uid);
    const base = this.config.emulador
      ? `http://${this.config.emulador}/identitytoolkit.googleapis.com`
      : 'https://identitytoolkit.googleapis.com';
    const chave = encodeURIComponent(this.config.apiKey ?? 'fake-api-key');
    const res = await requisitar(
      {
        metodo: 'POST',
        url: `${base}/v1/accounts:signInWithCustomToken?key=${chave}`,
        rota: 'firebase signInWithCustomToken',
        headers: {
          'Content-Type': 'application/json',
          // Chaves de API do navegador costumam ter restrição por referenciador (HTTP referrer).
          Referer: `${this.config.baseUrl}/`,
        },
        corpo: JSON.stringify({ token: customToken, returnSecureToken: true }),
        timeoutMs: 20_000,
      },
      this.contador,
    );
    if (!ok(res)) throw erroDaResposta(res, 'firebase signInWithCustomToken');
    const corpo = JSON.parse(res.texto) as { idToken?: unknown };
    if (typeof corpo.idToken !== 'string') throw new Error('Firebase não devolveu idToken.');
    return corpo.idToken;
  }

  /**
   * Apaga do Firebase as contas com e-mail de VU (e só elas), exceto as que `manter` indicar.
   * Lista todos os usuários do projeto: pega também contas órfãs (sem registro no banco).
   */
  async excluirVus(
    manter: (email: string) => boolean = () => false,
  ): Promise<{ apagados: number; falhas: number }> {
    const auth = this.obterAuth();
    const uids: string[] = [];
    let pagina: string | undefined;
    do {
      const lista = await auth.listUsers(1000, pagina);
      for (const u of lista.users) {
        if (u.email && ehEmailVu(u.email) && !manter(u.email)) uids.push(u.uid);
      }
      pagina = lista.pageToken;
    } while (pagina);
    let apagados = 0;
    let falhas = 0;
    for (let i = 0; i < uids.length; i += 1000) {
      const r = await auth.deleteUsers(uids.slice(i, i + 1000));
      apagados += r.successCount;
      falhas += r.failureCount;
    }
    return { apagados, falhas };
  }

  async fechar(): Promise<void> {
    if (this.app) await deleteApp(this.app).catch(() => undefined);
    this.app = null;
    this.auth = null;
  }
}
