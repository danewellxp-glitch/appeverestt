import sharp from 'sharp';
import { type Contexto, cenarioInscrito, criarApp, limparTudo } from './helpers';

// Troca de foto (X19): a foto já recebida só sai quando a nova é confirmada, e nunca quando a nova
// sumiu no meio do caminho (outro pedido de troca, limpeza horária).

async function jpeg(cor: string): Promise<Buffer> {
  return sharp({ create: { width: 800, height: 600, channels: 3, background: cor } }).jpeg().toBuffer();
}

describe('Troca de foto sem perda (e2e)', () => {
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

  type Agente = Awaited<ReturnType<typeof cenarioInscrito>>['agente'];

  async function pedir(agente: Agente, dia: number, corpo: Buffer) {
    const r = await agente
      .post(`/api/desafios/desafio-teste/dias/${dia}/fotos/upload-url`)
      .send({ tipo: 'AGUA', mimeType: 'image/jpeg', tamanhoBytes: corpo.length });
    expect(r.status).toBe(200);
    const { fotoId, uploadUrl, headers } = r.body as { fotoId: string; uploadUrl: string; headers: Record<string, string> };
    const put = await fetch(uploadUrl, { method: 'PUT', headers, body: new Uint8Array(corpo) });
    expect(put.status).toBe(200);
    return fotoId;
  }
  const confirmar = (agente: Agente, dia: number, fotoId: string) =>
    agente.post(`/api/desafios/desafio-teste/dias/${dia}/fotos/${fotoId}/confirmar`);

  it('confirmar uma troca que foi substituída por outro pedido não apaga a foto já recebida', async () => {
    const { agente, hoje } = await cenarioInscrito(ctx);
    const original = await pedir(agente, hoje, await jpeg('#101010'));
    expect((await confirmar(agente, hoje, original)).status).toBe(200);

    // Troca 1 chega no storage, mas antes da confirmação vem a troca 2 (outra aba): a 1 sai.
    const troca1 = await pedir(agente, hoje, await jpeg('#202020'));
    const troca2 = await pedir(agente, hoje, await jpeg('#303030'));
    const r = await confirmar(agente, hoje, troca1);
    expect(r.status).toBe(404);

    const agua = await ctx.prisma.fotoProva.findMany({ where: { tipo: 'AGUA' }, orderBy: { criadoEm: 'asc' } });
    expect(agua.map((f) => f.id)).toEqual([original, troca2]);
    expect(agua[0]?.status).not.toBe('PENDENTE');

    // A troca 2 confirmada substitui a original.
    expect((await confirmar(agente, hoje, troca2)).status).toBe(200);
    const depois = await ctx.prisma.fotoProva.findMany({ where: { tipo: 'AGUA' } });
    expect(depois.map((f) => f.id)).toEqual([troca2]);
  });

  it('confirmar duas vezes a mesma foto é idempotente', async () => {
    const { agente, hoje } = await cenarioInscrito(ctx);
    const foto = await pedir(agente, hoje, await jpeg('#404040'));
    const [a, b] = await Promise.all([confirmar(agente, hoje, foto), confirmar(agente, hoje, foto)]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(await ctx.prisma.fotoProva.count({ where: { tipo: 'AGUA' } })).toBe(1);
  });
});
