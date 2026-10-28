// Seed SOMENTE para desenvolvimento. Idempotente: pode rodar várias vezes.
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient, type TipoFoto } from '@prisma/client';
import * as argon2 from 'argon2';
import sharp from 'sharp';
import { TIPOS_FOTO, calcularConcluido, hojeNoFuso, somarDias } from '@everest/shared';
import { carregarEnv } from '../scripts/_util';
import { inscrever } from '../src/modules/inscricoes/inscrever';
import { configS3DoEnv, criarClienteS3 } from '../src/storage/s3';

carregarEnv();

if (process.env.NODE_ENV === 'production') {
  console.error('✖ O seed não pode rodar em produção (dados fictícios).');
  process.exit(1);
}

const prisma = new PrismaClient();
const s3Config = configS3DoEnv(process.env);
const s3 = criarClienteS3(s3Config);

const SENHA_DEV = 'everest-dev-123';
const SLUG = 'desafio-30-everest-dev';
const TZ = 'America/Sao_Paulo';

interface PlanoDia {
  agua: number;
  exercicio: boolean;
  paginas: number;
  fotos: number;
  story: boolean;
  invalidado?: string;
}

const COMPLETO: PlanoDia = { agua: 3000, exercicio: true, paginas: 12, fotos: 3, story: true };
const PARCIAL: PlanoDia = { agua: 1500, exercicio: true, paginas: 4, fotos: 1, story: false };

const PESSOAS: { nome: string; email: string; dias: PlanoDia[] }[] = [
  { nome: 'Maria Souza Lima', email: 'maria@everest.dev', dias: [COMPLETO, COMPLETO, COMPLETO] },
  { nome: 'João Pereira', email: 'joao@everest.dev', dias: [COMPLETO, PARCIAL, COMPLETO] },
  { nome: 'Ana Clara Ribeiro', email: 'ana@everest.dev', dias: [COMPLETO] },
  { nome: 'Carlos Eduardo Santos', email: 'carlos@everest.dev', dias: [PARCIAL] },
  {
    nome: 'Beatriz Almeida',
    email: 'beatriz@everest.dev',
    dias: [COMPLETO, { ...COMPLETO, invalidado: 'Foto de leitura repetida do dia anterior (exemplo).' }, COMPLETO],
  },
];

const CORES: Record<TipoFoto, string> = { AGUA: '#1d4ed8', EXERCICIO: '#b91c1c', LEITURA: '#15803d' };
const ROTULOS: Record<TipoFoto, string> = { AGUA: 'ÁGUA', EXERCICIO: 'EXERCÍCIO', LEITURA: 'LEITURA' };

async function imagemExemplo(tipo: TipoFoto, dia: number, largura: number): Promise<Buffer> {
  const base = sharp({
    create: { width: largura, height: largura, channels: 3, background: CORES[tipo] },
  });
  const svg = Buffer.from(
    `<svg width="${largura}" height="${largura}" xmlns="http://www.w3.org/2000/svg">
      <text x="50%" y="50%" font-family="sans-serif" font-size="${Math.round(largura / 9)}" fill="#fff"
        text-anchor="middle" dominant-baseline="middle">${ROTULOS[tipo]} · DIA ${dia}</text>
    </svg>`,
  );
  try {
    return await base.composite([{ input: svg }]).webp({ quality: 80 }).toBuffer();
  } catch {
    return sharp({ create: { width: largura, height: largura, channels: 3, background: CORES[tipo] } })
      .webp({ quality: 80 })
      .toBuffer();
  }
}

async function enviar(chave: string, corpo: Buffer): Promise<void> {
  await s3.send(
    new PutObjectCommand({ Bucket: s3Config.bucket, Key: chave, Body: corpo, ContentType: 'image/webp' }),
  );
}

async function garantirUsuario(nome: string, email: string, senhaHash: string, admin = false) {
  return prisma.usuario.upsert({
    where: { email },
    update: { nome, ...(admin ? { papel: 'ADMIN' as const } : {}) },
    create: { nome, email, senhaHash, papel: admin ? 'ADMIN' : 'USUARIO', aceitouTermosEm: new Date() },
  });
}

async function semearDias(desafioId: string, participanteId: string, dias: PlanoDia[], adminId: string) {
  for (const [i, plano] of dias.entries()) {
    const numeroDia = i + 1;
    const tipos = TIPOS_FOTO.slice(0, plano.fotos);
    const concluido = calcularConcluido({
      aguaMl: plano.agua,
      exercicio: plano.exercicio,
      paginasLidas: plano.paginas,
      storyPostado: plano.story,
      fotosValidas: [...tipos],
      invalidado: plano.invalidado !== undefined,
    });
    const dadosDia = {
      aguaMl: plano.agua,
      exercicio: plano.exercicio,
      paginasLidas: plano.paginas,
      storyPostado: plano.story,
      concluido,
      invalidado: plano.invalidado !== undefined,
      motivoInvalidacao: plano.invalidado ?? null,
      invalidadoPorId: plano.invalidado ? adminId : null,
      invalidadoEm: plano.invalidado ? new Date() : null,
    };
    const dia = await prisma.diaDesafio.upsert({
      where: { participanteId_numeroDia: { participanteId, numeroDia } },
      update: dadosDia,
      create: { participanteId, numeroDia, ...dadosDia },
    });
    for (const tipo of tipos) {
      const base = `provas/${desafioId}/${participanteId}/${numeroDia}/${tipo}-seed`;
      const storageKey = `${base}.full.webp`;
      const thumbKey = `${base}.thumb.webp`;
      const [full, thumb] = await Promise.all([
        imagemExemplo(tipo, numeroDia, 800),
        imagemExemplo(tipo, numeroDia, 400),
      ]);
      await Promise.all([enviar(storageKey, full), enviar(thumbKey, thumb)]);
      await prisma.fotoProva.upsert({
        where: { diaId_tipo: { diaId: dia.id, tipo } },
        update: { storageKey, thumbKey, status: 'CONFIRMADA', mimeType: 'image/webp', tamanhoBytes: full.length },
        create: {
          diaId: dia.id,
          tipo,
          storageKey,
          thumbKey,
          status: 'CONFIRMADA',
          mimeType: 'image/webp',
          tamanhoBytes: full.length,
        },
      });
    }
  }
}

async function main(): Promise<void> {
  const senhaHash = await argon2.hash(SENHA_DEV, { type: argon2.argon2id });
  const admin = await garantirUsuario('Anderson Dev', 'admin@everest.dev', senhaHash, true);

  // Começou há 3 dias: hoje é o dia 4.
  const dataInicio = somarDias(hojeNoFuso(new Date(), TZ), -3);
  const desafio = await prisma.$transaction(async (tx) => {
    await tx.desafio.updateMany({ where: { ativo: true, NOT: { slug: SLUG } }, data: { ativo: false } });
    return tx.desafio.upsert({
      where: { slug: SLUG },
      update: { dataInicio: new Date(`${dataInicio}T00:00:00Z`), ativo: true },
      create: {
        slug: SLUG,
        nome: 'Desafio 30 Dias Everest (dev)',
        dataInicio: new Date(`${dataInicio}T00:00:00Z`),
        instagramHandle: 'everest_dev',
        timezone: TZ,
        ativo: true,
      },
    });
  });

  // Q3: o embaixador ocupa vaga se desafio.embaixadorOcupaVaga.
  const embaixador = await inscrever(prisma, { slug: SLUG, usuarioId: admin.id, embaixador: true });
  await semearDias(desafio.id, embaixador.participante.id, [COMPLETO, COMPLETO, COMPLETO], admin.id);

  for (const pessoa of PESSOAS) {
    const u = await garantirUsuario(pessoa.nome, pessoa.email, senhaHash);
    const r = await inscrever(prisma, { slug: SLUG, usuarioId: u.id });
    await semearDias(desafio.id, r.participante.id, pessoa.dias, admin.id);
  }

  const total = await prisma.participante.count({ where: { desafioId: desafio.id } });
  console.log(`✔ Seed ok. Desafio "${SLUG}" começou em ${dataInicio} (hoje = dia 4). Participantes: ${total}.`);
  console.log(`  Admin: admin@everest.dev / ${SENHA_DEV}  ·  demais usuários: *@everest.dev / ${SENHA_DEV}`);
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
