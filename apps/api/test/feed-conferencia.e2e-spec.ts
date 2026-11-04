import request from 'supertest';
import {
  CHECKIN_COMPLETO,
  type Contexto,
  cenarioInscrito,
  criarApp,
  criarDesafio,
  fotosFalsas,
  limparTudo,
  novoUsuarioLogado,
  participanteComDias,
  tornarAdmin,
} from './helpers';

const SLUG = 'desafio-teste';

describe('Feed — GET /desafios/:slug/feed (e2e)', () => {
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

  it('fecharamHoje, avatares, maior sequência ativa e vagas batem com o banco', async () => {
    // hoje = dia 4
    const desafio = await criarDesafio(ctx.prisma, { inicioRelativo: -3 });
    await participanteComDias(ctx.prisma, desafio.id, 'Ana Clara Ribeiro', [1, 2, 3, 4]);
    await participanteComDias(ctx.prisma, desafio.id, 'Bruno Lima', [3, 4]);
    await participanteComDias(ctx.prisma, desafio.id, 'Carla Dias', [1, 2]);
    const eu = await cenarioInscrito(ctx, { nome: 'Eu Mesma' });

    const r = await eu.agente.get(`/api/desafios/${SLUG}/feed`);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      diaAtual: 4,
      fecharamHoje: 2,
      maiorSequenciaAtiva: { nomeExibicao: 'Ana R.', dias: 4 },
      vagasOcupadas: 4,
      totalVagas: 50,
    });
    const avatares = r.body.avataresHoje as { nomeExibicao: string; iniciais: string; fotoUrl: string | null }[];
    expect(avatares).toHaveLength(2);
    expect(avatares.map((a) => a.iniciais).sort()).toEqual(['AR', 'BL']);
    expect(JSON.stringify(r.body)).not.toContain('@');
  });

  it('concluir o dia de hoje atualiza o feed na hora (cache invalidado)', async () => {
    const eu = await cenarioInscrito(ctx, { nome: 'Eu Mesma' });
    expect((await eu.agente.get(`/api/desafios/${SLUG}/feed`)).body.fecharamHoje).toBe(0);
    await fotosFalsas(ctx.prisma, eu.participanteId, eu.hoje);
    expect((await eu.agente.put(`/api/desafios/${SLUG}/dias/${eu.hoje}`).send(CHECKIN_COMPLETO)).body.concluido).toBe(true);
    const r = await eu.agente.get(`/api/desafios/${SLUG}/feed`);
    expect(r.body.fecharamHoje).toBe(1);
    expect(r.body.avataresHoje[0]).toEqual({ nomeExibicao: 'Eu M.', iniciais: 'EM', fotoUrl: null });
  });

  it('não inscrito e não admin → 403; admin não inscrito → 200; sem sessão → 401', async () => {
    await criarDesafio(ctx.prisma, { inicioRelativo: -1 });
    const fora = await novoUsuarioLogado(ctx.http, 'Fora Daqui');
    const r = await fora.agente.get(`/api/desafios/${SLUG}/feed`);
    expect(r.status).toBe(403);
    expect(r.body.codigo).toBe('NAO_INSCRITO');

    const admin = await novoUsuarioLogado(ctx.http, 'Admin');
    await tornarAdmin(ctx.prisma, admin.id);
    expect((await admin.agente.get(`/api/desafios/${SLUG}/feed`)).status).toBe(200);

    expect((await request(ctx.http).get(`/api/desafios/${SLUG}/feed`)).status).toBe(401);
  });

  it('desafio não iniciado → diaAtual null e ninguém fechou o dia', async () => {
    await criarDesafio(ctx.prisma, { inicioRelativo: 3 });
    const eu = await cenarioInscrito(ctx);
    const r = await eu.agente.get(`/api/desafios/${SLUG}/feed`);
    expect(r.body).toMatchObject({ diaAtual: null, fecharamHoje: 0, avataresHoje: [], maiorSequenciaAtiva: null });
  });
});

describe('Conferência do embaixador (e2e)', () => {
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

  async function cenario() {
    const eu = await cenarioInscrito(ctx, { nome: 'Participante Teste' });
    await fotosFalsas(ctx.prisma, eu.participanteId, eu.hoje);
    await eu.agente.put(`/api/desafios/${SLUG}/dias/${eu.hoje}`).send(CHECKIN_COMPLETO);
    const admin = await novoUsuarioLogado(ctx.http, 'Embaixador');
    await tornarAdmin(ctx.prisma, admin.id);
    const dia = await ctx.prisma.diaDesafio.findUniqueOrThrow({
      where: { participanteId_numeroDia: { participanteId: eu.participanteId, numeroDia: eu.hoje } },
    });
    return { eu, admin, diaId: dia.id };
  }

  async function paraRevisar(admin: Awaited<ReturnType<typeof cenario>>['admin']) {
    const r = await admin.agente.get(`/api/admin/desafios/${SLUG}/participantes`);
    return {
      total: r.body.totalParaRevisar as number,
      porPessoa: (r.body.participantes as { nome: string; paraRevisar: number }[]).map((p) => p.paraRevisar),
    };
  }

  it('aprovar dia concluído → paraRevisar diminui; o grid do admin troca AGUARDANDO por CONCLUIDO', async () => {
    const { eu, admin, diaId } = await cenario();
    expect(await paraRevisar(admin)).toEqual({ total: 1, porPessoa: [1] });

    const grid = async () =>
      (await admin.agente.get(`/api/admin/desafios/${SLUG}/participantes/${eu.participanteId}`)).body.progresso
        .dias[eu.hoje - 1].situacao as string;
    expect(await grid()).toBe('AGUARDANDO_CONFERENCIA');

    const r = await admin.agente.patch(`/api/admin/dias/${diaId}/conferencia`).send({ conferido: true });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ diaId, conferidoEm: expect.any(String) });
    expect(await paraRevisar(admin)).toEqual({ total: 0, porPessoa: [0] });
    expect(await grid()).toBe('CONCLUIDO');

    const detalhe = await admin.agente.get(
      `/api/admin/desafios/${SLUG}/participantes/${eu.participanteId}/dias/${eu.hoje}`,
    );
    expect(detalhe.body.conferidoEm).toBe(r.body.conferidoEm);

    // O participante nunca vê AGUARDANDO_CONFERENCIA nem conferidoEm.
    const meu = await eu.agente.get(`/api/desafios/${SLUG}/meu-progresso`);
    expect(JSON.stringify(meu.body)).not.toContain('AGUARDANDO_CONFERENCIA');
    const meuDia = await eu.agente.get(`/api/desafios/${SLUG}/dias/${eu.hoje}`);
    expect(meuDia.body).not.toHaveProperty('conferidoEm');
  });

  it('editar o dia depois da aprovação → volta para a revisão', async () => {
    const { eu, admin, diaId } = await cenario();
    await admin.agente.patch(`/api/admin/dias/${diaId}/conferencia`).send({ conferido: true });
    expect((await paraRevisar(admin)).total).toBe(0);

    await eu.agente.put(`/api/desafios/${SLUG}/dias/${eu.hoje}`).send({ ...CHECKIN_COMPLETO, aguaMl: 3500 });
    expect((await paraRevisar(admin)).total).toBe(1);
    const dia = await ctx.prisma.diaDesafio.findUniqueOrThrow({ where: { id: diaId } });
    expect(dia.conferidoEm).toBeNull();
    expect(dia.conferidoPorId).toBeNull();
  });

  it('salvar o mesmo check-in de novo depois da aprovação → continua aprovado', async () => {
    const { eu, admin, diaId } = await cenario();
    await admin.agente.patch(`/api/admin/dias/${diaId}/conferencia`).send({ conferido: true });
    const r = await eu.agente.put(`/api/desafios/${SLUG}/dias/${eu.hoje}`).send(CHECKIN_COMPLETO);
    expect(r.status).toBe(200);
    expect((await paraRevisar(admin)).total).toBe(0);
    expect((await ctx.prisma.diaDesafio.findUniqueOrThrow({ where: { id: diaId } })).conferidoEm).not.toBeNull();
  });

  it('remover uma foto depois da aprovação → zera a conferência', async () => {
    const { eu, admin, diaId } = await cenario();
    await admin.agente.patch(`/api/admin/dias/${diaId}/conferencia`).send({ conferido: true });
    expect((await eu.agente.delete(`/api/desafios/${SLUG}/dias/${eu.hoje}/fotos/AGUA`)).status).toBe(200);
    const dia = await ctx.prisma.diaDesafio.findUniqueOrThrow({ where: { id: diaId } });
    expect(dia.conferidoEm).toBeNull();
  });

  it('aprovar dia não concluído → 409 VALIDACAO; dia inexistente → 404', async () => {
    const eu = await cenarioInscrito(ctx);
    await eu.agente.put(`/api/desafios/${SLUG}/dias/${eu.hoje}`).send({ ...CHECKIN_COMPLETO, aguaMl: 100 });
    const dia = await ctx.prisma.diaDesafio.findUniqueOrThrow({
      where: { participanteId_numeroDia: { participanteId: eu.participanteId, numeroDia: eu.hoje } },
    });
    const admin = await novoUsuarioLogado(ctx.http, 'Embaixador');
    await tornarAdmin(ctx.prisma, admin.id);

    const r = await admin.agente.patch(`/api/admin/dias/${dia.id}/conferencia`).send({ conferido: true });
    expect(r.status).toBe(409);
    expect(r.body.codigo).toBe('VALIDACAO');

    const nada = await admin.agente.patch('/api/admin/dias/nao-existe/conferencia').send({ conferido: true });
    expect(nada.status).toBe(404);
  });

  it('invalidar zera a conferência; revalidar não marca como conferido', async () => {
    const { admin, diaId } = await cenario();
    await admin.agente.patch(`/api/admin/dias/${diaId}/conferencia`).send({ conferido: true });

    await admin.agente.patch(`/api/admin/dias/${diaId}/invalidacao`).send({ invalidado: true, motivo: 'Foto repetida' });
    expect((await ctx.prisma.diaDesafio.findUniqueOrThrow({ where: { id: diaId } })).conferidoEm).toBeNull();
    // Invalidado não entra na fila; aprovar dá erro.
    expect((await paraRevisar(admin)).total).toBe(0);
    expect((await admin.agente.patch(`/api/admin/dias/${diaId}/conferencia`).send({ conferido: true })).status).toBe(409);

    await admin.agente.patch(`/api/admin/dias/${diaId}/invalidacao`).send({ invalidado: false });
    const dia = await ctx.prisma.diaDesafio.findUniqueOrThrow({ where: { id: diaId } });
    expect(dia).toMatchObject({ invalidado: false, concluido: true, conferidoEm: null });
    expect((await paraRevisar(admin)).total).toBe(1);
  });

  it('desfazer a aprovação (conferido: false) devolve à fila', async () => {
    const { admin, diaId } = await cenario();
    await admin.agente.patch(`/api/admin/dias/${diaId}/conferencia`).send({ conferido: true });
    const r = await admin.agente.patch(`/api/admin/dias/${diaId}/conferencia`).send({ conferido: false });
    expect(r.body).toEqual({ diaId, conferidoEm: null });
    expect((await paraRevisar(admin)).total).toBe(1);
  });

  it('não admin → 403', async () => {
    const { eu, diaId } = await cenario();
    const r = await eu.agente.patch(`/api/admin/dias/${diaId}/conferencia`).send({ conferido: true });
    expect(r.status).toBe(403);
    expect(r.body.codigo).toBe('PROIBIDO');
  });
});
