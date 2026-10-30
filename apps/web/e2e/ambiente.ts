// Ambiente isolado dos testes E2E (Playwright). Nada aqui é segredo: é a infra local do docker-compose.
// A pilha E2E NUNCA usa o banco de desenvolvimento: banco `everest_e2e`, Redis db 3 e uma
// segunda API na porta 3001; o front é um build servido por `vite preview` na porta 4174.

export const PORTA_API = 3001;
export const PORTA_WEB = 4174;
export const URL_API = `http://localhost:${PORTA_API}`;
export const URL_WEB = `http://localhost:${PORTA_WEB}`;

/** Emulador do Firebase Auth (`pnpm emu`, firebase.json): projeto demo, sem conta real. */
export const PROJETO_FIREBASE = 'demo-everest';
export const HOST_EMULADOR = '127.0.0.1:9099';
export const URL_EMULADOR = `http://${HOST_EMULADOR}`;
export const CHAVE_API_FIREBASE = 'demo-key';

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
  FIREBASE_PROJECT_ID: PROJETO_FIREBASE,
  // A API aceita os idTokens do emulador (o login é todo pelo Firebase desde a R5).
  FIREBASE_AUTH_EMULATOR_HOST: HOST_EMULADOR,
  AUTH_SENHA_LEGADO: 'false',
  // Payload Pix de demonstração (mesmo literal do shared/__tests__/pix.test.ts).
  PIX_COPIA_E_COLA:
    '00020101021126560014br.gov.bcb.pix0115pix@exemplo.dev0215DESAFIO 30 DIAS520400005303986540550.005802BR5912EVEREST DEMO6009SAO PAULO62150511EVERESTDEMO63048FC9',
};

/** Variáveis do build do front E2E (VITE_* do ambiente têm prioridade sobre o .env local). */
export const ENV_WEB: Record<string, string> = {
  VITE_API_PROXY: URL_API,
  VITE_APP_URL: URL_WEB,
  VITE_FIREBASE_API_KEY: CHAVE_API_FIREBASE,
  VITE_FIREBASE_AUTH_DOMAIN: 'localhost',
  VITE_FIREBASE_PROJECT_ID: PROJETO_FIREBASE,
  VITE_FIREBASE_APP_ID: 'demo-app',
  VITE_FIREBASE_EMULADOR: URL_EMULADOR,
};

/** Dados de cadastro válidos (Q7) para completar o perfil pela API nos testes. */
export const DADOS_PERFIL = {
  instagram: 'pessoa.e2e',
  dataNascimento: '1994-03-21',
  whatsapp: '11987654321',
  bairro: 'Pinheiros',
  cidade: 'São Paulo',
  uf: 'SP',
  aceitouTermos: true,
} as const;

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
