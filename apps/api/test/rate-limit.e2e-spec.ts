import request from 'supertest';

// O ConfigModule lê o ambiente quando o AppModule é carregado: ligar o rate limit
// antes de carregar a app (cada arquivo de teste tem seu próprio registro de módulos).
process.env.THROTTLE_ATIVO = 'true';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { criarApp } = require('./helpers') as typeof import('./helpers');

describe('Rate limit (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof criarApp>>;

  beforeAll(async () => {
    ctx = await criarApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('sessão: 11ª tentativa no mesmo minuto → MUITAS_REQUISICOES', async () => {
    const status: number[] = [];
    let ultimoCorpo: unknown = null;
    for (let i = 0; i < 11; i++) {
      const r = await request(ctx.http).post('/api/auth/sessao').send({ idToken: 'token-invalido' });
      status.push(r.status);
      ultimoCorpo = r.body;
    }
    expect(status).toEqual([...new Array<number>(10).fill(401), 429]);
    expect(ultimoCorpo).toMatchObject({ codigo: 'MUITAS_REQUISICOES' });
  });

  it('health não sofre rate limit', async () => {
    for (let i = 0; i < 3; i++) {
      expect((await request(ctx.http).get('/api/health')).status).toBe(200);
    }
  });
});
