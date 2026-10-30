// Ambiente fixo dos testes e2e (infra local do docker-compose; nada aqui é segredo).
export const ENV_TESTE: Record<string, string> = {
  NODE_ENV: 'test',
  PORT: '0',
  DATABASE_URL:
    'postgresql://everest:everest@localhost:5432/everest_test?schema=public&connection_limit=25&pool_timeout=30',
  REDIS_URL: 'redis://localhost:6379/1',
  JWT_SECRET: 'segredo-de-teste-com-mais-de-32-caracteres-ok',
  WEB_ORIGIN: 'http://localhost:5173',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_REGION: 'us-east-1',
  S3_BUCKET: 'everest-provas-test',
  S3_ACCESS_KEY_ID: 'everest',
  S3_SECRET_ACCESS_KEY: 'everest-dev-secret',
  S3_FORCE_PATH_STYLE: 'true',
  PERMITIR_EDITAR_DIAS_ANTERIORES: 'false',
  THROTTLE_ATIVO: 'false',
  FIREBASE_PROJECT_ID: 'demo-everest-test',
  AUTH_SENHA_LEGADO: 'false',
  // Payload Pix de demonstração (mesmo literal do shared/__tests__/pix.test.ts).
  PIX_COPIA_E_COLA:
    '00020101021126560014br.gov.bcb.pix0115pix@exemplo.dev0215DESAFIO 30 DIAS520400005303986540550.005802BR5912EVEREST DEMO6009SAO PAULO62150511EVERESTDEMO63048FC9',
};

export function aplicarEnvTeste(): void {
  Object.assign(process.env, ENV_TESTE);
}
