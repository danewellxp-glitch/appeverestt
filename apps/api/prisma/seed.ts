// Seed SOMENTE para desenvolvimento. Idempotente: pode rodar várias vezes.
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient, type StatusPagamento, type TipoFoto } from '@prisma/client';
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

/** Inscrições ainda sem pagamento confirmado (X12), para a fila do painel ter o que mostrar. */
const SEM_PAGAMENTO: { nome: string; email: string; status: Exclude<StatusPagamento, 'CONFIRMADO'> }[] = [
  { nome: 'Pedro Henrique Costa', email: 'pedro@everest.dev', status: 'PENDENTE' },
  { nome: 'Lucia Fernandes', email: 'lucia@everest.dev', status: 'INFORMADO' },
];

/** Feedbacks de exemplo (X13). */
const FEEDBACKS: { email: string; nota: number; oQueAchou: string; oQueMudou: string; autorizaDivulgacao: boolean }[] = [
  {
    email: 'maria@everest.dev',
    nota: 5,
    oQueAchou: 'Puxado no começo, mas o grupo e o ranking me fizeram não largar.',
    oQueMudou: 'Passei a beber água de verdade e a ler todo dia antes de dormir.',
    autorizaDivulgacao: true,
  },
  {
    email: 'joao@everest.dev',
    nota: 4,
    oQueAchou: 'Gostei da organização; as fotos de prova dão trabalho, mas funcionam.',
    oQueMudou: 'Criei o hábito de treinar cedo, antes do trabalho.',
    autorizaDivulgacao: false,
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

/** Dados de cadastro fictícios (Q7) para o perfil ficar completo em dev. Nunca em produção (Q9). */
function dadosDev(email: string) {
  const usuario = (email.split('@')[0] ?? 'dev').replace(/[^a-z0-9._]/g, '');
  return {
    instagram: `${usuario}.everest_dev`,
    dataNascimento: new Date('1992-06-15T00:00:00Z'),
    whatsapp: '11900000000',
    bairro: 'Vila Mariana',
    cidade: 'São Paulo',
    uf: 'SP',
  };
}

async function garantirUsuario(nome: string, email: string, senhaHash: string, admin = false) {
  return prisma.usuario.upsert({
    where: { email },
    update: { nome, ...dadosDev(email), ...(admin ? { papel: 'ADMIN' as const } : {}) },
    create: { nome, email, senhaHash, papel: admin ? 'ADMIN' : 'USUARIO', aceitouTermosEm: new Date(), ...dadosDev(email) },
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
      concluidoEm: concluido ? new Date() : null,
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
      const dados = { storageKey, thumbKey, status: 'CONFIRMADA' as const, mimeType: 'image/webp', tamanhoBytes: full.length };
      const existente = await prisma.fotoProva.findFirst({
        where: { diaId: dia.id, tipo, status: { not: 'PENDENTE' } },
        select: { id: true },
      });
      if (existente) await prisma.fotoProva.update({ where: { id: existente.id }, data: dados });
      else await prisma.fotoProva.create({ data: { diaId: dia.id, tipo, ...dados } });
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

  const agora = new Date();
  for (const pessoa of PESSOAS) {
    const u = await garantirUsuario(pessoa.nome, pessoa.email, senhaHash);
    const r = await inscrever(prisma, { slug: SLUG, usuarioId: u.id, pagamentoStatus: 'CONFIRMADO' });
    // `inscrever` é idempotente e não mexe no status de quem já existe: o update faz reruns convergirem.
    if (r.participante.pagamentoStatus !== 'CONFIRMADO') {
      await prisma.participante.update({
        where: { id: r.participante.id },
        data: { pagamentoStatus: 'CONFIRMADO', pagamentoConfirmadoEm: agora, pagamentoConfirmadoPorId: admin.id },
      });
    }
    await semearDias(desafio.id, r.participante.id, pessoa.dias, admin.id);
  }

  for (const pessoa of SEM_PAGAMENTO) {
    const u = await garantirUsuario(pessoa.nome, pessoa.email, senhaHash);
    const r = await inscrever(prisma, { slug: SLUG, usuarioId: u.id, pagamentoStatus: pessoa.status });
    await prisma.participante.update({
      where: { id: r.participante.id },
      data: {
        pagamentoStatus: pessoa.status,
        pagamentoInformadoEm: pessoa.status === 'INFORMADO' ? new Date(agora.getTime() - 2 * 3600_000) : null,
        pagamentoConfirmadoEm: null,
        pagamentoConfirmadoPorId: null,
      },
    });
  }

  for (const f of FEEDBACKS) {
    const { email, ...dados } = f;
    const p = await prisma.participante.findFirst({ where: { desafioId: desafio.id, usuario: { email } } });
    if (!p) continue;
    await prisma.feedback.upsert({ where: { participanteId: p.id }, update: dados, create: { participanteId: p.id, ...dados } });
  }

  const total = await prisma.participante.count({ where: { desafioId: desafio.id } });
  console.log(`✔ Seed ok. Desafio "${SLUG}" começou em ${dataInicio} (hoje = dia 4). Participantes: ${total}.`);
  console.log('  Pagamento: pedro@everest.dev PENDENTE, lucia@everest.dev INFORMADO; demais CONFIRMADO.');
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
