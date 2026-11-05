import request from 'supertest';
import type { TreinosTurmaResposta, TurmaHojeResposta } from '@everest/shared';
import { WEB_PUSH } from '../src/modules/push/push.constantes';
import { CacheService, chavesDoRanking } from '../src/redis/redis.module';
import {
  CHECKIN_COMPLETO,
  DADOS_PERFIL,
  type Contexto,
  cenarioInscrito,
  criarApp,
  fotosFalsas,
  limparTudo,
  participanteComDias,
} from './helpers';
import { WebPushFalso, inscricao } from './push-falso';

const BASE = '/api/desafios/desafio-teste';

describe('Hub da turma: Hoje, cutucadas, Treinos e pose do dia (e2e, R23)', () => {
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
    await ctx.app.close();
  });

  const invalidar = (desafioId: string) => ctx.app.get(CacheService).apagar(...chavesDoRanking(desafioId));

  /** Eu (Ana) + Bia (fechou hoje cedo) + Caio (fechou agora) + Duda (falta) + conta excluída + pagamento pendente. */
  async function turma() {
    const eu = await cenarioInscrito(ctx, { nome: 'Ana' });
    const { desafio, hoje } = eu;
    const bia = await participanteComDias(ctx.prisma, desafio.id, 'Bia Souza', [hoje]);
    await ctx.prisma.diaDesafio.updateMany({
      where: { participanteId: bia, numeroDia: hoje },
      data: { concluidoEm: new Date(Date.now() - 3_600_000) },
    });
    const caio = await participanteComDias(ctx.prisma, desafio.id, 'Caio Lima', [1, hoje]);
    const duda = await participanteComDias(ctx.prisma, desafio.id, 'Duda Rocha', [1, 2]);
    const excluida = await participanteComDias(ctx.prisma, desafio.id, 'Eva Melo', []);
    const pExcluida = await ctx.prisma.participante.findUniqueOrThrow({ where: { id: excluida } });
    await ctx.prisma.usuario.update({ where: { id: pExcluida.usuarioId }, data: { excluidoEm: new Date() } });
    const pendente = await cenarioInscrito(ctx, { nome: 'Fabi', pagamento: 'PENDENTE' });
    await invalidar(desafio.id);
    return { eu, desafio, hoje, bia, caio, duda, excluida, pendente };
  }

  async function usuarioDe(participanteId: string): Promise<string> {
    return (await ctx.prisma.participante.findUniqueOrThrow({ where: { id: participanteId } })).usuarioId;
  }

  describe('GET turma/hoje', () => {
    it('fecharam (mais recentes primeiro) e faltam (ordem do ranking, sem excluídos nem pendentes)', async () => {
      const { eu, hoje, bia, caio, duda } = await turma();
      const r = await eu.agente.get(`${BASE}/turma/hoje`);
      expect(r.status).toBe(200);
      const corpo = r.body as TurmaHojeResposta;
      expect(corpo).toMatchObject({ diaAtual: hoje, status: 'EM_ANDAMENTO', totalParticipantes: 4, minhasCutucadasHoje: [] });
      expect(corpo.fecharam.map((p) => p.participanteId)).toEqual([caio, bia]);
      expect(corpo.fecharam[0]).toEqual({
        participanteId: caio,
        nomeExibicao: 'Caio L.',
        iniciais: 'CL',
        fotoUrl: null,
        concluidoEm: expect.any(String),
        aceitaCutucadas: true,
      });
      // Duda (2 dias) passa à frente de mim (0 dias) no ranking.
      expect(corpo.faltam.map((p) => p.participanteId)).toEqual([duda, eu.participanteId]);
      expect(corpo.faltam[0]).toMatchObject({ nomeExibicao: 'Duda R.', concluidoEm: null });
      expect(JSON.stringify(corpo)).not.toContain('@');
    });

    it('pagamento pendente: 403; sem login: 401', async () => {
      const { pendente } = await turma();
      expect((await pendente.agente.get(`${BASE}/turma/hoje`)).body.codigo).toBe('PAGAMENTO_PENDENTE');
      expect((await request(ctx.http).get(`${BASE}/turma/hoje`)).status).toBe(401);
    });

    it('fechar o dia move a pessoa para "fecharam" na hora (cache invalidado pelo check-in)', async () => {
      const { eu, hoje } = await turma();
      await eu.agente.get(`${BASE}/turma/hoje`);
      await fotosFalsas(ctx.prisma, eu.participanteId, hoje);
      await eu.agente.put(`${BASE}/dias/${hoje}`).send(CHECKIN_COMPLETO);
      const corpo = (await eu.agente.get(`${BASE}/turma/hoje`)).body as TurmaHojeResposta;
      expect(corpo.fecharam[0]?.participanteId).toBe(eu.participanteId);
      expect(corpo.faltam.some((p) => p.participanteId === eu.participanteId)).toBe(false);
    });
  });

  describe('POST cutucadas', () => {
    it('200 com push para os aparelhos; marca em minhasCutucadasHoje; 2ª vez: JA_CUTUCOU', async () => {
      const { eu, hoje, duda } = await turma();
      const sub = inscricao();
      await ctx.prisma.pushInscricao.create({
        data: { usuarioId: await usuarioDe(duda), endpoint: sub.endpoint, p256dh: sub.chaves.p256dh, auth: sub.chaves.auth },
      });
      const r = await eu.agente.post(`${BASE}/cutucadas`).send({ participanteId: duda });
      expect(r.status).toBe(200);
      expect(r.body).toEqual({ entregue: true });
      expect(webPush.envios).toEqual([
        {
          endpoint: sub.endpoint,
          payload: { titulo: 'Ana T. te cutucou 👋', corpo: `Bora fechar o dia ${hoje}!`, url: '/hoje', tag: `cutucada-${eu.participanteId}` },
        },
      ]);
      const hojeR = (await eu.agente.get(`${BASE}/turma/hoje`)).body as TurmaHojeResposta;
      expect(hojeR.minhasCutucadasHoje).toEqual([duda]);

      const deNovo = await eu.agente.post(`${BASE}/cutucadas`).send({ participanteId: duda });
      expect(deNovo.status).toBe(409);
      expect(deNovo.body.codigo).toBe('JA_CUTUCOU');
      expect(webPush.envios).toHaveLength(1);
    });

    it('sem aparelho com push: registra e devolve entregue false', async () => {
      const { eu, duda } = await turma();
      const r = await eu.agente.post(`${BASE}/cutucadas`).send({ participanteId: duda });
      expect(r.status).toBe(200);
      expect(r.body).toEqual({ entregue: false });
      expect(await ctx.prisma.cutucada.count()).toBe(1);
    });

    it('recusas: já fechou (409), opt-out (409), a si mesmo (400), excluída/pendente/inexistente (404)', async () => {
      const { eu, bia, duda, excluida, pendente } = await turma();
      const cutucar = (participanteId: string) => eu.agente.post(`${BASE}/cutucadas`).send({ participanteId });

      const fechou = await cutucar(bia);
      expect([fechou.status, fechou.body.codigo]).toEqual([409, 'CUTUCADA_RECUSADA']);

      await ctx.prisma.usuario.update({ where: { id: await usuarioDe(duda) }, data: { aceitaCutucadas: false } });
      const optOut = await cutucar(duda);
      expect([optOut.status, optOut.body.codigo]).toEqual([409, 'CUTUCADA_RECUSADA']);

      const euMesmo = await cutucar(eu.participanteId);
      expect([euMesmo.status, euMesmo.body.codigo]).toEqual([400, 'VALIDACAO']);

      for (const id of [excluida, pendente.participanteId, 'nao-existe']) {
        const r = await cutucar(id);
        expect([r.status, r.body.codigo]).toEqual([404, 'NAO_ENCONTRADO']);
      }
      expect((await cutucar('')).status).toBe(400);
      expect(await ctx.prisma.cutucada.count()).toBe(0);
    });

    it('quem está com pagamento pendente não cutuca (403)', async () => {
      const { duda, pendente } = await turma();
      const r = await pendente.agente.post(`${BASE}/cutucadas`).send({ participanteId: duda });
      expect([r.status, r.body.codigo]).toEqual([403, 'PAGAMENTO_PENDENTE']);
    });

    it('aceitaCutucadas no /me: padrão true; PATCH false aparece na turma na hora e bloqueia a cutucada', async () => {
      const { eu } = await turma();
      const outra = await cenarioInscrito(ctx, { nome: 'Gabi' });
      expect((await outra.agente.get('/api/auth/me')).body.usuario.aceitaCutucadas).toBe(true);
      // Aquece o cache da turma.
      const antes = (await eu.agente.get(`${BASE}/turma/hoje`)).body as TurmaHojeResposta;
      expect(antes.faltam.find((p) => p.participanteId === outra.participanteId)?.aceitaCutucadas).toBe(true);

      const p = await outra.agente.patch('/api/me').send({ nome: 'Gabi Teste', ...DADOS_PERFIL, aceitaCutucadas: false });
      expect(p.status).toBe(200);
      expect(p.body.usuario.aceitaCutucadas).toBe(false);
      // Omitido mantém.
      await outra.agente.patch('/api/me').send({ nome: 'Gabi Teste', ...DADOS_PERFIL });
      expect((await outra.agente.get('/api/auth/me')).body.usuario.aceitaCutucadas).toBe(false);

      const depois = (await eu.agente.get(`${BASE}/turma/hoje`)).body as TurmaHojeResposta;
      expect(depois.faltam.find((p2) => p2.participanteId === outra.participanteId)?.aceitaCutucadas).toBe(false);
      const r = await eu.agente.post(`${BASE}/cutucadas`).send({ participanteId: outra.participanteId });
      expect(r.body.codigo).toBe('CUTUCADA_RECUSADA');
    });
  });

  describe('Treinos e pose do dia', () => {
    async function comTreinos() {
      const eu = await cenarioInscrito(ctx, { nome: 'Ana' });
      const bia = await cenarioInscrito(ctx, { nome: 'Bia' });
      const caio = await cenarioInscrito(ctx, { nome: 'Caio' });
      const { hoje } = eu;
      await fotosFalsas(ctx.prisma, eu.participanteId, hoje);
      await fotosFalsas(ctx.prisma, bia.participanteId, hoje);
      return { eu, bia, caio, hoje };
    }

    it('lista só as fotos do treino (sem água/leitura), com URLs assinadas e `minha`', async () => {
      const { eu, bia, hoje } = await comTreinos();
      const r = await eu.agente.get(`${BASE}/turma/treinos`);
      expect(r.status).toBe(200);
      const corpo = r.body as TreinosTurmaResposta;
      expect(corpo).toMatchObject({ diaAtual: hoje, dia: hoje, status: 'EM_ANDAMENTO', pose: null, possoSugerirPose: true });
      expect(corpo.fotos).toHaveLength(2);
      const minha = corpo.fotos.find((f) => f.minha);
      expect(minha?.participanteId).toBe(eu.participanteId);
      const dela = corpo.fotos.find((f) => f.participanteId === bia.participanteId);
      expect(dela).toMatchObject({ nomeExibicao: 'Bia T.', iniciais: 'BT', minha: false, concluidoDia: false });
      expect(dela?.url).toContain('EXERCICIO');
      expect(dela?.thumbUrl).toContain('X-Amz-Signature');
      expect(JSON.stringify(corpo)).not.toMatch(/AGUA|LEITURA/);
    });

    it('?dia: aceita dias passados; fora de 1..diaAtual é 400', async () => {
      const { eu, hoje } = await comTreinos();
      const passado = await eu.agente.get(`${BASE}/turma/treinos?dia=1`);
      expect(passado.status).toBe(200);
      expect(passado.body).toMatchObject({ dia: 1, fotos: [], possoSugerirPose: false });
      expect((await eu.agente.get(`${BASE}/turma/treinos?dia=${hoje + 1}`)).body.codigo).toBe('VALIDACAO');
      expect((await eu.agente.get(`${BASE}/turma/treinos?dia=0`)).status).toBe(400);
      expect((await eu.agente.get(`${BASE}/turma/treinos?dia=abc`)).status).toBe(400);
    });

    it('esconder a foto do treino tira da turma na hora; mostrar devolve; só EXERCICIO', async () => {
      const { eu, bia, hoje } = await comTreinos();
      await eu.agente.get(`${BASE}/turma/treinos`); // aquece o cache
      const url = `${BASE}/dias/${hoje}/fotos/EXERCICIO/visibilidade`;
      const r = await bia.agente.patch(url).send({ visivel: false });
      expect(r.status).toBe(200);
      expect(r.body).toEqual({ visivelTurma: false });
      let corpo = (await eu.agente.get(`${BASE}/turma/treinos`)).body as TreinosTurmaResposta;
      expect(corpo.fotos.map((f) => f.participanteId)).toEqual([eu.participanteId]);
      // O check-in da dona mostra a escolha.
      const dia = (await bia.agente.get(`${BASE}/dias/${hoje}`)).body as { fotos: { tipo: string; visivelTurma: boolean }[] };
      expect(dia.fotos.find((f) => f.tipo === 'EXERCICIO')?.visivelTurma).toBe(false);
      expect(dia.fotos.find((f) => f.tipo === 'AGUA')?.visivelTurma).toBe(true);

      await bia.agente.patch(url).send({ visivel: true });
      corpo = (await eu.agente.get(`${BASE}/turma/treinos`)).body as TreinosTurmaResposta;
      expect(corpo.fotos).toHaveLength(2);

      const agua = await bia.agente.patch(`${BASE}/dias/${hoje}/fotos/AGUA/visibilidade`).send({ visivel: false });
      expect([agua.status, agua.body.codigo]).toEqual([400, 'VALIDACAO']);
      expect((await bia.agente.patch(url).send({ visivel: 'nao' })).status).toBe(400);
      // Dia passado (fora da janela de edição) também pode esconder; sem foto: 404.
      const semFoto = await bia.agente.patch(`${BASE}/dias/1/fotos/EXERCICIO/visibilidade`).send({ visivel: false });
      expect([semFoto.status, semFoto.body.codigo]).toEqual([404, 'NAO_ENCONTRADO']);
    });

    it('foto escondida pode ser trocada sem voltar a aparecer (a troca herda a escolha)', async () => {
      const { bia, hoje } = await comTreinos();
      await bia.agente.patch(`${BASE}/dias/${hoje}/fotos/EXERCICIO/visibilidade`).send({ visivel: false });
      const r = await bia.agente
        .post(`${BASE}/dias/${hoje}/fotos/upload-url`)
        .send({ tipo: 'EXERCICIO', mimeType: 'image/jpeg', tamanhoBytes: 1000 });
      expect(r.status).toBe(200);
      const nova = await ctx.prisma.fotoProva.findUniqueOrThrow({ where: { id: (r.body as { fotoId: string }).fotoId } });
      expect(nova.visivelTurma).toBe(false);
    });

    it('dia invalidado e conta excluída somem do feed', async () => {
      const { eu, bia, hoje } = await comTreinos();
      await ctx.prisma.diaDesafio.updateMany({
        where: { participanteId: bia.participanteId, numeroDia: hoje },
        data: { invalidado: true },
      });
      await invalidar(eu.desafio.id);
      let corpo = (await eu.agente.get(`${BASE}/turma/treinos`)).body as TreinosTurmaResposta;
      expect(corpo.fotos.map((f) => f.participanteId)).toEqual([eu.participanteId]);

      await ctx.prisma.diaDesafio.updateMany({
        where: { participanteId: bia.participanteId, numeroDia: hoje },
        data: { invalidado: false },
      });
      const r = await bia.agente.delete('/api/me');
      expect(r.status).toBe(200);
      corpo = (await eu.agente.get(`${BASE}/turma/treinos`)).body as TreinosTurmaResposta;
      expect(corpo.fotos.map((f) => f.participanteId)).toEqual([eu.participanteId]);
    });

    it('pose: sem treino 403; a primeira com treino cria; a segunda 409; aparece para a turma', async () => {
      const { eu, bia, caio } = await comTreinos();
      expect(((await caio.agente.get(`${BASE}/turma/treinos`)).body as TreinosTurmaResposta).possoSugerirPose).toBe(false);

      const semTreino = await caio.agente.post(`${BASE}/turma/pose`).send({ texto: 'Prancha' });
      expect([semTreino.status, semTreino.body.codigo]).toEqual([403, 'POSE_SEM_TREINO']);

      expect((await eu.agente.post(`${BASE}/turma/pose`).send({ texto: 'ab' })).status).toBe(400);

      const ok = await eu.agente.post(`${BASE}/turma/pose`).send({ texto: '  Flexão com o livro ' });
      expect(ok.status).toBe(200);
      expect(ok.body).toEqual({
        pose: {
          texto: 'Flexão com o livro',
          autor: { nomeExibicao: 'Ana T.', iniciais: 'AT', fotoUrl: null },
          criadoEm: expect.any(String),
        },
      });

      const segunda = await bia.agente.post(`${BASE}/turma/pose`).send({ texto: 'Agachamento' });
      expect([segunda.status, segunda.body.codigo]).toEqual([409, 'POSE_JA_DEFINIDA']);

      const corpo = (await bia.agente.get(`${BASE}/turma/treinos`)).body as TreinosTurmaResposta;
      expect(corpo.pose?.texto).toBe('Flexão com o livro');
      expect(corpo.possoSugerirPose).toBe(false);
    });
  });
});
