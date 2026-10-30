import request from 'supertest';
import {
  type Contexto,
  criarApp,
  emailUnico,
  limparTudo,
  novoUsuarioLogado,
  sessaoFirebase,
  uidUnico,
} from './helpers';
import { tokenTeste } from './verificador-falso';

describe('Auth via Firebase (e2e)', () => {
  let ctx: Contexto;

  beforeAll(async () => {
    ctx = await criarApp();
    await limparTudo(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('uid novo → cria usuário com perfil incompleto e grava o cookie; me (200) → logout → me (401)', async () => {
    const agente = request.agent(ctx.http);
    const email = emailUnico('novo');
    const r = await agente
      .post('/api/auth/sessao')
      .send({ idToken: tokenTeste(uidUnico(), email, { nome: 'Maria Souza' }) });
    expect(r.status).toBe(200);
    const setCookie = String(r.headers['set-cookie']);
    expect(setCookie).toContain('everest_sessao=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/');
    expect(r.body).toEqual({
      usuario: {
        id: expect.any(String),
        nome: 'Maria Souza',
        email,
        papel: 'USUARIO',
        fotoUrl: null,
        perfilCompleto: false,
      },
      participacao: null,
    });

    const me = await agente.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.usuario.perfilCompleto).toBe(false);
    expect(JSON.stringify(me.body)).not.toContain('senha');

    expect((await agente.post('/api/auth/logout')).status).toBe(200);
    const me2 = await agente.get('/api/auth/me');
    expect(me2.status).toBe(401);
    expect(me2.body).toEqual({ codigo: 'NAO_AUTENTICADO', mensagem: expect.any(String) });
  });

  it('sem nome no token → usa a parte local do e-mail', async () => {
    const email = emailUnico('semnome');
    const { agente } = await sessaoFirebase(ctx.http, email);
    expect((await agente.get('/api/auth/me')).body.usuario.nome).toBe(email.split('@')[0]);
  });

  it('repetir a sessão do mesmo uid não duplica o usuário', async () => {
    const uid = uidUnico();
    const email = emailUnico('repete');
    const a = await sessaoFirebase(ctx.http, email, { uid });
    const b = await sessaoFirebase(ctx.http, email, { uid });
    expect(b.id).toBe(a.id);
    expect(await ctx.prisma.usuario.count({ where: { firebaseUid: uid } })).toBe(1);
  });

  it('e-mail verificado de um usuário existente (seed/legado) → vincula o uid', async () => {
    const legado = await ctx.prisma.usuario.create({
      data: { nome: 'Ana Legado', email: 'ana.legado@teste.dev', senhaHash: 'x', aceitouTermosEm: new Date() },
    });
    const { id, uid } = await sessaoFirebase(ctx.http, 'ANA.Legado@teste.dev');
    expect(id).toBe(legado.id);
    const depois = await ctx.prisma.usuario.findUniqueOrThrow({ where: { id } });
    expect(depois.firebaseUid).toBe(uid);
  });

  it('e-mail NÃO verificado igual a um existente → 409 EMAIL_EM_USO', async () => {
    const email = emailUnico('tomada');
    await novoUsuarioLogado(ctx.http, 'Dona da Conta', email);
    const r = await request(ctx.http)
      .post('/api/auth/sessao')
      .send({ idToken: tokenTeste(uidUnico(), email, { verificado: false }) });
    expect(r.status).toBe(409);
    expect(r.body.codigo).toBe('EMAIL_EM_USO');
  });

  it('login antigo (auth_time > 5 min) → 401', async () => {
    const r = await request(ctx.http)
      .post('/api/auth/sessao')
      .send({ idToken: tokenTeste(uidUnico(), emailUnico(), { segundosAtras: 301 }) });
    expect(r.status).toBe(401);
    expect(r.body).toEqual({ codigo: 'NAO_AUTENTICADO', mensagem: 'Sua sessão expirou. Entre de novo.' });
  });

  it('token inválido → 401; sem token → VALIDACAO', async () => {
    const invalido = await request(ctx.http).post('/api/auth/sessao').send({ idToken: 'lixo' });
    expect(invalido.status).toBe(401);
    const vazio = await request(ctx.http).post('/api/auth/sessao').send({});
    expect(vazio.status).toBe(400);
    expect(vazio.body.codigo).toBe('VALIDACAO');
  });

  it('PATCH /me com aceite → perfilCompleto e nome novo; sem aceite → VALIDACAO', async () => {
    const { agente } = await sessaoFirebase(ctx.http, emailUnico('perfil'));
    const sem = await agente.patch('/api/me').send({ nome: 'Maria', aceitouTermos: false });
    expect(sem.status).toBe(400);
    expect(sem.body.codigo).toBe('VALIDACAO');
    expect(sem.body.campos).toHaveProperty('aceitouTermos');

    const ok = await agente.patch('/api/me').send({ nome: '  Maria Souza Lima ', aceitouTermos: true });
    expect(ok.status).toBe(200);
    expect(ok.body.usuario).toMatchObject({ nome: 'Maria Souza Lima', perfilCompleto: true });
  });

  it('PATCH /me sem sessão → 401', async () => {
    const r = await request(ctx.http).patch('/api/me').send({ nome: 'X Y', aceitouTermos: true });
    expect(r.status).toBe(401);
  });

  it('login/cadastro por senha ficam desligados sem AUTH_SENHA_LEGADO (404)', async () => {
    const login = await request(ctx.http).post('/api/auth/login').send({ email: 'a@b.com', senha: 'senha-segura-123' });
    expect(login.status).toBe(404);
    expect(login.body.codigo).toBe('NAO_ENCONTRADO');
    const cadastro = await request(ctx.http)
      .post('/api/auth/cadastro')
      .send({ nome: 'Fulano', email: emailUnico(), senha: 'senha-segura-123', aceitouTermos: true });
    expect(cadastro.status).toBe(404);
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
      .post('/api/auth/sessao')
      .set('Origin', 'https://site-malicioso.com')
      .send({ idToken: 'lixo' });
    expect(bloqueado.status).toBe(403);
    expect(bloqueado.body.codigo).toBe('PROIBIDO');

    const permitido = await request(ctx.http)
      .post('/api/auth/sessao')
      .set('Origin', 'http://localhost:5173')
      .send({ idToken: 'lixo' });
    expect(permitido.status).toBe(401);
  });

  it('JSON malformado → VALIDACAO no formato padrão', async () => {
    const r = await request(ctx.http)
      .post('/api/auth/sessao')
      .set('Content-Type', 'application/json')
      .send('{"idToken": ');
    expect(r.status).toBe(400);
    expect(r.body.codigo).toBe('VALIDACAO');
  });

  it('rota inexistente → NAO_ENCONTRADO', async () => {
    const r = await request(ctx.http).get('/api/nao-existe');
    expect(r.status).toBe(404);
    expect(r.body.codigo).toBe('NAO_ENCONTRADO');
  });
});
