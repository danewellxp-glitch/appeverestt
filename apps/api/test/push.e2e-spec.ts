import { getQueueToken } from '@nestjs/bullmq';
import { TIMEZONE_PADRAO } from '@everest/shared';
import type { Queue } from 'bullmq';
import request from 'supertest';
import { FILA_PUSH, WEB_PUSH } from '../src/modules/push/push.constantes';
import { PushAgendador } from '../src/modules/push/push.agendador';
import { PushService } from '../src/modules/push/push.service';
import {
  type Contexto,
  cenarioInscrito,
  criarApp,
  criarDesafio,
  dataRelativa,
  definirPagamento,
  limparTudo,
  novoUsuarioLogado,
  tornarAdmin,
} from './helpers';
import { ENV_TESTE } from './env-teste';
import { WebPushFalso, inscricao } from './push-falso';

describe('Push e ações rápidas (e2e)', () => {
  let ctx: Contexto;
  const webPush = new WebPushFalso();

  beforeAll(async () => {
    ctx = await criarApp((b) => b.overrideProvider(WEB_PUSH).useValue(webPush));
  });

  beforeEach(async () => {
    await limparTudo(ctx.prisma);
    webPush.limpar();
  });

  afterAll(async () => {
    const fila = ctx.app.get<Queue>(getQueueToken(FILA_PUSH));
    for (const s of await fila.getJobSchedulers()) await fila.removeJobScheduler(s.key);
    await ctx.app.close();
  });

  describe('inscrição do aparelho', () => {
    it('chave pública sem login', async () => {
      const http = await request(ctx.http).get('/api/push/chave-publica');
      expect(http.status).toBe(200);
      expect(http.body).toEqual({ chave: ENV_TESTE.VAPID_PUBLIC_KEY });
    });

    it('PUT/GET/DELETE e exige login', async () => {
      const { agente } = await novoUsuarioLogado(ctx.http, 'Ana Push');
      const sub = inscricao();
      const q = `/api/push/inscricao?endpoint=${encodeURIComponent(sub.endpoint)}`;

      expect((await agente.get(q)).body).toEqual({ inscrito: false });
      const put = await agente.put('/api/push/inscricao').send(sub);
      expect(put.status).toBe(200);
      expect(put.body).toEqual({ inscrito: true });
      // De novo (renovação da inscrição): continua uma linha só.
      expect((await agente.put('/api/push/inscricao').send(sub)).status).toBe(200);
      expect(await ctx.prisma.pushInscricao.count()).toBe(1);
      expect((await agente.get(q)).body).toEqual({ inscrito: true });

      const del = await agente.delete('/api/push/inscricao').send({ endpoint: sub.endpoint });
      expect(del.status).toBe(204);
      expect((await agente.get(q)).body).toEqual({ inscrito: false });
      expect((await agente.delete('/api/push/inscricao').send({ endpoint: sub.endpoint })).status).toBe(204);

      const anon = request(ctx.http);
      expect((await anon.put('/api/push/inscricao').send(sub)).status).toBe(401);
      expect((await anon.get(q)).status).toBe(401);
    });

    it('valida o corpo e o endpoint', async () => {
      const { agente } = await novoUsuarioLogado(ctx.http);
      const r = await agente.put('/api/push/inscricao').send({ endpoint: 'nao-e-url', chaves: { p256dh: 'x', auth: 'y' } });
      expect(r.status).toBe(400);
      expect(r.body.codigo).toBe('VALIDACAO');
      expect((await agente.get('/api/push/inscricao')).status).toBe(400);
    });

    it('outro usuário no mesmo aparelho: a inscrição troca de dono', async () => {
      const ana = await novoUsuarioLogado(ctx.http, 'Ana Push');
      const bia = await novoUsuarioLogado(ctx.http, 'Bia Push');
      const sub = inscricao();
      const q = `/api/push/inscricao?endpoint=${encodeURIComponent(sub.endpoint)}`;
      await ana.agente.put('/api/push/inscricao').send(sub);
      await bia.agente.put('/api/push/inscricao').send(sub);

      expect((await ana.agente.get(q)).body).toEqual({ inscrito: false });
      expect((await bia.agente.get(q)).body).toEqual({ inscrito: true });
      const linhas = await ctx.prisma.pushInscricao.findMany();
      expect(linhas).toHaveLength(1);
      expect(linhas[0]?.usuarioId).toBe(bia.id);

      // Ana não consegue apagar a inscrição que agora é da Bia.
      await ana.agente.delete('/api/push/inscricao').send({ endpoint: sub.endpoint });
      expect(await ctx.prisma.pushInscricao.count()).toBe(1);
    });

    it('excluir a conta apaga as inscrições', async () => {
      const { agente, id } = await novoUsuarioLogado(ctx.http);
      await agente.put('/api/push/inscricao').send(inscricao());
      await agente.put('/api/push/inscricao').send(inscricao());
      expect((await agente.delete('/api/me')).status).toBe(200);
      expect(await ctx.prisma.pushInscricao.count({ where: { usuarioId: id } })).toBe(0);
    });
  });

  describe('POST /acoes-rapidas', () => {
    it('água soma 250 ml no dia de hoje, várias vezes', async () => {
      const { agente, hoje } = await cenarioInscrito(ctx);
      const r1 = await agente.post('/api/acoes-rapidas').send({ acao: 'agua' });
      expect(r1.status).toBe(200);
      expect(r1.body).toMatchObject({ mudou: true, dia: { numeroDia: hoje, aguaMl: 250 } });
      expect(r1.body.mensagem).toMatch(/\+250 ml/);
      expect(r1.body.dia).not.toHaveProperty('diaId');

      const r2 = await agente.post('/api/acoes-rapidas').send({ acao: 'agua' });
      expect(r2.body.dia.aguaMl).toBe(500);
      const dia = await agente.get(`/api/desafios/desafio-teste/dias/${hoje}`);
      expect(dia.body.aguaMl).toBe(500);
    });

    it('treino é idempotente; leitura marca a meta', async () => {
      const { agente } = await cenarioInscrito(ctx);
      const t1 = await agente.post('/api/acoes-rapidas').send({ acao: 'treino' });
      expect(t1.body).toMatchObject({ mudou: true, dia: { exercicio: true } });
      const t2 = await agente.post('/api/acoes-rapidas').send({ acao: 'treino' });
      expect(t2.status).toBe(200);
      expect(t2.body).toMatchObject({ mudou: false, dia: { exercicio: true } });
      expect(t2.body.mensagem).toMatch(/já estava/);

      const l = await agente.post('/api/acoes-rapidas').send({ acao: 'leitura' });
      expect(l.body).toMatchObject({ mudou: true, dia: { paginasLidas: 10, exercicio: true } });
    });

    it('sem pagamento confirmado → PAGAMENTO_PENDENTE', async () => {
      const { agente, participanteId } = await cenarioInscrito(ctx);
      await definirPagamento(ctx, participanteId, 'INFORMADO');
      const r = await agente.post('/api/acoes-rapidas').send({ acao: 'agua' });
      expect(r.status).toBe(403);
      expect(r.body.codigo).toBe('PAGAMENTO_PENDENTE');
    });

    it('sem dia aberto (desafio encerrado ou não iniciado) → 409', async () => {
      // Inscreve com o desafio em andamento e depois o leva para o passado (inscrição fecha no fim).
      const encerrado = await cenarioInscrito(ctx);
      await ctx.prisma.desafio.update({
        where: { id: encerrado.desafio.id },
        data: { dataInicio: new Date(`${dataRelativa(-40)}T00:00:00Z`) },
      });
      const r = await encerrado.agente.post('/api/acoes-rapidas').send({ acao: 'agua' });
      expect(r.status).toBe(409);
      expect(r.body.codigo).toBe('DESAFIO_ENCERRADO');

      await limparTudo(ctx.prisma);
      await criarDesafio(ctx.prisma, { inicioRelativo: 3 });
      const futuro = await cenarioInscrito(ctx);
      const r2 = await futuro.agente.post('/api/acoes-rapidas').send({ acao: 'treino' });
      expect(r2.status).toBe(409);
      expect(r2.body.codigo).toBe('DESAFIO_NAO_INICIADO');
    });

    it('ação inválida → 400; sem login → 401; não inscrito → NAO_INSCRITO', async () => {
      const { agente } = await cenarioInscrito(ctx);
      expect((await agente.post('/api/acoes-rapidas').send({ acao: 'story' })).status).toBe(400);
      const anon = request(ctx.http);
      expect((await anon.post('/api/acoes-rapidas').send({ acao: 'agua' })).status).toBe(401);
      const fora = await novoUsuarioLogado(ctx.http);
      const r = await fora.agente.post('/api/acoes-rapidas').send({ acao: 'agua' });
      expect(r.status).toBe(403);
      expect(r.body.codigo).toBe('NAO_INSCRITO');
    });
  });

  describe('admin: resumo e avisos', () => {
    /** 3 confirmados com push (um com 2 aparelhos), 1 pendente com push, 1 confirmado sem push. */
    async function cenarioAvisos() {
      const a = await cenarioInscrito(ctx, { nome: 'Ana Um' });
      const b = await cenarioInscrito(ctx, { nome: 'Bia Dois' });
      const c = await cenarioInscrito(ctx, { nome: 'Caio Tres' });
      const pendente = await cenarioInscrito(ctx, { nome: 'Davi Pendente', pagamento: 'INFORMADO' });
      await cenarioInscrito(ctx, { nome: 'Eva Sem Push' });
      const subs = { a1: inscricao(), a2: inscricao(), b: inscricao(), c: inscricao(), p: inscricao() };
      await a.agente.put('/api/push/inscricao').send(subs.a1);
      await a.agente.put('/api/push/inscricao').send(subs.a2);
      await b.agente.put('/api/push/inscricao').send(subs.b);
      await c.agente.put('/api/push/inscricao').send(subs.c);
      await pendente.agente.put('/api/push/inscricao').send(subs.p);
      const admin = await novoUsuarioLogado(ctx.http, 'Admin Avisos');
      await tornarAdmin(ctx.prisma, admin.id);
      return { a, b, c, subs, admin };
    }

    it('resumo conta pessoas confirmadas com push e aparelhos', async () => {
      const { admin, c } = await cenarioAvisos();
      let r = await admin.agente.get('/api/admin/desafios/desafio-teste/push');
      expect(r.status).toBe(200);
      expect(r.body).toEqual({ pessoas: 3, aparelhos: 4 });

      // Conta excluída sai da conta.
      await ctx.prisma.usuario.update({ where: { id: c.usuarioId }, data: { excluidoEm: new Date() } });
      r = await admin.agente.get('/api/admin/desafios/desafio-teste/push');
      expect(r.body).toEqual({ pessoas: 2, aparelhos: 3 });

      expect((await admin.agente.get('/api/admin/desafios/nao-existe/push')).status).toBe(404);
    });

    it('aviso com modelo: entrega aos confirmados e remove inscrições vencidas (410)', async () => {
      const { admin, subs } = await cenarioAvisos();
      webPush.status.set(subs.b.endpoint, 410);
      webPush.status.set(subs.c.endpoint, 500);
      const r = await admin.agente.post('/api/admin/desafios/desafio-teste/avisos').send({ modelo: 'agua' });
      expect(r.status).toBe(200);
      expect(r.body).toEqual({ destinatarios: 4, entregues: 2, removidas: 1, falhas: 1 });

      const enviados = webPush.envios.map((e) => e.endpoint).sort();
      expect(enviados).toEqual([subs.a1.endpoint, subs.a2.endpoint, subs.b.endpoint, subs.c.endpoint].sort());
      expect(enviados).not.toContain(subs.p.endpoint);
      expect(webPush.envios[0]?.payload).toMatchObject({
        titulo: 'Hora da água 💧',
        url: '/hoje?acao=agua',
        acao: 'agua',
        botao: '+250 ml',
        tag: expect.stringMatching(/^aviso-/),
      });

      expect(await ctx.prisma.pushInscricao.findUnique({ where: { endpoint: subs.b.endpoint } })).toBeNull();
      const comFalha = await ctx.prisma.pushInscricao.findUniqueOrThrow({ where: { endpoint: subs.c.endpoint } });
      expect(comFalha.falhas).toBe(1);
      const entregue = await ctx.prisma.pushInscricao.findUniqueOrThrow({ where: { endpoint: subs.a1.endpoint } });
      expect(entregue.ultimoEnvioEm).not.toBeNull();
    });

    it('aviso livre abre /hoje sem botão; título e mensagem obrigatórios', async () => {
      const { admin } = await cenarioAvisos();
      const ruim = await admin.agente.post('/api/admin/desafios/desafio-teste/avisos').send({ modelo: 'livre', titulo: 'Oi' });
      expect(ruim.status).toBe(400);
      expect(ruim.body.campos).toHaveProperty('corpo');

      const r = await admin.agente
        .post('/api/admin/desafios/desafio-teste/avisos')
        .send({ modelo: 'livre', titulo: 'Live hoje às 20h', corpo: 'Entra no Instagram do desafio.' });
      expect(r.status).toBe(200);
      expect(r.body.entregues).toBe(4);
      const payload = webPush.envios[0]?.payload;
      expect(payload).toEqual({
        titulo: 'Live hoje às 20h',
        corpo: 'Entra no Instagram do desafio.',
        url: '/hoje',
        tag: expect.stringMatching(/^aviso-/),
      });
    });

    it('não admin → PROIBIDO', async () => {
      const { a } = await cenarioAvisos();
      const r1 = await a.agente.post('/api/admin/desafios/desafio-teste/avisos').send({ modelo: 'agua' });
      expect(r1.status).toBe(403);
      expect(r1.body.codigo).toBe('PROIBIDO');
      const r2 = await a.agente.get('/api/admin/desafios/desafio-teste/push');
      expect(r2.status).toBe(403);
      expect(webPush.envios).toHaveLength(0);
    });
  });

  describe('lembretes', () => {
    it('agenda no fuso do desafio ativo e reagenda ao desativar pelo admin', async () => {
      await criarDesafio(ctx.prisma, { inicioRelativo: -2, timezone: 'America/Manaus' });
      const fila = ctx.app.get<Queue>(getQueueToken(FILA_PUSH));
      await ctx.app.get(PushAgendador).sincronizar();
      let ags = (await fila.getJobSchedulers()).filter((s) => s.key.startsWith('lembrete-'));
      expect(ags.map((s) => s.key).sort()).toEqual([
        'lembrete-agua-10',
        'lembrete-agua-14',
        'lembrete-agua-17',
        'lembrete-leitura-21',
        'lembrete-treino-18',
      ]);
      expect(ags.every((s) => s.tz === 'America/Manaus')).toBe(true);
      expect(ags.find((s) => s.key === 'lembrete-treino-18')?.pattern).toBe('0 18 * * *');

      const admin = await novoUsuarioLogado(ctx.http, 'Admin Lembretes');
      await tornarAdmin(ctx.prisma, admin.id);
      const r = await admin.agente.patch('/api/admin/desafios/desafio-teste').send({ ativo: false });
      expect(r.status).toBe(200);
      ags = (await fila.getJobSchedulers()).filter((s) => s.key.startsWith('lembrete-'));
      expect(ags).toHaveLength(5);
      expect(ags.every((s) => s.tz === TIMEZONE_PADRAO)).toBe(true);
    });

    it('o job do lembrete envia para os confirmados com a tag do lembrete', async () => {
      const a = await cenarioInscrito(ctx);
      await a.agente.put('/api/push/inscricao').send(inscricao());
      const r = await ctx.app.get(PushService).enviarLembrete('leitura');
      expect(r).toEqual({ destinatarios: 1, entregues: 1, removidas: 0, falhas: 0 });
      expect(webPush.envios[0]?.payload).toMatchObject({ tag: 'lembrete-leitura', acao: 'leitura', url: '/hoje?acao=leitura' });
    });
  });
});
