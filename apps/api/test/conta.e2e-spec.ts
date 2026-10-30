import request from 'supertest';
import { StorageService } from '../src/storage/storage.service';
import {
  CHECKIN_COMPLETO,
  type Contexto,
  cenarioInscrito,
  criarApp,
  limparTudo,
  participanteComDias,
} from './helpers';

describe('Excluir conta — DELETE /me (e2e)', () => {
  let ctx: Contexto;
  let storage: StorageService;

  beforeAll(async () => {
    ctx = await criarApp();
    storage = ctx.app.get(StorageService);
  });

  beforeEach(async () => {
    await limparTudo(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('limpa o cookie, me dá 401, ranking mostra "Participante removido", vaga continua e fotos somem', async () => {
    const eu = await cenarioInscrito(ctx, { nome: 'Marina Costa', diasAtras: 2 });
    const outro = await participanteComDias(ctx.prisma, eu.desafio.id, 'Outra Pessoa', [1]);

    // Dia 1 concluído com 3 fotos reais no MinIO.
    const dia = await ctx.prisma.diaDesafio.create({
      data: { participanteId: eu.participanteId, numeroDia: 1, ...CHECKIN_COMPLETO, concluido: true },
    });
    const chaves: string[] = [];
    for (const tipo of ['AGUA', 'EXERCICIO', 'LEITURA'] as const) {
      const chave = `provas/${eu.desafio.id}/${eu.participanteId}/1/${tipo}-teste.full.webp`;
      await storage.enviar(chave, Buffer.from('conteudo'), 'image/webp');
      chaves.push(chave);
      await ctx.prisma.fotoProva.create({
        data: { diaId: dia.id, tipo, storageKey: chave, mimeType: 'image/webp', tamanhoBytes: 8, status: 'CONFIRMADA' },
      });
    }
    expect(await storage.cabecalho(chaves[0] ?? '')).not.toBeNull();
    const vagaAntes = (await ctx.prisma.participante.findUniqueOrThrow({ where: { id: eu.participanteId } })).vagaNumero;

    const r = await eu.agente.delete('/api/me');
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true });
    expect(String(r.headers['set-cookie'])).toMatch(/everest_sessao=;/);

    // A sessão antiga não vale mais (tokenVersao incrementado).
    expect((await eu.agente.get('/api/auth/me')).status).toBe(401);

    // Usuário anonimizado; participante e dias continuam (vaga ocupada).
    const u = await ctx.prisma.usuario.findUniqueOrThrow({ where: { id: eu.usuarioId } });
    expect(u).toMatchObject({
      nome: 'Participante removido',
      firebaseUid: null,
      fotoUrl: null,
      senhaHash: null,
      instagram: null,
      dataNascimento: null,
      whatsapp: null,
      bairro: null,
      cidade: null,
      uf: null,
      aceitouMarketingEm: null,
    });
    expect(u.email).toBe(`removido+${eu.usuarioId}@everest.invalid`);
    expect(u.excluidoEm).not.toBeNull();
    const p = await ctx.prisma.participante.findUniqueOrThrow({ where: { id: eu.participanteId } });
    expect(p.vagaNumero).toBe(vagaAntes);
    expect(await ctx.prisma.diaDesafio.count({ where: { participanteId: eu.participanteId } })).toBe(1);
    const publico = await request(ctx.http).get('/api/desafios/atual');
    expect(publico.body.vagasDisponiveis).toBe(50 - 2);

    // Fotos: registros e objetos apagados.
    expect(await ctx.prisma.fotoProva.count({ where: { diaId: dia.id } })).toBe(0);
    for (const chave of chaves) expect(await storage.cabecalho(chave)).toBeNull();

    // Ranking visto por outra pessoa inscrita.
    const leitor = await cenarioInscrito(ctx, { nome: 'Leitor Ranking' });
    const ranking = await leitor.agente.get('/api/desafios/desafio-teste/ranking');
    const itens = ranking.body.itens as { participanteId: string; nomeExibicao: string }[];
    expect(itens.find((i) => i.participanteId === eu.participanteId)?.nomeExibicao).toBe('Participante removido');
    expect(itens.find((i) => i.participanteId === outro)?.nomeExibicao).toBe('Outra P.');
    expect(itens.map((i) => i.nomeExibicao)).not.toContain('Marina C.');
  });

  it('o uid do Firebase da conta é excluído', async () => {
    const eu = await cenarioInscrito(ctx, { nome: 'Pessoa Firebase' });
    const antes = await ctx.prisma.usuario.findUniqueOrThrow({ where: { id: eu.usuarioId } });
    expect(antes.firebaseUid).not.toBeNull();
    expect((await eu.agente.delete('/api/me')).status).toBe(200);
    expect(ctx.verificador.excluidos).toContain(antes.firebaseUid);
  });

  it('sem sessão → 401', async () => {
    expect((await request(ctx.http).delete('/api/me')).status).toBe(401);
  });
});
