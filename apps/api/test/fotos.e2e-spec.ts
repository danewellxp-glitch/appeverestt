import sharp from 'sharp';
import type { TipoFoto } from '@everest/shared';
import { ProcessamentoFotoService } from '../src/modules/fotos/processamento.service';
import { StorageService } from '../src/storage/storage.service';
import {
  CHECKIN_COMPLETO,
  type Contexto,
  cenarioInscrito,
  criarApp,
  esperar,
  limparTudo,
} from './helpers';

type Agente = Awaited<ReturnType<typeof cenarioInscrito>>['agente'];

/** JPEG com EXIF (inclui dados de câmera), como sai de um celular. */
async function jpegComExif(cor: string): Promise<Buffer> {
  return sharp({ create: { width: 1200, height: 900, channels: 3, background: cor } })
    .jpeg({ quality: 85 })
    .withExif({ IFD0: { Make: 'CelularTeste', Model: 'X1', Copyright: 'Pessoa Teste' } })
    .toBuffer();
}

async function putDireto(url: string, headers: Record<string, string>, corpo: Buffer): Promise<number> {
  const r = await fetch(url, { method: 'PUT', headers, body: new Uint8Array(corpo) });
  return r.status;
}

async function enviarFoto(
  agente: Agente,
  dia: number,
  tipo: TipoFoto,
  corpo: Buffer,
  opcoes: { mimeType?: string; declarado?: number } = {},
) {
  const mimeType = opcoes.mimeType ?? 'image/jpeg';
  const pedido = await agente
    .post(`/api/desafios/desafio-teste/dias/${dia}/fotos/upload-url`)
    .send({ tipo, mimeType, tamanhoBytes: opcoes.declarado ?? corpo.length });
  if (pedido.status !== 200) return { pedido, confirmacao: null, fotoId: null };
  const { fotoId, uploadUrl, headers } = pedido.body as {
    fotoId: string;
    uploadUrl: string;
    headers: Record<string, string>;
  };
  expect(await putDireto(uploadUrl, headers, corpo)).toBe(200);
  const confirmacao = await agente.post(`/api/desafios/desafio-teste/dias/${dia}/fotos/${fotoId}/confirmar`);
  return { pedido, confirmacao, fotoId };
}

describe('Fotos: storage + fila (e2e)', () => {
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

  const statusFoto = (id: string) =>
    ctx.prisma.fotoProva.findUnique({ where: { id } }).then((f) => f?.status ?? 'SUMIU');

  it('fluxo completo: 3 fotos + resto ok → concluído; remover 1 → volta a não concluído', async () => {
    const { agente, hoje, desafio, participanteId } = await cenarioInscrito(ctx);
    await agente.put(`/api/desafios/desafio-teste/dias/${hoje}`).send(CHECKIN_COMPLETO);

    const ids: string[] = [];
    for (const [tipo, cor] of [
      ['AGUA', '#1d4ed8'],
      ['EXERCICIO', '#b91c1c'],
      ['LEITURA', '#15803d'],
    ] as const) {
      const r = await enviarFoto(agente, hoje, tipo, await jpegComExif(cor));
      expect(r.confirmacao?.status).toBe(200);
      expect(r.confirmacao?.body).toMatchObject({ status: 'ENVIADA' });
      ids.push(r.fotoId ?? '');
    }

    // ENVIADA já conta: o dia fecha antes mesmo do worker terminar
    let dia = await agente.get(`/api/desafios/desafio-teste/dias/${hoje}`);
    expect(dia.body.concluido).toBe(true);

    for (const id of ids) await esperar(() => statusFoto(id), (s) => s === 'CONFIRMADA');

    dia = await agente.get(`/api/desafios/desafio-teste/dias/${hoje}`);
    expect(dia.body.concluido).toBe(true);
    expect(dia.body.fotos).toHaveLength(3);
    for (const f of dia.body.fotos as { status: string; thumbUrl: string; url: string }[]) {
      expect(f.status).toBe('CONFIRMADA');
      expect(f.thumbUrl).toContain('X-Amz-Signature');
      expect(f.url).toContain('X-Amz-Expires=600');
    }

    // objeto com o nome esperado, sem EXIF, original apagado
    const foto = await ctx.prisma.fotoProva.findUniqueOrThrow({ where: { id: ids[0] } });
    expect(foto.storageKey).toBe(`provas/${desafio.id}/${participanteId}/${hoje}/AGUA-${ids[0]}.full.webp`);
    expect(foto.thumbKey).toBe(`provas/${desafio.id}/${participanteId}/${hoje}/AGUA-${ids[0]}.thumb.webp`);
    const final = await storage.baixar(foto.storageKey);
    const meta = await sharp(final).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.exif).toBeUndefined();
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(1600);
    const thumbMeta = await sharp(await storage.baixar(foto.thumbKey ?? '')).metadata();
    expect(Math.max(thumbMeta.width ?? 0, thumbMeta.height ?? 0)).toBeLessThanOrEqual(400);
    expect(await storage.cabecalho(`provas/${desafio.id}/${participanteId}/${hoje}/AGUA-${ids[0]}.jpg`)).toBeNull();

    // a URL assinada abre a imagem
    const aberta = await fetch(dia.body.fotos[0].url as string);
    expect(aberta.status).toBe(200);
    expect(aberta.headers.get('content-type')).toBe('image/webp');

    // remover 1 foto → dia volta a não concluído e objetos somem
    const del = await agente.delete(`/api/desafios/desafio-teste/dias/${hoje}/fotos/AGUA`);
    expect(del.status).toBe(200);
    dia = await agente.get(`/api/desafios/desafio-teste/dias/${hoje}`);
    expect(dia.body.concluido).toBe(false);
    expect(dia.body.requisitosPendentes).toEqual(['FOTOS']);
    expect(await storage.cabecalho(foto.storageKey)).toBeNull();
  });

  it('URL assinada expira', async () => {
    await storage.enviar('teste/expira.txt', Buffer.from('oi'), 'text/plain');
    const url = await storage.urlLeitura('teste/expira.txt', 1);
    expect((await fetch(url)).status).toBe(200);
    await new Promise((r) => setTimeout(r, 2_100));
    expect((await fetch(url)).status).toBe(403);
    await storage.apagar('teste/expira.txt');
  });

  it('declarar mais de 5 MB → FOTO_GRANDE_DEMAIS', async () => {
    const { agente, hoje } = await cenarioInscrito(ctx);
    const r = await agente
      .post(`/api/desafios/desafio-teste/dias/${hoje}/fotos/upload-url`)
      .send({ tipo: 'AGUA', mimeType: 'image/jpeg', tamanhoBytes: 6 * 1024 * 1024 });
    expect(r.status).toBe(413);
    expect(r.body.codigo).toBe('FOTO_GRANDE_DEMAIS');
  });

  it('arquivo de 6 MB enviado (declarando menos) → FOTO_GRANDE_DEMAIS e objeto apagado', async () => {
    const { agente, hoje } = await cenarioInscrito(ctx);
    const grande = Buffer.alloc(6 * 1024 * 1024, 1);
    const r = await enviarFoto(agente, hoje, 'AGUA', grande, { declarado: 1024 * 1024 });
    expect(r.confirmacao?.status).toBe(413);
    expect(r.confirmacao?.body.codigo).toBe('FOTO_GRANDE_DEMAIS');
    expect(await ctx.prisma.fotoProva.count()).toBe(0);
  });

  it('.txt renomeado como .jpg → REJEITADA após o worker; dia não conta a foto', async () => {
    const { agente, hoje } = await cenarioInscrito(ctx);
    const r = await enviarFoto(agente, hoje, 'LEITURA', Buffer.from('isto não é uma imagem, é texto'));
    expect(r.confirmacao?.status).toBe(200);
    const fotoId = r.fotoId ?? '';
    await esperar(() => statusFoto(fotoId), (s) => s === 'REJEITADA');
    const dia = await agente.get(`/api/desafios/desafio-teste/dias/${hoje}`);
    expect(dia.body.fotos[0]).toMatchObject({ tipo: 'LEITURA', status: 'REJEITADA', url: null });
    expect(dia.body.requisitosPendentes).toContain('FOTOS');
  });

  it('Content-Type diferente do assinado é recusado pelo storage', async () => {
    const { agente, hoje } = await cenarioInscrito(ctx);
    const pedido = await agente
      .post(`/api/desafios/desafio-teste/dias/${hoje}/fotos/upload-url`)
      .send({ tipo: 'AGUA', mimeType: 'image/jpeg', tamanhoBytes: 10 });
    const status = await putDireto(pedido.body.uploadUrl, { 'Content-Type': 'text/html' }, Buffer.from('<h1>x</h1>'));
    expect(status).toBe(403);
  });

  it('confirmar sem ter enviado → FOTO_INVALIDA', async () => {
    const { agente, hoje } = await cenarioInscrito(ctx);
    const pedido = await agente
      .post(`/api/desafios/desafio-teste/dias/${hoje}/fotos/upload-url`)
      .send({ tipo: 'AGUA', mimeType: 'image/jpeg', tamanhoBytes: 10 });
    const c = await agente.post(`/api/desafios/desafio-teste/dias/${hoje}/fotos/${pedido.body.fotoId}/confirmar`);
    expect(c.body.codigo).toBe('FOTO_INVALIDA');
  });

  it('nova foto do mesmo tipo substitui a anterior (1 por tipo)', async () => {
    const { agente, hoje } = await cenarioInscrito(ctx);
    const a = await enviarFoto(agente, hoje, 'AGUA', await jpegComExif('#111111'));
    const b = await enviarFoto(agente, hoje, 'AGUA', await jpegComExif('#222222'));
    expect(a.fotoId).not.toBe(b.fotoId);
    const fotos = await ctx.prisma.fotoProva.findMany();
    expect(fotos).toHaveLength(1);
    expect(fotos[0]?.id).toBe(b.fotoId);
  });

  it('não pode mexer em foto de outro participante nem fora do dia atual', async () => {
    const dono = await cenarioInscrito(ctx);
    const r = await enviarFoto(dono.agente, dono.hoje, 'AGUA', await jpegComExif('#333333'));
    const intruso = await cenarioInscrito(ctx);
    const c = await intruso.agente.post(`/api/desafios/desafio-teste/dias/${dono.hoje}/fotos/${r.fotoId}/confirmar`);
    expect(c.status).toBe(404);
    const ontem = await dono.agente
      .post(`/api/desafios/desafio-teste/dias/${dono.hoje - 1}/fotos/upload-url`)
      .send({ tipo: 'AGUA', mimeType: 'image/jpeg', tamanhoBytes: 10 });
    expect(ontem.body.codigo).toBe('DIA_NAO_EDITAVEL');
  });

  it('limpeza apaga fotos PENDENTE com mais de 1 hora', async () => {
    const { agente, hoje } = await cenarioInscrito(ctx);
    const pedido = await agente
      .post(`/api/desafios/desafio-teste/dias/${hoje}/fotos/upload-url`)
      .send({ tipo: 'EXERCICIO', mimeType: 'image/jpeg', tamanhoBytes: 10 });
    await putDireto(pedido.body.uploadUrl, pedido.body.headers, Buffer.from('0123456789'));
    const processamento = ctx.app.get(ProcessamentoFotoService);
    expect(await processamento.limparPendentes()).toBe(0);
    const daquiDuasHoras = new Date(Date.now() + 2 * 60 * 60 * 1000);
    expect(await processamento.limparPendentes(daquiDuasHoras)).toBe(1);
    expect(await ctx.prisma.fotoProva.count()).toBe(0);
  });
});
