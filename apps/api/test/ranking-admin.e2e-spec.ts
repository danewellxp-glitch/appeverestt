import request from 'supertest';
import {
  CHECKIN_COMPLETO,
  type Contexto,
  cenarioInscrito,
  criarApp,
  criarDesafio,
  fotosFalsas,
  limparTudo,
  participanteComDias,
  tornarAdmin,
} from './helpers';

describe('Ranking (e2e)', () => {
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

  it('ordem respeita dias concluídos e os desempates da Q5; sem e-mail', async () => {
    // hoje = dia 7
    const desafio = await criarDesafio(ctx.prisma, { inicioRelativo: -6 });
    const antiga = new Date('2026-01-01T00:00:00Z');
    await participanteComDias(ctx.prisma, desafio.id, 'Ana Antiga', [1, 2, 4, 5], { dataInscricao: antiga });
    await participanteComDias(ctx.prisma, desafio.id, 'Bruno Mais Dias', [1, 3, 5, 6, 2]);
    await participanteComDias(ctx.prisma, desafio.id, 'Carla Melhor Seq', [1, 2, 3, 6]);
    await participanteComDias(ctx.prisma, desafio.id, 'Davi Seq Atual', [1, 2, 5, 6]);
    await participanteComDias(ctx.prisma, desafio.id, 'Eva Empate', [1, 2, 4, 5]);
    const eu = await cenarioInscrito(ctx, { nome: 'Fabio Zero' });

    const r = await eu.agente.get('/api/desafios/desafio-teste/ranking');
    expect(r.status).toBe(200);
    const nomes = (r.body.itens as { nomeExibicao: string }[]).map((i) => i.nomeExibicao);
    // Bruno 5 dias; Carla 4 (melhor seq 3); Davi 4 (seq 2, atual 2); Ana 4 (seq 2, atual 0, mais antiga); Eva igual Ana porém mais nova
    expect(nomes).toEqual(['Bruno D.', 'Carla S.', 'Davi A.', 'Ana A.', 'Eva E.', 'Fabio Z.']);
    expect(r.body.minhaPosicao).toBe(6);
    expect(JSON.stringify(r.body)).not.toContain('@');
  });

  it('dia invalidado não conta; concluir um dia atualiza o ranking (cache invalidado)', async () => {
    const desafio = await criarDesafio(ctx.prisma, { inicioRelativo: -3 });
    const outro = await participanteComDias(ctx.prisma, desafio.id, 'Outra Pessoa', [1, 2]);
    const eu = await cenarioInscrito(ctx, { nome: 'Eu Mesmo' });

    let r = await eu.agente.get('/api/desafios/desafio-teste/ranking');
    expect(r.body.itens[0].nomeExibicao).toBe('Outra P.');

    await ctx.prisma.diaDesafio.updateMany({
      where: { participanteId: outro, numeroDia: 1 },
      data: { invalidado: true, concluido: false },
    });
    await ctx.prisma.diaDesafio.updateMany({
      where: { participanteId: outro, numeroDia: 2 },
      data: { invalidado: true, concluido: false },
    });
    // concluir o dia de hoje pela API invalida o cache
    await fotosFalsas(ctx.prisma, eu.participanteId, eu.hoje);
    const put = await eu.agente.put(`/api/desafios/desafio-teste/dias/${eu.hoje}`).send(CHECKIN_COMPLETO);
    expect(put.body.concluido).toBe(true);

    r = await eu.agente.get('/api/desafios/desafio-teste/ranking');
    expect(r.body.itens.map((i: { nomeExibicao: string }) => i.nomeExibicao)).toEqual(['Eu M.', 'Outra P.']);
    expect(r.body.itens[1].diasConcluidos).toBe(0);
    expect(r.body.minhaPosicao).toBe(1);
  });

  it('não inscrito → NAO_INSCRITO', async () => {
    await criarDesafio(ctx.prisma);
    const agente = request.agent(ctx.http);
    await agente
      .post('/api/auth/cadastro')
      .send({ nome: 'Fora', email: 'fora@teste.dev', senha: 'senha-segura-123', aceitouTermos: true });
    expect((await agente.get('/api/desafios/desafio-teste/ranking')).body.codigo).toBe('NAO_INSCRITO');
  });
});

describe('Admin (e2e)', () => {
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

  it('não admin recebe 403 em todas as rotas admin', async () => {
    const { agente, participanteId } = await cenarioInscrito(ctx);
    const rotas = [
      agente.get('/api/admin/desafios/desafio-teste/participantes'),
      agente.get(`/api/admin/desafios/desafio-teste/participantes/${participanteId}`),
      agente.get(`/api/admin/desafios/desafio-teste/participantes/${participanteId}/dias/1`),
      agente.patch('/api/admin/dias/qualquer/invalidacao').send({ invalidado: false }),
      agente.patch('/api/admin/desafios/desafio-teste').send({ inscricoesAbertas: false }),
    ];
    for (const r of await Promise.all(rotas)) {
      expect(r.status).toBe(403);
      expect(r.body.codigo).toBe('PROIBIDO');
    }
    expect((await request(ctx.http).get('/api/admin/desafios/desafio-teste/participantes')).status).toBe(401);
  });

  it('invalidar remove o dia da contagem; revalidar devolve; motivo é obrigatório', async () => {
    const participante = await cenarioInscrito(ctx, { nome: 'Participante Um' });
    const diaId = await fotosFalsas(ctx.prisma, participante.participanteId, participante.hoje);
    await participante.agente
      .put(`/api/desafios/desafio-teste/dias/${participante.hoje}`)
      .send(CHECKIN_COMPLETO);

    const admin = await cenarioInscrito(ctx, { nome: 'Anderson Admin' });
    await tornarAdmin(ctx.prisma, admin.usuarioId);

    const lista = await admin.agente.get('/api/admin/desafios/desafio-teste/participantes');
    expect(lista.status).toBe(200);
    const alvo = lista.body.participantes.find(
      (p: { participanteId: string }) => p.participanteId === participante.participanteId,
    );
    expect(alvo).toMatchObject({ diasConcluidos: 1, diasInvalidados: 0, nome: 'Participante Um' });

    const semMotivo = await admin.agente.patch(`/api/admin/dias/${diaId}/invalidacao`).send({ invalidado: true });
    expect(semMotivo.body.codigo).toBe('VALIDACAO');

    const inv = await admin.agente
      .patch(`/api/admin/dias/${diaId}/invalidacao`)
      .send({ invalidado: true, motivo: 'Foto repetida' });
    expect(inv.status).toBe(200);
    expect(inv.body).toMatchObject({ invalidado: true, concluido: false, motivoInvalidacao: 'Foto repetida' });

    const dia = await ctx.prisma.diaDesafio.findUniqueOrThrow({ where: { id: diaId } });
    expect(dia.invalidadoPorId).toBe(admin.usuarioId);
    expect(dia.invalidadoEm).not.toBeNull();

    let ranking = await participante.agente.get('/api/desafios/desafio-teste/ranking');
    const linha = () =>
      ranking.body.itens.find((i: { participanteId: string }) => i.participanteId === participante.participanteId);
    expect(linha().diasConcluidos).toBe(0);

    const detalheDia = await admin.agente.get(
      `/api/admin/desafios/desafio-teste/participantes/${participante.participanteId}/dias/${participante.hoje}`,
    );
    expect(detalheDia.body).toMatchObject({ invalidado: true, diaId, nomeParticipante: 'Participante Um' });
    expect(detalheDia.body.fotos).toHaveLength(3);
    expect(detalheDia.body.fotos[0].url).toContain('X-Amz-Signature');

    const prog = await participante.agente.get('/api/desafios/desafio-teste/meu-progresso');
    expect(prog.body.dias[participante.hoje - 1].situacao).toBe('INVALIDADO');

    const rev = await admin.agente.patch(`/api/admin/dias/${diaId}/invalidacao`).send({ invalidado: false });
    expect(rev.body).toMatchObject({ invalidado: false, concluido: true, motivoInvalidacao: null });

    ranking = await participante.agente.get('/api/desafios/desafio-teste/ranking');
    expect(linha().diasConcluidos).toBe(1);

    const detalhe = await admin.agente.get(
      `/api/admin/desafios/desafio-teste/participantes/${participante.participanteId}`,
    );
    expect(detalhe.body.progresso.diasConcluidos).toBe(1);
  });

  it('admin fecha as inscrições e o público vê fechado', async () => {
    const admin = await cenarioInscrito(ctx);
    await tornarAdmin(ctx.prisma, admin.usuarioId);
    const r = await admin.agente.patch('/api/admin/desafios/desafio-teste').send({ inscricoesAbertas: false });
    expect(r.body.inscricoesAbertas).toBe(false);
    const pub = await request(ctx.http).get('/api/desafios/atual');
    expect(pub.body.inscricoesAbertas).toBe(false);
  });

  it('dia inexistente → NAO_ENCONTRADO', async () => {
    const admin = await cenarioInscrito(ctx);
    await tornarAdmin(ctx.prisma, admin.usuarioId);
    const r = await admin.agente.patch('/api/admin/dias/nao-existe/invalidacao').send({ invalidado: false });
    expect(r.status).toBe(404);
  });
});
