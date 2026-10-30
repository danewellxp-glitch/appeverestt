// Ambiente isolado dos testes E2E (Playwright). Nada aqui é segredo: é a infra local do docker-compose.
// A pilha E2E NUNCA usa o banco de desenvolvimento: banco `everest_e2e`, Redis db 3 e uma
// segunda API na porta 3001; o front é um build servido por `vite preview` na porta 4174.

export const PORTA_API = 3001;
export const PORTA_WEB = 4174;
export const URL_API = `http://localhost:${PORTA_API}`;
export const URL_WEB = `http://localhost:${PORTA_WEB}`;

export const NOME_BANCO = 'everest_e2e';
export const DATABASE_URL = `postgresql://everest:everest@localhost:5432/${NOME_BANCO}?schema=public`;
export const REDIS_DB = 3;

/** Variáveis da API E2E (sobrepõem as de apps/api/.env, que o @nestjs/config também lê). */
export const ENV_API: Record<string, string> = {
  NODE_ENV: 'test',
  PORT: String(PORTA_API),
  DATABASE_URL,
  REDIS_URL: `redis://localhost:6379/${REDIS_DB}`,
  JWT_SECRET: 'segredo-dos-testes-e2e-com-mais-de-32-caracteres',
  WEB_ORIGIN: URL_WEB,
  S3_ENDPOINT: 'http://localhost:9000',
  S3_REGION: 'us-east-1',
  S3_BUCKET: 'everest-provas',
  S3_ACCESS_KEY_ID: 'everest',
  S3_SECRET_ACCESS_KEY: 'everest-dev-secret',
  S3_FORCE_PATH_STYLE: 'true',
  PERMITIR_EDITAR_DIAS_ANTERIORES: 'false',
  // Muitos cadastros seguidos: sem rate limit.
  THROTTLE_ATIVO: 'false',
  FIREBASE_PROJECT_ID: 'demo-everest',
  // O front ainda usa /auth/cadastro e /auth/login até a R5 do Frontend v2.
  AUTH_SENHA_LEGADO: 'true',
};

/** Desafio ativo criado pelo global-setup: começou há 3 dias (hoje = dia 4). */
export const DESAFIO = {
  slug: 'desafio-e2e',
  nome: 'Desafio E2E',
  handle: 'everest',
  totalVagas: 50,
  inicioRelativo: -3,
} as const;

export const SENHA = 'senha-e2e-segura-123';

export const ADMIN = {
  nome: 'Admin E2E',
  email: 'admin@e2e.dev',
  senha: SENHA,
} as const;
