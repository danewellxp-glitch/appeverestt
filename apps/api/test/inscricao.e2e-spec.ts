import request from 'supertest';
import { inscrever } from '../src/modules/inscricoes/inscrever';
import {
  DADOS_PERFIL,
  type Contexto,
  criarApp,
  criarDesafio,
  emailUnico,
  limparTudo,
  novoUsuarioLogado,
  sessaoFirebase,
  tornarAdmin,
} from './helpers';

describe('Desafio e inscrição (e2e)', () => {
  let ctx: Contexto;

  beforeAll(async () => {
    ctx = await criarApp();
  });

  beforeEach(async () => {
    await limparTudo(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('GET /desafios/atual é público e traz vagas', async () => {
    await criarDesafio(ctx.prisma, { inicioRelativo: 5, totalVagas: 50 });
    const r = await request(ctx.http).get('/api/desafios/atual');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      slug: 'desafio-teste',
      status: 'NAO_INICIADO',
      diasParaInicio: 5,
      diaAtual: null,
      totalVagas: 50,
      vagasDisponiveis: 50,
      inscricoesAbertas: true,
      instagramHandle: 'everest_teste',
      hashtag: 'DESAFIO30EVEREST',
      // PIX_COPIA_E_COLA do env de teste = payload demo de R$ 50,00
      inscricao: { valorCentavos: 5000 },
    });
  });

  it('sem login → NAO_AUTENTICADO', async () => {
    await criarDesafio(ctx.prisma);
    const r = await request(ctx.http).post('/api/desafios/desafio-teste/inscricao');
    expect(r.status).toBe(401);
  });

  it('perfil incompleto (sem aceite ou sem dados de cadastro) → 403 PERFIL_INCOMPLETO, sem gastar vaga', async () => {
    await criarDesafio(ctx.prisma, { totalVagas: 50 });
    const { agente } = await sessaoFirebase(ctx.http, emailUnico('incompleto'), { nome: 'Gabi Google' });
    const r = await agente.post('/api/desafios/desafio-teste/inscricao');
    expect(r.status).toBe(403);
    expect(r.body.codigo).toBe('PERFIL_INCOMPLETO');
    expect(await ctx.prisma.participante.count()).toBe(0);

    // Completa o perfil e consegue a vaga.
    await agente.patch('/api/me').send({ ...DADOS_PERFIL, nome: 'Gabi Google' });
    expect((await agente.post('/api/desafios/desafio-teste/inscricao')).status).toBe(201);
  });

  it('inscrição cria vaga 1, atualiza o contador (cache invalidado) e é idempotente', async () => {
    await criarDesafio(ctx.prisma, { totalVagas: 50 });
    // aquece o cache de vagas
    expect((await request(ctx.http).get('/api/desafios/atual')).body.vagasDisponiveis).toBe(50);

    const { agente } = await novoUsuarioLogado(ctx.http);
    const r1 = await agente.post('/api/desafios/desafio-teste/inscricao');
    expect(r1.status).toBe(201);
    expect(r1.body).toMatchObject({
      criada: true,
      participacao: { vagaNumero: 1, ehEmbaixador: false, pagamentoStatus: 'PENDENTE' },
    });

    expect((await request(ctx.http).get('/api/desafios/atual')).body.vagasDisponiveis).toBe(49);

    const r2 = await agente.post('/api/desafios/desafio-teste/inscricao');
    expect(r2.status).toBe(200);
    expect(r2.body).toMatchObject({ criada: false, participacao: { vagaNumero: 1, pagamentoStatus: 'PENDENTE' } });

    const me = await agente.get('/api/auth/me');
    expect(me.body.participacao).toMatchObject({
      desafioSlug: 'desafio-teste',
      vagaNumero: 1,
      pagamentoStatus: 'PENDENTE',
    });
  });

  it('admin se inscreve sem pagar: a vaga já nasce CONFIRMADO', async () => {
    await criarDesafio(ctx.prisma, { totalVagas: 50 });
    const { agente, id } = await novoUsuarioLogado(ctx.http);
    await tornarAdmin(ctx.prisma, id);
    const r = await agente.post('/api/desafios/desafio-teste/inscricao');
    expect(r.status).toBe(201);
    expect(r.body.participacao).toMatchObject({ vagaNumero: 1, pagamentoStatus: 'CONFIRMADO' });
  });

  it('concorrência: 60 inscrições em paralelo com 50 vagas → 50 sucessos, 10 VAGAS_ESGOTADAS', async () => {
    const desafio = await criarDesafio(ctx.prisma, { totalVagas: 50 });
    const usuarios = await Promise.all(
      Array.from({ length: 60 }, (_, i) => novoUsuarioLogado(ctx.http, `Pessoa ${i}`, emailUnico('conc'))),
    );

    const respostas = await Promise.all(
      usuarios.map((u) => u.agente.post('/api/desafios/desafio-teste/inscricao')),
    );

    const criadas = respostas.filter((r) => r.status === 201);
    const esgotadas = respostas.filter((r) => r.status === 409 && r.body.codigo === 'VAGAS_ESGOTADAS');
    expect(criadas).toHaveLength(50);
    expect(esgotadas).toHaveLength(10);

    const participantes = await ctx.prisma.participante.findMany({ where: { desafioId: desafio.id } });
    expect(participantes).toHaveLength(50);
    const vagas = participantes.map((p) => p.vagaNumero);
    expect(new Set(vagas).size).toBe(50);
    expect(vagas.every((v) => v !== null && v >= 1 && v <= 50)).toBe(true);

    const atual = await request(ctx.http).get('/api/desafios/atual');
    expect(atual.body.vagasDisponiveis).toBe(0);
  });

  it('mesmo usuário 2× em paralelo → 1 inscrição; as duas respostas com sucesso', async () => {
    const desafio = await criarDesafio(ctx.prisma);
    const { agente } = await novoUsuarioLogado(ctx.http);
    const [a, b] = await Promise.all([
      agente.post('/api/desafios/desafio-teste/inscricao'),
      agente.post('/api/desafios/desafio-teste/inscricao'),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 201]);
    expect(await ctx.prisma.participante.count({ where: { desafioId: desafio.id } })).toBe(1);
  });

  it('inscricoesAbertas = false → INSCRICOES_FECHADAS', async () => {
    await criarDesafio(ctx.prisma, { inscricoesAbertas: false });
    const { agente } = await novoUsuarioLogado(ctx.http);
    const r = await agente.post('/api/desafios/desafio-teste/inscricao');
    expect(r.status).toBe(409);
    expect(r.body.codigo).toBe('INSCRICOES_FECHADAS');
  });

  it('desafio encerrado → DESAFIO_ENCERRADO', async () => {
    await criarDesafio(ctx.prisma, { inicioRelativo: -30 });
    const { agente } = await novoUsuarioLogado(ctx.http);
    const r = await agente.post('/api/desafios/desafio-teste/inscricao');
    expect(r.body.codigo).toBe('DESAFIO_ENCERRADO');
  });

  it('slug inexistente → NAO_ENCONTRADO', async () => {
    await criarDesafio(ctx.prisma);
    const { agente } = await novoUsuarioLogado(ctx.http);
    const r = await agente.post('/api/desafios/nao-existe/inscricao');
    expect(r.status).toBe(404);
    expect(r.body.codigo).toBe('NAO_ENCONTRADO');
  });

  it('Q3: embaixador ocupa vaga quando embaixadorOcupaVaga = true', async () => {
    await criarDesafio(ctx.prisma, { totalVagas: 2, embaixadorOcupaVaga: true });
    const emb = await novoUsuarioLogado(ctx.http);
    const r = await inscrever(ctx.prisma, { slug: 'desafio-teste', usuarioId: emb.id, embaixador: true });
    expect(r.participante).toMatchObject({ vagaNumero: 1, ehEmbaixador: true, pagamentoStatus: 'CONFIRMADO' });
    expect(r.participante.pagamentoConfirmadoEm).not.toBeNull();
    expect((await request(ctx.http).get('/api/desafios/atual')).body.vagasDisponiveis).toBe(1);
  });

  it('Q3: embaixador NÃO ocupa vaga quando embaixadorOcupaVaga = false', async () => {
    await criarDesafio(ctx.prisma, { totalVagas: 1, embaixadorOcupaVaga: false });
    const emb = await novoUsuarioLogado(ctx.http);
    const r = await inscrever(ctx.prisma, { slug: 'desafio-teste', usuarioId: emb.id, embaixador: true });
    expect(r.participante).toMatchObject({ vagaNumero: null, ehEmbaixador: true, pagamentoStatus: 'CONFIRMADO' });

    const { agente } = await novoUsuarioLogado(ctx.http);
    const outro = await agente.post('/api/desafios/desafio-teste/inscricao');
    expect(outro.status).toBe(201);
    expect(outro.body.participacao.vagaNumero).toBe(1);
  });
});
