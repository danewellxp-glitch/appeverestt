import type { IncomingMessage } from 'node:http';
import request from 'supertest';
import {
  type Contexto,
  cenarioInscrito,
  criarApp,
  criarDesafio,
  limparTudo,
  novoUsuarioLogado,
  tornarAdmin,
} from './helpers';

const BASE = '/api/desafios/desafio-teste';
const ADMIN = '/api/admin/desafios/desafio-teste';

const VALIDO = {
  nota: 5,
  oQueAchou: '  Foi puxado, mas o grupo ajudou demais.  ',
  oQueMudou: 'Passei a ler todo dia antes de dormir.',
  autorizaDivulgacao: true,
};

type Parser = Extract<Parameters<request.Test['parse']>[0], (res: never, callback: never) => void>;

/** Lê o corpo cru (bytes) para conferir o BOM sem depender da decodificação do superagent. */
const bruto: Parser = (res, fim) => {
  const fluxo = res as unknown as IncomingMessage;
  const partes: Buffer[] = [];
  fluxo.on('data', (c: Buffer) => partes.push(c));
  fluxo.on('end', () => fim(null, Buffer.concat(partes)));
};

describe('Feedback e exportação (e2e)', () => {
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

  it('cria e edita (1 por participante, textos com trim)', async () => {
    const eu = await cenarioInscrito(ctx);
    const vazio = await eu.agente.get(`${BASE}/feedback`);
    expect(vazio.status).toBe(200);
    expect(vazio.body).toEqual({ feedback: null });

    const criado = await eu.agente.put(`${BASE}/feedback`).send(VALIDO);
    expect(criado.status).toBe(200);
    expect(criado.body.feedback).toMatchObject({
      nota: 5,
      oQueAchou: 'Foi puxado, mas o grupo ajudou demais.',
      oQueMudou: 'Passei a ler todo dia antes de dormir.',
      autorizaDivulgacao: true,
    });
    expect(typeof criado.body.feedback.atualizadoEm).toBe('string');

    const editado = await eu.agente
      .put(`${BASE}/feedback`)
      .send({ ...VALIDO, nota: 4, oQueMudou: 'Agora treino cedo, antes do trabalho.', autorizaDivulgacao: false });
    expect(editado.status).toBe(200);
    expect(editado.body.feedback).toMatchObject({ nota: 4, autorizaDivulgacao: false });
    expect((await eu.agente.get(`${BASE}/feedback`)).body).toEqual(editado.body);
    expect(await ctx.prisma.feedback.count()).toBe(1);
  });

  it('valida: nota 6, texto curto e campo faltando → 400 VALIDACAO com campos', async () => {
    const eu = await cenarioInscrito(ctx);
    const nota = await eu.agente.put(`${BASE}/feedback`).send({ ...VALIDO, nota: 6 });
    expect(nota.status).toBe(400);
    expect(nota.body.codigo).toBe('VALIDACAO');
    expect(nota.body.campos.nota).toBe('Dê uma nota de 1 a 5.');

    const curto = await eu.agente.put(`${BASE}/feedback`).send({ ...VALIDO, oQueAchou: '   curto   ' });
    expect(curto.status).toBe(400);
    expect(curto.body.campos.oQueAchou).toBeDefined();

    const { autorizaDivulgacao: _sem, ...semAutorizacao } = VALIDO;
    const faltando = await eu.agente.put(`${BASE}/feedback`).send(semAutorizacao);
    expect(faltando.status).toBe(400);
    expect(faltando.body.campos.autorizaDivulgacao).toBeDefined();
    expect(await ctx.prisma.feedback.count()).toBe(0);
  });

  it('pagamento pendente → 403 PAGAMENTO_PENDENTE; não inscrito → 403 NAO_INSCRITO', async () => {
    const pendente = await cenarioInscrito(ctx, { pagamento: 'INFORMADO' });
    for (const r of [await pendente.agente.get(`${BASE}/feedback`), await pendente.agente.put(`${BASE}/feedback`).send(VALIDO)]) {
      expect(r.status).toBe(403);
      expect(r.body.codigo).toBe('PAGAMENTO_PENDENTE');
    }
    const fora = await novoUsuarioLogado(ctx.http, 'Fora Daqui');
    expect((await fora.agente.put(`${BASE}/feedback`).send(VALIDO)).body.codigo).toBe('NAO_INSCRITO');
    expect(await ctx.prisma.feedback.count()).toBe(0);
  });

  it('lista do admin: média com 1 casa, mais recentes primeiro; vazio → média null', async () => {
    await criarDesafio(ctx.prisma, { inicioRelativo: -3 });
    const admin = await novoAdmin();
    expect((await admin.agente.get(`${ADMIN}/feedbacks`)).body).toEqual({ feedbacks: [], total: 0, media: null });

    const a = await cenarioInscrito(ctx, { nome: 'Ana Primeira' });
    const b = await cenarioInscrito(ctx, { nome: 'Bia Segunda' });
    const c = await cenarioInscrito(ctx, { nome: 'Caio Terceiro' });
    await a.agente.put(`${BASE}/feedback`).send({ ...VALIDO, nota: 5 });
    await b.agente.put(`${BASE}/feedback`).send({ ...VALIDO, nota: 4 });
    await c.agente.put(`${BASE}/feedback`).send({ ...VALIDO, nota: 4, autorizaDivulgacao: false });

    const r = await admin.agente.get(`${ADMIN}/feedbacks`);
    expect(r.status).toBe(200);
    expect(r.body.total).toBe(3);
    expect(r.body.media).toBe(4.3);
    expect(r.body.feedbacks[0]).toMatchObject({
      participanteId: c.participanteId,
      nome: 'Caio Terceiro',
      instagram: 'pessoa.teste',
      vagaNumero: 3,
      nota: 4,
      autorizaDivulgacao: false,
    });

    const lista = await admin.agente.get(`${ADMIN}/participantes`);
    expect(lista.body.participantes.every((p: { temFeedback: boolean }) => p.temFeedback)).toBe(true);
    const det = await admin.agente.get(`${ADMIN}/participantes/${a.participanteId}`);
    expect(det.body.feedback).toMatchObject({ nota: 5, autorizaDivulgacao: true });

    // Excluir a conta apaga o depoimento (texto pessoal); a vaga continua ocupada.
    expect((await a.agente.delete('/api/me')).status).toBe(200);
    const depois = await admin.agente.get(`${ADMIN}/feedbacks`);
    expect(depois.body).toMatchObject({ total: 2, media: 4 });
  });

  it('CSV: BOM, cabeçalho, ";", fórmula escapada, conta excluída e cabeçalhos HTTP', async () => {
    const maria = await cenarioInscrito(ctx, { nome: 'Maria Souza' });
    await maria.agente.put(`${BASE}/feedback`).send({ ...VALIDO, nota: 4, autorizaDivulgacao: false });
    const malicioso = await cenarioInscrito(ctx, { nome: 'Malicia Teste', pagamento: 'INFORMADO' });
    await ctx.prisma.usuario.update({
      where: { id: malicioso.usuarioId },
      data: { nome: '=HYPERLINK("http://mal.example") Teste', bairro: '@SOMA(A1)' },
    });
    const excluido = await cenarioInscrito(ctx, { nome: 'Saulo Saiu', pagamento: 'PENDENTE' });
    expect((await excluido.agente.delete('/api/me')).status).toBe(200);
    const admin = await novoAdmin();

    const r = await admin.agente.get(`${ADMIN}/participantes.csv`).buffer(true).parse(bruto);
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(r.headers['content-disposition']).toBe('attachment; filename="participantes-desafio-teste.csv"');
    expect(r.headers['cache-control']).toBe('no-store');

    const corpo = r.body as Buffer;
    expect([...corpo.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const linhas = corpo.subarray(3).toString('utf8').split('\r\n');
    expect(linhas[0]).toBe(
      'Vaga;Nome;E-mail;Instagram;WhatsApp;Nascimento;Bairro;Cidade;UF;Inscrição;Pagamento;Informado em;' +
        'Confirmado em;Dias concluídos;Dias invalidados;Marketing;Nota do feedback;Autoriza divulgação;Conta excluída',
    );
    expect(linhas).toHaveLength(5); // cabeçalho + 3 + "" depois do último CRLF

    expect(linhas[1]).toMatch(
      new RegExp(
        '^1;Maria Souza;[^;]+@teste\\.dev;pessoa\\.teste;\\(11\\) 98765-4321;12/04/1995;Pinheiros;São Paulo;SP;' +
          '\\d{2}/\\d{2}/\\d{4} \\d{2}:\\d{2};confirmado;\\d{2}/\\d{2}/\\d{4} \\d{2}:\\d{2};\\d{2}/\\d{2}/\\d{4} \\d{2}:\\d{2};0;0;não;4;não;não$',
      ),
    );
    expect(linhas[2]).toContain(`2;"'=HYPERLINK(""http://mal.example"") Teste";`);
    expect(linhas[2]).toContain(";'@SOMA(A1);");
    expect(linhas[2]).toContain(';informado;');
    expect(linhas[3]).toMatch(/^3;Participante removido;;;;;;;;\d{2}\/\d{2}\/\d{4} \d{2}:\d{2};pendente;;;0;0;não;;;sim$/);

    // Não admin e sem login.
    expect((await maria.agente.get(`${ADMIN}/participantes.csv`)).status).toBe(403);
    expect((await request(ctx.http).get(`${ADMIN}/participantes.csv`)).status).toBe(401);
  });
});
