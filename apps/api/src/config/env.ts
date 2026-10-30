import { z } from 'zod';

const booleano = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

const opcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

export const envSchema = z
  .object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(0).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET precisa ter pelo menos 32 caracteres'),
  /** Uma ou mais origens separadas por vírgula. */
  WEB_ORIGIN: z
    .string()
    .min(1)
    .transform((v) =>
      v
        .split(',')
        .map((o) => o.trim().replace(/\/$/, ''))
        .filter(Boolean),
    )
    .pipe(z.array(z.url()).min(1)),
  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().min(1).default('auto'),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: booleano.default(false),
  PERMITIR_EDITAR_DIAS_ANTERIORES: booleano.default(false),
  /**
   * Quantos proxies confiáveis ficam na frente da API (Express `trust proxy`).
   * Vercel (rewrite) + borda do provedor = 2. Errado aqui faz o rate limit ver o IP do proxy.
   */
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(1),
  /** Desliga o rate limit (usado só nos testes automatizados). */
  THROTTLE_ATIVO: booleano.default(true),
  /** Projeto do Firebase Auth (dev/testes: `demo-everest`). */
  FIREBASE_PROJECT_ID: z.string().trim().min(1, 'Informe FIREBASE_PROJECT_ID'),
  /** JSON da conta de serviço em base64. Obrigatório em produção; nunca no repositório. */
  FIREBASE_SERVICE_ACCOUNT_BASE64: opcional,
  /** host:porta do emulador de Auth (só dev). Com ele, o admin SDK aceita tokens do emulador. */
  FIREBASE_AUTH_EMULATOR_HOST: opcional,
  /** Mantém POST /auth/cadastro e /auth/login (senha local). Padrão: desligado (responde 404). */
  AUTH_SENHA_LEGADO: booleano.default(false),
})
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && !env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      ctx.addIssue({
        code: 'custom',
        path: ['FIREBASE_SERVICE_ACCOUNT_BASE64'],
        message: 'Obrigatório em produção (JSON da conta de serviço em base64)',
      });
    }
    if (env.NODE_ENV === 'production' && env.FIREBASE_AUTH_EMULATOR_HOST) {
      ctx.addIssue({
        code: 'custom',
        path: ['FIREBASE_AUTH_EMULATOR_HOST'],
        message: 'Não use o emulador em produção',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Usado pelo ConfigModule: falha rápido no boot se faltar algo. */
export function validarEnv(config: Record<string, unknown>): Env {
  const r = envSchema.safeParse(config);
  if (!r.success) {
    const detalhes = r.error.issues
      .map((i) => `  - ${i.path.join('.') || '(raiz)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Variáveis de ambiente inválidas:\n${detalhes}`);
  }
  return r.data;
}
