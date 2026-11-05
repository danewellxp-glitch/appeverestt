import request from 'supertest';
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
} from './helpers';

describe('Check-in diário e progresso (e2e)', () => {
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

  it('GET do dia atual: vazio, editável e com 5 pendências', async () => {
    const { agente, hoje } = await cenarioInscrito(ctx);
    const r = await agente.get(`/api/desafios/desafio-teste/dias/${hoje}`);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      numeroDia: hoje,
      aguaMl: 0,
      editavel: true,
      concluido: false,
      requisitosPendentes: ['AGUA', 'EXERCICIO', 'LEITURA', 'FOTOS', 'STORY'],
      fotos: [],
    });
  });

  it('completar 4 requisitos (sem fotos) não conclui', async () => {
    const { agente, hoje } = await cenarioInscrito(ctx);
    const r = await agente.put(`/api/desafios/desafio-teste/dias/${hoje}`).send(CHECKIN_COMPLETO);
    expect(r.status).toBe(200);
    expect(r.body.concluido).toBe(false);
    expect(r.body.requisitosPendentes).toEqual(['FOTOS']);
  });

  it('completar os 5 requisitos conclui; desfazer um volta a não concluído', async () => {
    const { agente, hoje, participanteId } = await cenarioInscrito(ctx);
    await fotosFalsas(ctx.prisma, participanteId, hoje);
    const r = await agente.put(`/api/desafios/desafio-teste/dias/${hoje}`).send(CHECKIN_COMPLETO);
    expect(r.body.concluido).toBe(true);
    expect(r.body.requisitosPendentes).toEqual([]);

    const r2 = await agente
      .put(`/api/desafios/desafio-teste/dias/${hoje}`)
      .send({ ...CHECKIN_COMPLETO, aguaMl: 2999 });
    expect(r2.body.concluido).toBe(false);
    expect(r2.body.requisitosPendentes).toEqual(['AGUA']);
  });

  it('concluidoEm (X22): carimba ao fechar, mantém em edições que seguem fechando e limpa ao desfazer', async () => {
    const { agente, hoje, participanteId } = await cenarioInscrito(ctx);
    await fotosFalsas(ctx.prisma, participanteId, hoje);
    const dia = () =>
      ctx.prisma.diaDesafio.findUniqueOrThrow({
        where: { participanteId_numeroDia: { participanteId, numeroDia: hoje } },
      });
    expect((await dia()).concluidoEm).toBeNull();
    await agente.put(`/api/desafios/desafio-teste/dias/${hoje}`).send(CHECKIN_COMPLETO);
    const fechou = (await dia()).concluidoEm;
    expect(fechou).toBeInstanceOf(Date);
    await agente.put(`/api/desafios/desafio-teste/dias/${hoje}`).send({ ...CHECKIN_COMPLETO, paginasLidas: 20 });
    expect((await dia()).concluidoEm?.getTime()).toBe(fechou?.getTime());
    await agente.put(`/api/desafios/desafio-teste/dias/${hoje}`).send({ ...CHECKIN_COMPLETO, aguaMl: 0 });
    expect((await dia()).concluidoEm).toBeNull();
  });

  it('body com concluido: true é ignorado', async () => {
    const { agente, hoje, participanteId } = await cenarioInscrito(ctx);
    const r = await agente
      .put(`/api/desafios/desafio-teste/dias/${hoje}`)
      .send({ aguaMl: 0, exercicio: false, paginasLidas: 0, storyPostado: false, concluido: true });
    expect(r.status).toBe(200);
    expect(r.body.concluido).toBe(false);
    const dia = await ctx.prisma.diaDesafio.findFirst({ where: { participanteId, numeroDia: hoje } });
    expect(dia?.concluido).toBe(false);
  });

  it('inscrito sem o aceite dos termos (ex.: incluído pelo embaixador) → PERFIL_INCOMPLETO', async () => {
    const { agente, hoje, usuarioId } = await cenarioInscrito(ctx);
    await ctx.prisma.usuario.update({ where: { id: usuarioId }, data: { aceitouTermosEm: null } });
    const r = await agente.put(`/api/desafios/desafio-teste/dias/${hoje}`).send(CHECKIN_COMPLETO);
    expect(r.status).toBe(403);
    expect(r.body.codigo).toBe('PERFIL_INCOMPLETO');
    expect((await agente.get('/api/desafios/desafio-teste/meu-progresso')).body.codigo).toBe('PERFIL_INCOMPLETO');
  });

  it('editar o dia anterior → DIA_NAO_EDITAVEL', async () => {
    const { agente, hoje } = await cenarioInscrito(ctx);
    const r = await agente.put(`/api/desafios/desafio-teste/dias/${hoje - 1}`).send(CHECKIN_COMPLETO);
    expect(r.status).toBe(409);
    expect(r.body.codigo).toBe('DIA_NAO_EDITAVEL');
  });

  it('dia futuro → DIA_NAO_EDITAVEL', async () => {
    const { agente, hoje } = await cenarioInscrito(ctx);
    const r = await agente.put(`/api/desafios/desafio-teste/dias/${hoje + 1}`).send(CHECKIN_COMPLETO);
    expect(r.body.codigo).toBe('DIA_NAO_EDITAVEL');
    const g = await agente.get(`/api/desafios/desafio-teste/dias/${hoje + 1}`);
    expect(g.body.editavel).toBe(false);
  });

  it('dia fora do desafio → NAO_ENCONTRADO; dia inválido → VALIDACAO', async () => {
    const { agente } = await cenarioInscrito(ctx);
    expect((await agente.get('/api/desafios/desafio-teste/dias/31')).body.codigo).toBe('NAO_ENCONTRADO');
    expect((await agente.get('/api/desafios/desafio-teste/dias/abc')).body.codigo).toBe('VALIDACAO');
  });

  it('antes do início → DESAFIO_NAO_INICIADO', async () => {
    await criarDesafio(ctx.prisma, { inicioRelativo: 2 });
    const { agente } = await novoUsuarioLogado(ctx.http);
    const ins = await agente.post('/api/desafios/desafio-teste/inscricao');
    await definirPagamento(ctx, ins.body.participacao.participanteId, 'CONFIRMADO');
    const r = await agente.put('/api/desafios/desafio-teste/dias/1').send(CHECKIN_COMPLETO);
    expect(r.body.codigo).toBe('DESAFIO_NAO_INICIADO');
  });

  it('não inscrito → NAO_INSCRITO', async () => {
    await criarDesafio(ctx.prisma, { inicioRelativo: -1 });
    const { agente } = await novoUsuarioLogado(ctx.http);
    const r = await agente.put('/api/desafios/desafio-teste/dias/2').send(CHECKIN_COMPLETO);
    expect(r.status).toBe(403);
    expect(r.body.codigo).toBe('NAO_INSCRITO');
    expect((await agente.get('/api/desafios/desafio-teste/meu-progresso')).body.codigo).toBe('NAO_INSCRITO');
  });

  it('sem login → 401', async () => {
    await criarDesafio(ctx.prisma);
    expect((await request(ctx.http).get('/api/desafios/desafio-teste/meu-progresso')).status).toBe(401);
  });

  it('valores fora do limite → VALIDACAO', async () => {
    const { agente, hoje } = await cenarioInscrito(ctx);
    const r = await agente
      .put(`/api/desafios/desafio-teste/dias/${hoje}`)
      .send({ ...CHECKIN_COMPLETO, aguaMl: 50000 });
    expect(r.body.codigo).toBe('VALIDACAO');
  });

  it('meu-progresso: grid de 30 dias, sequências e evolução', async () => {
    const { agente, hoje, participanteId } = await cenarioInscrito(ctx, { diasAtras: 3 });
    // dias 1, 2 e 3 concluídos (inseridos direto), dia 4 = hoje em aberto
    for (const n of [1, 2, 3]) {
      await fotosFalsas(ctx.prisma, participanteId, n);
      await ctx.prisma.diaDesafio.update({
        where: { participanteId_numeroDia: { participanteId, numeroDia: n } },
        data: { ...CHECKIN_COMPLETO, concluido: true },
      });
    }
    const r = await agente.get('/api/desafios/desafio-teste/meu-progresso');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      diaAtual: hoje,
      status: 'EM_ANDAMENTO',
      totalDias: 30,
      diasConcluidos: 3,
      evolucao: 10,
      melhorSequencia: 3,
      sequenciaAtual: 3,
    });
    expect(r.body.dias).toHaveLength(30);
    expect(r.body.dias[0].situacao).toBe('CONCLUIDO');
    expect(r.body.dias[hoje - 1].situacao).toBe('HOJE');
    expect(r.body.dias[hoje].situacao).toBe('FUTURO');
  });
});
