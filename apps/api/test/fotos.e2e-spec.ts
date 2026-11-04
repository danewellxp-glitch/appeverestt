import sharp from 'sharp';
import type { AdminFotoDia, AdminParticipante, TipoFoto } from '@everest/shared';
import { preencherHashes } from '../scripts/hash-fotos';
import { ProcessamentoFotoService } from '../src/modules/fotos/processamento.service';
import { configS3DoEnv, criarClienteS3 } from '../src/storage/s3';
import { StorageService } from '../src/storage/storage.service';
import {
  CHECKIN_COMPLETO,
  type Contexto,
  cenarioInscrito,
  criarApp,
  esperar,
  fotosFalsas,
  limparTudo,
  tornarAdmin,
} from './helpers';

type Agente = Awaited<ReturnType<typeof cenarioInscrito>>['agente'];

/** JPEG com EXIF (inclui dados de câmera), como sai de um celular. */
async function jpegComExif(cor: string): Promise<Buffer> {
  return sharp({ create: { width: 1200, height: 900, channels: 3, background: cor } })
    .jpeg({ quality: 85 })
    .withExif({ IFD0: { Make: 'CelularTeste', Model: 'X1', Copyright: 'Pessoa Teste' } })
    .toBuffer();
}

/** JPEG com blocos de cores sorteadas (textura, como uma foto); a mesma semente dá a mesma imagem. */
async function jpegComTextura(semente: number): Promise<Buffer> {
  let s = semente >>> 0;
  const sortear = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s >>> 24;
  };
  const blocos = Buffer.from(Array.from({ length: 12 * 9 * 3 }, sortear));
  return sharp(blocos, { raw: { width: 12, height: 9, channels: 3 } })
    .resize(1200, 900, { kernel: 'nearest' })
    .jpeg({ quality: 85 })
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

  it('troca que não chega não derruba a foto anterior (R17)', async () => {
    const { agente, hoje } = await cenarioInscrito(ctx);
    for (const tipo of ['AGUA', 'EXERCICIO', 'LEITURA'] as const) {
      const r = await enviarFoto(agente, hoje, tipo, await jpegComExif('#444444'));
      expect(r.confirmacao?.status).toBe(200);
    }
    await agente.put(`/api/desafios/desafio-teste/dias/${hoje}`).send(CHECKIN_COMPLETO).expect(200);
    const antes = await agente.get(`/api/desafios/desafio-teste/dias/${hoje}`).expect(200);
    expect(antes.body.concluido).toBe(true);
    const aguaAntiga = (antes.body.fotos as { id: string; tipo: string }[]).find((f) => f.tipo === 'AGUA')?.id;

    // Pede a troca da foto de água, mas o arquivo nunca chega.
    const pedido = await agente
      .post(`/api/desafios/desafio-teste/dias/${hoje}/fotos/upload-url`)
      .send({ tipo: 'AGUA', mimeType: 'image/jpeg', tamanhoBytes: 1000 });
    expect(pedido.status).toBe(200);
    const durante = await agente.get(`/api/desafios/desafio-teste/dias/${hoje}`).expect(200);
    expect(durante.body.concluido).toBe(true);
    const fotosDurante = durante.body.fotos as { id: string; tipo: string }[];
    expect(fotosDurante.filter((f) => f.tipo === 'AGUA').map((f) => f.id)).toEqual([aguaAntiga]);

    const falha = await agente.post(`/api/desafios/desafio-teste/dias/${hoje}/fotos/${pedido.body.fotoId}/confirmar`);
    expect(falha.body.codigo).toBe('FOTO_INVALIDA');
    const depois = await agente.get(`/api/desafios/desafio-teste/dias/${hoje}`).expect(200);
    expect(depois.body.concluido).toBe(true);
    expect(await statusFoto(aguaAntiga ?? '')).not.toBe('SUMIU');

    // A troca que chega substitui: a antiga sai do banco e do storage.
    const antiga = await ctx.prisma.fotoProva.findUniqueOrThrow({ where: { id: aguaAntiga ?? '' } });
    const nova = await enviarFoto(agente, hoje, 'AGUA', await jpegComExif('#555555'));
    expect(nova.confirmacao?.status).toBe(200);
    expect(await statusFoto(aguaAntiga ?? '')).toBe('SUMIU');
    expect(await storage.cabecalho(antiga.storageKey)).toBeNull();
    const agua = await ctx.prisma.fotoProva.findMany({ where: { tipo: 'AGUA' } });
    expect(agua.map((f) => f.id)).toEqual([nova.fotoId]);
  });

  it('foto pedida antes da virada e confirmada depois da tolerância não vale para o dia que acabou', async () => {
    const { agente, hoje, desafio } = await cenarioInscrito(ctx);
    const pedido = await agente
      .post(`/api/desafios/desafio-teste/dias/${hoje}/fotos/upload-url`)
      .send({ tipo: 'AGUA', mimeType: 'image/jpeg', tamanhoBytes: 10 });
    expect(pedido.status).toBe(200);
    await putDireto(pedido.body.uploadUrl, pedido.body.headers, await jpegComExif('#666666'));
    // "Passa um dia": o desafio começa um dia antes, então o dia da foto vira ontem.
    const inicio = new Date(desafio.dataInicio.getTime() - 24 * 60 * 60 * 1000);
    await ctx.prisma.desafio.update({ where: { id: desafio.id }, data: { dataInicio: inicio } });
    const c = await agente.post(`/api/desafios/desafio-teste/dias/${hoje}/fotos/${pedido.body.fotoId}/confirmar`);
    expect(c.body.codigo).toBe('DIA_NAO_EDITAVEL');
    expect(await statusFoto(pedido.body.fotoId)).toBe('SUMIU');
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
  describe('sinal de foto parecida (X20)', () => {
    type FotoAdmin = Pick<AdminFotoDia, 'tipo' | 'parecida'>;

    async function adminLogado() {
      const admin = await cenarioInscrito(ctx, { nome: 'Anderson Admin' });
      await tornarAdmin(ctx.prisma, admin.usuarioId);
      return admin.agente;
    }

    async function parecidasDoDia(admin: Agente, participanteId: string, dia: number) {
      const r = await admin
        .get(`/api/admin/desafios/desafio-teste/participantes/${participanteId}/dias/${dia}`)
        .expect(200);
      const fotos = r.body.fotos as FotoAdmin[];
      return {
        diaId: r.body.diaId as string,
        porTipo: Object.fromEntries(fotos.map((f) => [f.tipo, f.parecida])),
      };
    }

    async function diasFotoParecida(admin: Agente) {
      const r = await admin.get('/api/admin/desafios/desafio-teste/participantes').expect(200);
      const lista = r.body.participantes as AdminParticipante[];
      return Object.fromEntries(lista.map((p) => [p.nome, p.diasFotoParecida]));
    }

    async function esperarConfirmadas(ids: (string | null)[]) {
      for (const id of ids) await esperar(() => statusFoto(id ?? ''), (st) => st === 'CONFIRMADA');
    }

    it('mesma foto como água e leitura no mesmo dia: só o admin vê; aprovar tira da lista', async () => {
      const ana = await cenarioInscrito(ctx, { nome: 'Ana Souza' });
      const admin = await adminLogado();
      const repetida = await jpegComTextura(1);
      const envios = [];
      for (const [tipo, corpo] of [
        ['AGUA', repetida],
        ['EXERCICIO', await jpegComTextura(2)],
        ['LEITURA', repetida],
      ] as const) {
        const r = await enviarFoto(ana.agente, ana.hoje, tipo, corpo);
        expect(r.confirmacao?.status).toBe(200);
        envios.push(r.fotoId);
      }
      await esperarConfirmadas(envios);
      await ana.agente.put(`/api/desafios/desafio-teste/dias/${ana.hoje}`).send(CHECKIN_COMPLETO).expect(200);

      const hashes = await ctx.prisma.fotoProva.findMany({ select: { hashPerceptual: true } });
      for (const h of hashes) expect(h.hashPerceptual).toMatch(/^[0-9a-f]{16}$/);

      const { diaId, porTipo } = await parecidasDoDia(admin, ana.participanteId, ana.hoje);
      expect(porTipo.AGUA).toEqual({
        participanteId: ana.participanteId,
        nome: 'Ana Souza',
        numeroDia: ana.hoje,
        tipo: 'LEITURA',
        mesmaPessoa: true,
      });
      expect(porTipo.LEITURA).toMatchObject({ tipo: 'AGUA', mesmaPessoa: true });
      expect(porTipo.EXERCICIO).toBeNull();

      // A rota do participante não expõe o sinal.
      const proprio = await ana.agente.get(`/api/desafios/desafio-teste/dias/${ana.hoje}`).expect(200);
      expect(proprio.body.fotos).toHaveLength(3);
      for (const f of proprio.body.fotos as object[]) expect(f).not.toHaveProperty('parecida');

      // Na lista, só enquanto o dia está para revisar. A foto continua sinalizada no dia.
      expect(await diasFotoParecida(admin)).toEqual({ 'Ana Souza': [ana.hoje], 'Anderson Admin': [] });
      await admin.patch(`/api/admin/dias/${diaId}/conferencia`).send({ conferido: true }).expect(200);
      expect(await diasFotoParecida(admin)).toEqual({ 'Ana Souza': [], 'Anderson Admin': [] });
      expect((await parecidasDoDia(admin, ana.participanteId, ana.hoje)).porTipo.AGUA).not.toBeNull();
    });

    it('outra pessoa com a mesma foto (recomprimida e menor) → aponta a de quem enviou; diferentes e lisas não', async () => {
      const ana = await cenarioInscrito(ctx, { nome: 'Ana Souza' });
      const bia = await cenarioInscrito(ctx, { nome: 'Bia Lima' });
      const admin = await adminLogado();
      const original = await jpegComTextura(3);
      const copia = await sharp(original).resize({ width: 800 }).jpeg({ quality: 60 }).toBuffer();

      const envios = [
        await enviarFoto(ana.agente, ana.hoje, 'AGUA', original),
        // cor sólida não tem hash: vermelho e azul não viram "parecidas"
        await enviarFoto(ana.agente, ana.hoje, 'LEITURA', await jpegComExif('#b91c1c')),
        await enviarFoto(bia.agente, bia.hoje, 'EXERCICIO', copia),
        await enviarFoto(bia.agente, bia.hoje, 'LEITURA', await jpegComTextura(4)),
        await enviarFoto(bia.agente, bia.hoje, 'AGUA', await jpegComExif('#1d4ed8')),
      ];
      for (const e of envios) expect(e.confirmacao?.status).toBe(200);
      await esperarConfirmadas(envios.map((e) => e.fotoId));

      const lisas = await ctx.prisma.fotoProva.findMany({
        where: { hashPerceptual: null },
        select: { id: true },
      });
      expect(lisas.map((f) => f.id).sort()).toEqual([envios[1]?.fotoId, envios[4]?.fotoId].sort());

      const daBia = (await parecidasDoDia(admin, bia.participanteId, bia.hoje)).porTipo;
      expect(daBia.EXERCICIO).toEqual({
        participanteId: ana.participanteId,
        nome: 'Ana Souza',
        numeroDia: ana.hoje,
        tipo: 'AGUA',
        mesmaPessoa: false,
      });
      expect(daBia.LEITURA).toBeNull();
      expect(daBia.AGUA).toBeNull();

      const daAna = (await parecidasDoDia(admin, ana.participanteId, ana.hoje)).porTipo;
      expect(daAna.AGUA).toMatchObject({ participanteId: bia.participanteId, nome: 'Bia Lima', tipo: 'EXERCICIO' });
      expect(daAna.LEITURA).toBeNull();
    });

    it('script hash-fotos preenche o hash das fotos antigas e pode rodar de novo', async () => {
      const ana = await cenarioInscrito(ctx, { nome: 'Ana Souza' });
      const r = await enviarFoto(ana.agente, ana.hoje, 'AGUA', await jpegComTextura(5));
      await esperarConfirmadas([r.fotoId]);
      const hashDoWorker = (await ctx.prisma.fotoProva.findUniqueOrThrow({ where: { id: r.fotoId ?? '' } }))
        .hashPerceptual;
      expect(hashDoWorker).toMatch(/^[0-9a-f]{16}$/);

      // "Fotos de antes da R20": sem hash; e 3 confirmadas cujo arquivo não está no storage.
      await ctx.prisma.fotoProva.updateMany({ data: { hashPerceptual: null } });
      await fotosFalsas(ctx.prisma, ana.participanteId, ana.hoje - 1);

      const s3cfg = configS3DoEnv(process.env);
      const s3 = criarClienteS3(s3cfg);
      try {
        const primeira = await preencherHashes(ctx.prisma, s3, s3cfg.bucket, { lote: 2 });
        expect(primeira).toEqual({
          analisadas: 4,
          preenchidas: 1,
          lisas: 0,
          semArquivo: 3,
          ignoradas: 0,
          falhas: 0,
        });
        const depois = await ctx.prisma.fotoProva.findUniqueOrThrow({ where: { id: r.fotoId ?? '' } });
        expect(depois.hashPerceptual).toBe(hashDoWorker);

        const segunda = await preencherHashes(ctx.prisma, s3, s3cfg.bucket, { lote: 2 });
        expect(segunda).toMatchObject({ analisadas: 3, preenchidas: 0, semArquivo: 3, falhas: 0 });
      } finally {
        s3.destroy();
      }
    });
  });
});
