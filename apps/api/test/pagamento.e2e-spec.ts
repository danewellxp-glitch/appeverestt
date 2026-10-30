import request from 'supertest';
import { inscrever } from '../src/modules/inscricoes/inscrever';
import { ENV_TESTE } from './env-teste';
import {
  CHECKIN_COMPLETO,
  type Contexto,
  cenarioInscrito,
  criarApp,
  criarDesafio,
  definirPagamento,
  fotosFalsas,
  limparTudo,
  novoUsuarioLogado,
  participanteComDias,
  tornarAdmin,
} from './helpers';

const BASE = '/api/desafios/desafio-teste';
const ADMIN = '/api/admin/desafios/desafio-teste';

describe('Pagamento por Pix manual (e2e)', () => {
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

  async function novoAdmin() {
    const admin = await novoUsuarioLogado(ctx.http, 'Anderson Admin');
    await tornarAdmin(ctx.prisma, admin.id);
    return admin;
  }

  it('inscrição nasce PENDENTE: gate 403 nas rotas do desafio, GET /pagamento traz o Pix', async () => {
    const eu = await cenarioInscrito(ctx, { pagamento: 'PENDENTE' });

    const rotas = await Promise.all([
      eu.agente.put(`${BASE}/dias/${eu.hoje}`).send(CHECKIN_COMPLETO),
      eu.agente.get(`${BASE}/dias/${eu.hoje}`),
      eu.agente.get(`${BASE}/meu-progresso`),
      eu.agente.get(`${BASE}/ranking`),
      eu.agente.get(`${BASE}/feed`),
      eu.agente.get(`${BASE}/feedback`),
    ]);
    for (const r of rotas) {
      expect(r.status).toBe(403);
      expect(r.body.codigo).toBe('PAGAMENTO_PENDENTE');
    }

    const pag = await eu.agente.get(`${BASE}/pagamento`);
    expect(pag.status).toBe(200);
    expect(pag.body).toEqual({
      status: 'PENDENTE',
      vagaNumero: 1,
      informadoEm: null,
      confirmadoEm: null,
      pix: {
        copiaECola: ENV_TESTE.PIX_COPIA_E_COLA,
        chave: 'pix@exemplo.dev',
        nomeRecebedor: 'EVEREST DEMO',
        valorCentavos: 5000,
      },
      contatoInstagram: 'everest_teste',
    });

    const me = await eu.agente.get('/api/auth/me');
    expect(me.body.participacao).toMatchObject({ vagaNumero: 1, pagamentoStatus: 'PENDENTE' });
  });

  it('não inscrito → 403 NAO_INSCRITO em GET /pagamento e POST /informar; sem login → 401', async () => {
    await criarDesafio(ctx.prisma, { inicioRelativo: -3 });
    const { agente } = await novoUsuarioLogado(ctx.http);
    for (const r of [await agente.get(`${BASE}/pagamento`), await agente.post(`${BASE}/pagamento/informar`)]) {
      expect(r.status).toBe(403);
      expect(r.body.codigo).toBe('NAO_INSCRITO');
    }
    expect((await request(ctx.http).get(`${BASE}/pagamento`)).status).toBe(401);
  });

  it('"Já fiz o pagamento" é idempotente: INFORMADO de novo mantém informadoEm', async () => {
    const eu = await cenarioInscrito(ctx, { pagamento: 'PENDENTE' });
    const r1 = await eu.agente.post(`${BASE}/pagamento/informar`);
    expect(r1.status).toBe(200);
    expect(r1.body).toMatchObject({ status: 'INFORMADO', confirmadoEm: null });
    expect(typeof r1.body.informadoEm).toBe('string');

    const r2 = await eu.agente.post(`${BASE}/pagamento/informar`);
    expect(r2.status).toBe(200);
    expect(r2.body.informadoEm).toBe(r1.body.informadoEm);

    // Informar não libera nada.
    expect((await eu.agente.get(`${BASE}/ranking`)).body.codigo).toBe('PAGAMENTO_PENDENTE');
    expect((await eu.agente.get('/api/auth/me')).body.participacao.pagamentoStatus).toBe('INFORMADO');
  });

  it('admin confirma: acesso liberado, /auth/me traz CONFIRMADO, informar → 409, PATCH idempotente', async () => {
    const eu = await cenarioInscrito(ctx, { pagamento: 'PENDENTE' });
    await eu.agente.post(`${BASE}/pagamento/informar`);
    const admin = await novoAdmin();

    const lista = await admin.agente.get(`${ADMIN}/participantes`);
    expect(lista.body.totalPagamentosInformados).toBe(1);
    expect(lista.body.participantes[0]).toMatchObject({
      participanteId: eu.participanteId,
      pagamentoStatus: 'INFORMADO',
      instagram: 'pessoa.teste',
      whatsapp: '11987654321',
      contaExcluida: false,
      temFeedback: false,
    });

    const c1 = await admin.agente.patch(`${ADMIN}/participantes/${eu.participanteId}/pagamento`).send({ status: 'CONFIRMADO' });
    expect(c1.status).toBe(200);
    expect(c1.body.status).toBe('CONFIRMADO');
    expect(typeof c1.body.confirmadoEm).toBe('string');
    expect(typeof c1.body.informadoEm).toBe('string');
    const c2 = await admin.agente.patch(`${ADMIN}/participantes/${eu.participanteId}/pagamento`).send({ status: 'CONFIRMADO' });
    expect(c2.body.confirmadoEm).toBe(c1.body.confirmadoEm);
    const db = await ctx.prisma.participante.findUniqueOrThrow({ where: { id: eu.participanteId } });
    expect(db.pagamentoConfirmadoPorId).toBe(admin.id);

    expect((await eu.agente.get('/api/auth/me')).body.participacao.pagamentoStatus).toBe('CONFIRMADO');
    expect((await eu.agente.get(`${BASE}/ranking`)).status).toBe(200);
    await fotosFalsas(ctx.prisma, eu.participanteId, eu.hoje);
    const put = await eu.agente.put(`${BASE}/dias/${eu.hoje}`).send(CHECKIN_COMPLETO);
    expect(put.status).toBe(200);
    expect(put.body.concluido).toBe(true);

    const inf = await eu.agente.post(`${BASE}/pagamento/informar`);
    expect(inf.status).toBe(409);
    expect(inf.body.codigo).toBe('PAGAMENTO_JA_CONFIRMADO');
    expect((await eu.agente.get(`${BASE}/pagamento`)).body.status).toBe('CONFIRMADO');

    const invalido = await admin.agente.patch(`${ADMIN}/participantes/${eu.participanteId}/pagamento`).send({ status: 'INFORMADO' });
    expect(invalido.status).toBe(400);
    expect(invalido.body.campos.status).toBeDefined();
    const inexistente = await admin.agente.patch(`${ADMIN}/participantes/nao-existe/pagamento`).send({ status: 'CONFIRMADO' });
    expect(inexistente.status).toBe(404);
  });

  it('"Não recebi" volta para PENDENTE, zera a confirmação e mantém informadoEm; embaixador não volta', async () => {
    const eu = await cenarioInscrito(ctx, { pagamento: 'PENDENTE' });
    const informado = await eu.agente.post(`${BASE}/pagamento/informar`);
    const admin = await novoAdmin();
    await admin.agente.patch(`${ADMIN}/participantes/${eu.participanteId}/pagamento`).send({ status: 'CONFIRMADO' });

    const r = await admin.agente.patch(`${ADMIN}/participantes/${eu.participanteId}/pagamento`).send({ status: 'PENDENTE' });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ status: 'PENDENTE', informadoEm: informado.body.informadoEm, confirmadoEm: null });
    const db = await ctx.prisma.participante.findUniqueOrThrow({ where: { id: eu.participanteId } });
    expect(db.pagamentoConfirmadoPorId).toBeNull();
    expect((await eu.agente.get(`${BASE}/ranking`)).body.codigo).toBe('PAGAMENTO_PENDENTE');
    // idempotente
    expect(
      (await admin.agente.patch(`${ADMIN}/participantes/${eu.participanteId}/pagamento`).send({ status: 'PENDENTE' })).body,
    ).toEqual(r.body);

    // Pode avisar de novo (o informadoEm é atualizado).
    const deNovo = await eu.agente.post(`${BASE}/pagamento/informar`);
    expect(deNovo.body.status).toBe('INFORMADO');

    const emb = await novoUsuarioLogado(ctx.http, 'Tt Embaixador');
    const ins = await inscrever(ctx.prisma, { slug: 'desafio-teste', usuarioId: emb.id, embaixador: true });
    const e = await admin.agente.patch(`${ADMIN}/participantes/${ins.participante.id}/pagamento`).send({ status: 'PENDENTE' });
    expect(e.status).toBe(409);
    expect(e.body.codigo).toBe('VALIDACAO');
  });

  it('ranking e feed mostram só CONFIRMADO; vagas contam pendentes', async () => {
    // hoje = dia 4
    const desafio = await criarDesafio(ctx.prisma, { inicioRelativo: -3, totalVagas: 10 });
    await participanteComDias(ctx.prisma, desafio.id, 'Ana Confirmada', [1, 2, 3, 4]);
    const revertido = await participanteComDias(ctx.prisma, desafio.id, 'Rui Revertido', [1, 2, 3, 4]);
    await definirPagamento(ctx, revertido, 'PENDENTE');
    const pendente = await cenarioInscrito(ctx, { nome: 'Paula Pendente', pagamento: 'PENDENTE' });
    await cenarioInscrito(ctx, { nome: 'Ivo Informado', pagamento: 'INFORMADO' });
    const eu = await cenarioInscrito(ctx, { nome: 'Eva Confirmada' });

    const ranking = await eu.agente.get(`${BASE}/ranking`);
    expect(ranking.status).toBe(200);
    expect(ranking.body.itens.map((i: { nomeExibicao: string }) => i.nomeExibicao)).toEqual(['Ana C.', 'Eva C.']);

    const admin = await novoAdmin();
    const feed = await admin.agente.get(`${BASE}/feed`);
    expect(feed.status).toBe(200);
    expect(feed.body).toMatchObject({ diaAtual: 4, fecharamHoje: 1, vagasOcupadas: 5, totalVagas: 10 });
    expect(feed.body.avataresHoje.map((a: { nomeExibicao: string }) => a.nomeExibicao)).toEqual(['Ana C.']);

    expect((await request(ctx.http).get('/api/desafios/atual')).body.vagasDisponiveis).toBe(5);

    // Confirmar o pendente o coloca no ranking (cache invalidado pelo PATCH).
    await admin.agente.patch(`${ADMIN}/participantes/${pendente.participanteId}/pagamento`).send({ status: 'CONFIRMADO' });
    const depois = await eu.agente.get(`${BASE}/ranking`);
    expect(depois.body.itens).toHaveLength(3);
  });

  it('DELETE libera a vaga: o número é reaproveitado, o feedback vai junto e a pessoa vira não inscrita', async () => {
    await criarDesafio(ctx.prisma, { inicioRelativo: -3, totalVagas: 3 });
    const u1 = await cenarioInscrito(ctx, { nome: 'Um Confirmado' });
    const u2 = await cenarioInscrito(ctx, { nome: 'Dois Pendente', pagamento: 'PENDENTE' });
    const u3 = await cenarioInscrito(ctx, { nome: 'Tres Informado', pagamento: 'INFORMADO' });
    expect((await u2.agente.get('/api/auth/me')).body.participacao.vagaNumero).toBe(2);
    await ctx.prisma.feedback.create({
      data: { participanteId: u2.participanteId, nota: 3, oQueAchou: 'texto de teste', oQueMudou: 'texto de teste' },
    });
    const admin = await novoAdmin();

    // Esgotado: a quarta pessoa não entra.
    const quarta = await novoUsuarioLogado(ctx.http, 'Quarta Pessoa');
    expect((await quarta.agente.post(`${BASE}/inscricao`)).body.codigo).toBe('VAGAS_ESGOTADAS');

    const det = await admin.agente.get(`${ADMIN}/participantes/${u2.participanteId}`);
    expect(det.body.removivel).toBe(true);
    expect(det.body.feedback).toMatchObject({ nota: 3 });
    expect((await admin.agente.get(`${ADMIN}/participantes/${u1.participanteId}`)).body.removivel).toBe(false);

    expect((await request(ctx.http).get('/api/desafios/atual')).body.vagasDisponiveis).toBe(0);
    const del = await admin.agente.delete(`${ADMIN}/participantes/${u2.participanteId}`);
    expect(del.status).toBe(200);
    expect(del.body).toEqual({ ok: true });
    expect(await ctx.prisma.feedback.count()).toBe(0);
    expect((await request(ctx.http).get('/api/desafios/atual')).body.vagasDisponiveis).toBe(1);

    const pag = await u2.agente.get(`${BASE}/pagamento`);
    expect(pag.status).toBe(403);
    expect(pag.body.codigo).toBe('NAO_INSCRITO');
    expect((await u2.agente.get('/api/auth/me')).body.participacao).toBeNull();

    const r = await quarta.agente.post(`${BASE}/inscricao`);
    expect(r.status).toBe(201);
    expect(r.body.participacao.vagaNumero).toBe(2);

    // De novo: remove o INFORMADO (vaga 3) e a pessoa removida se inscreve outra vez.
    expect((await admin.agente.delete(`${ADMIN}/participantes/${u3.participanteId}`)).status).toBe(200);
    expect((await admin.agente.delete(`${ADMIN}/participantes/${u3.participanteId}`)).status).toBe(404);
    const volta = await u2.agente.post(`${BASE}/inscricao`);
    expect(volta.body.participacao).toMatchObject({ vagaNumero: 3, pagamentoStatus: 'PENDENTE' });
  });

  it('remover a vaga 2 → 2 inscrições em paralelo recebem {2, N+1}; DELETE em paralelo com inscrições não dá 500', async () => {
    await criarDesafio(ctx.prisma, { inicioRelativo: -3, totalVagas: 50 });
    const inscritos = [];
    for (let i = 0; i < 4; i++) inscritos.push(await cenarioInscrito(ctx, { nome: `Pessoa ${i}`, pagamento: 'PENDENTE' }));
    const admin = await novoAdmin();
    expect((await admin.agente.delete(`${ADMIN}/participantes/${inscritos[1]!.participanteId}`)).status).toBe(200);

    const [a, b] = await Promise.all([novoUsuarioLogado(ctx.http, 'Nova A'), novoUsuarioLogado(ctx.http, 'Nova B')]);
    const respostas = await Promise.all([a.agente.post(`${BASE}/inscricao`), b.agente.post(`${BASE}/inscricao`)]);
    expect(respostas.map((r) => r.status)).toEqual([201, 201]);
    expect(respostas.map((r) => r.body.participacao.vagaNumero as number).sort((x, y) => x - y)).toEqual([2, 5]);

    // DELETE de duas vagas em paralelo com duas inscrições novas.
    const [c, d] = await Promise.all([novoUsuarioLogado(ctx.http, 'Nova C'), novoUsuarioLogado(ctx.http, 'Nova D')]);
    const misto = await Promise.all([
      admin.agente.delete(`${ADMIN}/participantes/${inscritos[0]!.participanteId}`),
      c.agente.post(`${BASE}/inscricao`),
      admin.agente.delete(`${ADMIN}/participantes/${inscritos[2]!.participanteId}`),
      d.agente.post(`${BASE}/inscricao`),
    ]);
    expect(misto.map((r) => r.status)).toEqual([200, 201, 200, 201]);
    const vagas = (await ctx.prisma.participante.findMany()).map((p) => p.vagaNumero);
    expect(new Set(vagas).size).toBe(vagas.length);
    expect(vagas).toHaveLength(5);
  });

  it('DELETE recusa confirmado, embaixador e quem tem check-in (409); inexistente → 404', async () => {
    const confirmado = await cenarioInscrito(ctx, { nome: 'Cora Confirmada' });
    const comDia = await cenarioInscrito(ctx, { nome: 'Dino Com Dia', pagamento: 'PENDENTE' });
    await ctx.prisma.diaDesafio.create({ data: { participanteId: comDia.participanteId, numeroDia: 1, aguaMl: 500 } });
    const emb = await novoUsuarioLogado(ctx.http, 'Tt Embaixador');
    const ins = await inscrever(ctx.prisma, { slug: 'desafio-teste', usuarioId: emb.id, embaixador: true });
    const admin = await novoAdmin();

    for (const id of [confirmado.participanteId, comDia.participanteId, ins.participante.id]) {
      const r = await admin.agente.delete(`${ADMIN}/participantes/${id}`);
      expect(r.status).toBe(409);
      expect(r.body.codigo).toBe('PARTICIPANTE_NAO_REMOVIVEL');
      expect((await admin.agente.get(`${ADMIN}/participantes/${id}`)).body.removivel).toBe(false);
    }
    const nada = await admin.agente.delete(`${ADMIN}/participantes/nao-existe`);
    expect(nada.status).toBe(404);
    expect(nada.body.codigo).toBe('NAO_ENCONTRADO');
    expect(await ctx.prisma.participante.count()).toBe(3);
  });

  it('detalhe do admin traz dados de cadastro (com idade), pagamento e feedback', async () => {
    const eu = await cenarioInscrito(ctx, { nome: 'Dora Dados', pagamento: 'INFORMADO' });
    const admin = await novoAdmin();
    const r = await admin.agente.get(`${ADMIN}/participantes/${eu.participanteId}`);
    expect(r.status).toBe(200);
    expect(r.body.dados).toMatchObject({
      instagram: 'pessoa.teste',
      whatsapp: '11987654321',
      dataNascimento: '1995-04-12',
      bairro: 'Pinheiros',
      cidade: 'São Paulo',
      uf: 'SP',
      aceitouMarketingEm: null,
      excluidoEm: null,
    });
    expect(r.body.dados.idade).toBeGreaterThanOrEqual(31);
    expect(typeof r.body.dados.aceitouTermosEm).toBe('string');
    expect(r.body.pagamento).toMatchObject({ status: 'INFORMADO', confirmadoEm: null });
    expect(r.body.feedback).toBeNull();
    expect(r.body.removivel).toBe(true);
    expect(r.body.participante).toMatchObject({ pagamentoStatus: 'INFORMADO', temFeedback: false });
  });
});
