import request from 'supertest';

// Liga o login por senha local antes de carregar a app (o ConfigModule lê o ambiente no import).
process.env.AUTH_SENHA_LEGADO = 'true';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const helpers = require('./helpers') as typeof import('./helpers');

const SENHA = 'senha-segura-123';

describe('Auth legado por senha (AUTH_SENHA_LEGADO=true) (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof helpers.criarApp>>;

  beforeAll(async () => {
    ctx = await helpers.criarApp();
    await helpers.limparTudo(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  async function cadastrar(nome: string, email: string) {
    const agente = request.agent(ctx.http);
    const r = await agente.post('/api/auth/cadastro').send({ nome, email, senha: SENHA, aceitouTermos: true });
    return { agente, r };
  }

  it('cadastro abre sessão com perfil completo', async () => {
    const email = helpers.emailUnico('legado');
    const { agente, r } = await cadastrar('Maria Souza', email);
    expect(r.status).toBe(201);
    expect(String(r.headers['set-cookie'])).toContain('everest_sessao=');
    const me = await agente.get('/api/auth/me');
    expect(me.body.usuario).toMatchObject({ email, perfilCompleto: true, fotoUrl: null });
  });

  it('e-mail duplicado → EMAIL_EM_USO (inclusive com caixa diferente)', async () => {
    const email = helpers.emailUnico('dup');
    await cadastrar('Primeiro', email);
    const { r } = await cadastrar('Segundo', email.toUpperCase());
    expect(r.status).toBe(409);
    expect(r.body.codigo).toBe('EMAIL_EM_USO');
  });

  it('senha errada e e-mail inexistente → mesmo CREDENCIAIS_INVALIDAS', async () => {
    const email = helpers.emailUnico('cred');
    await cadastrar('Pessoa', email);
    const errada = await request(ctx.http).post('/api/auth/login').send({ email, senha: 'outra-senha-999' });
    const inexistente = await request(ctx.http)
      .post('/api/auth/login')
      .send({ email: 'ninguem@teste.dev', senha: 'outra-senha-999' });
    expect(errada.status).toBe(401);
    expect(inexistente.status).toBe(401);
    expect(errada.body).toEqual(inexistente.body);
    expect(errada.body.codigo).toBe('CREDENCIAIS_INVALIDAS');
  });

  it('login correto abre sessão; conta sem senha (só Firebase) não entra por senha', async () => {
    const email = helpers.emailUnico('login');
    await cadastrar('Pessoa', email);
    const agente = request.agent(ctx.http);
    const r = await agente.post('/api/auth/login').send({ email: email.toUpperCase(), senha: SENHA });
    expect(r.status).toBe(200);
    expect((await agente.get('/api/auth/me')).status).toBe(200);

    const soFirebase = await helpers.sessaoFirebase(ctx.http, helpers.emailUnico('fb'));
    const semSenha = await request(ctx.http).post('/api/auth/login').send({ email: soFirebase.email, senha: SENHA });
    expect(semSenha.body.codigo).toBe('CREDENCIAIS_INVALIDAS');
  });

  it('cadastro sem aceite → VALIDACAO', async () => {
    const r = await request(ctx.http)
      .post('/api/auth/cadastro')
      .send({ nome: 'Sem Aceite', email: helpers.emailUnico(), senha: SENHA, aceitouTermos: false });
    expect(r.status).toBe(400);
    expect(r.body.codigo).toBe('VALIDACAO');
    expect(r.body.campos).toHaveProperty('aceitouTermos');
  });

  it('e-mail é salvo em lowercase + trim, com hash argon2id', async () => {
    const { r } = await cadastrar('Caixa Alta', '  CAIXA.Alta@Teste.DEV ');
    expect(r.status).toBe(201);
    const u = await ctx.prisma.usuario.findUnique({ where: { email: 'caixa.alta@teste.dev' } });
    expect(u?.senhaHash?.startsWith('$argon2id$')).toBe(true);
  });
});
