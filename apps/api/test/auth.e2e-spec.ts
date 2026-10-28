import request from 'supertest';
import { type Contexto, criarApp, emailUnico, limparTudo, novoUsuarioLogado } from './helpers';

describe('Auth (e2e)', () => {
  let ctx: Contexto;

  beforeAll(async () => {
    ctx = await criarApp();
    await limparTudo(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('cadastro → me (200) → logout → me (401)', async () => {
    const agente = request.agent(ctx.http);
    const email = emailUnico('fluxo');
    const cad = await agente
      .post('/api/auth/cadastro')
      .send({ nome: 'Maria Souza', email, senha: 'senha-segura-123', aceitouTermos: true });
    expect(cad.status).toBe(201);
    const setCookie = String(cad.headers['set-cookie']);
    expect(setCookie).toContain('everest_sessao=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/');

    const me = await agente.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ usuario: { email, nome: 'Maria Souza', papel: 'USUARIO' }, participacao: null });
    expect(JSON.stringify(me.body)).not.toContain('senha');

    const out = await agente.post('/api/auth/logout');
    expect(out.status).toBe(200);

    const me2 = await agente.get('/api/auth/me');
    expect(me2.status).toBe(401);
    expect(me2.body).toEqual({ codigo: 'NAO_AUTENTICADO', mensagem: expect.any(String) });
  });

  it('e-mail duplicado → EMAIL_EM_USO (inclusive com caixa diferente)', async () => {
    const email = emailUnico('dup');
    await novoUsuarioLogado(ctx.http, 'Primeiro', email);
    const r = await request(ctx.http)
      .post('/api/auth/cadastro')
      .send({ nome: 'Segundo', email: email.toUpperCase(), senha: 'senha-segura-123', aceitouTermos: true });
    expect(r.status).toBe(409);
    expect(r.body.codigo).toBe('EMAIL_EM_USO');
  });

  it('senha errada e e-mail inexistente → mesmo CREDENCIAIS_INVALIDAS', async () => {
    const { email } = await novoUsuarioLogado(ctx.http);
    const errada = await request(ctx.http).post('/api/auth/login').send({ email, senha: 'outra-senha-999' });
    const inexistente = await request(ctx.http)
      .post('/api/auth/login')
      .send({ email: 'ninguem@teste.dev', senha: 'outra-senha-999' });
    expect(errada.status).toBe(401);
    expect(inexistente.status).toBe(401);
    expect(errada.body).toEqual(inexistente.body);
    expect(errada.body.codigo).toBe('CREDENCIAIS_INVALIDAS');
  });

  it('login correto abre sessão', async () => {
    const { email } = await novoUsuarioLogado(ctx.http);
    const agente = request.agent(ctx.http);
    const r = await agente.post('/api/auth/login').send({ email: email.toUpperCase(), senha: 'senha-segura-123' });
    expect(r.status).toBe(200);
    expect((await agente.get('/api/auth/me')).status).toBe(200);
  });

  it('cadastro sem aceite → VALIDACAO', async () => {
    const r = await request(ctx.http)
      .post('/api/auth/cadastro')
      .send({ nome: 'Sem Aceite', email: emailUnico(), senha: 'senha-segura-123', aceitouTermos: false });
    expect(r.status).toBe(400);
    expect(r.body.codigo).toBe('VALIDACAO');
    expect(r.body.campos).toHaveProperty('aceitouTermos');
  });

  it('e-mail é salvo em lowercase + trim', async () => {
    const r = await request(ctx.http)
      .post('/api/auth/cadastro')
      .send({ nome: 'Caixa Alta', email: '  CAIXA.Alta@Teste.DEV ', senha: 'senha-segura-123', aceitouTermos: true });
    expect(r.status).toBe(201);
    const u = await ctx.prisma.usuario.findUnique({ where: { email: 'caixa.alta@teste.dev' } });
    expect(u).not.toBeNull();
    expect(u?.senhaHash.startsWith('$argon2id$')).toBe(true);
  });

  it('incrementar tokenVersao invalida a sessão', async () => {
    const { agente, id } = await novoUsuarioLogado(ctx.http);
    expect((await agente.get('/api/auth/me')).status).toBe(200);
    await ctx.prisma.usuario.update({ where: { id }, data: { tokenVersao: { increment: 1 } } });
    expect((await agente.get('/api/auth/me')).status).toBe(401);
  });

  it('cookie adulterado → 401', async () => {
    const r = await request(ctx.http).get('/api/auth/me').set('Cookie', 'everest_sessao=abc.def.ghi');
    expect(r.status).toBe(401);
  });

  it('mutação com Origin estranho → PROIBIDO; Origin permitido passa', async () => {
    const bloqueado = await request(ctx.http)
      .post('/api/auth/login')
      .set('Origin', 'https://site-malicioso.com')
      .send({ email: 'a@b.com', senha: 'x' });
    expect(bloqueado.status).toBe(403);
    expect(bloqueado.body.codigo).toBe('PROIBIDO');

    const permitido = await request(ctx.http)
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({ email: 'a@b.com', senha: 'x' });
    expect(permitido.status).toBe(401);
  });

  it('JSON malformado → VALIDACAO no formato padrão', async () => {
    const r = await request(ctx.http)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    expect(r.status).toBe(400);
    expect(r.body.codigo).toBe('VALIDACAO');
  });

  it('rota inexistente → NAO_ENCONTRADO', async () => {
    const r = await request(ctx.http).get('/api/nao-existe');
    expect(r.status).toBe(404);
    expect(r.body.codigo).toBe('NAO_ENCONTRADO');
  });
});
