// `preparar`: cria os VUs (Firebase), loga pela API pública, completa o cadastro, inscreve,
// avisa o pagamento e, como "admin", confirma ~75% direto no banco. Idempotente.
import { hojeNoFuso, type StatusPagamento } from '@everest/shared';
import { type FaixaVus, numerosDaFaixa } from './args';
import { ClienteVu } from './cliente';
import { DOMINIO_VU, emailDoVu, rotuloVu } from './config';
import { type Contexto, invalidarCachesDoDesafio } from './contexto';
import { dadosDoVu } from './dados';
import { ErroHttp } from './http';
import { grupoPagamento, perfilDoVu } from './personas';

export interface OpcoesPreparar extends FaixaVus {
  slug: string;
  /**
   * Só para desafio de teste INATIVO (a API só inscreve no ativo): login e cadastro continuam pela
   * API; a inscrição é criada no banco já com o pagamento CONFIRMADO, como o admin faria no painel.
   */
  direto?: boolean;
}

interface Preparado {
  rotulo: string;
  usuarioId: string;
  grupo: ReturnType<typeof grupoPagamento>;
  status: StatusPagamento;
}

const FILTRO_EMAIL_VU = { endsWith: `@${DOMINIO_VU}` };

function mensagem(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export async function preparar(ctx: Contexto, op: OpcoesPreparar): Promise<void> {
  const { prisma, log } = ctx;
  const desafio = await prisma.desafio.findUnique({ where: { slug: op.slug } });
  if (!desafio)
    throw new Error(
      `O desafio "${op.slug}" não existe. Crie-o antes (criar-desafio ou painel do admin).`,
    );
  if (op.direto && desafio.ativo) {
    throw new Error(`--direto é só para desafio de teste inativo; "${op.slug}" está ativo.`);
  }
  if (!desafio.ativo && !op.direto) {
    throw new Error(
      `O desafio "${op.slug}" não está ativo: a inscrição pela API só aceita o desafio ativo ` +
        `(use --direto para inscrever direto no banco).`,
    );
  }

  const admin = await prisma.usuario.findFirst({
    where: { papel: 'ADMIN', excluidoEm: null, NOT: { email: FILTRO_EMAIL_VU } },
    orderBy: { criadoEm: 'asc' },
    select: { id: true, email: true },
  });
  if (!admin) log('! Nenhum ADMIN no banco: as confirmações ficam sem "confirmado por".');

  const ocupadas = await prisma.participante.count({
    where: { desafioId: desafio.id, vagaNumero: { not: null } },
  });
  const numeros = numerosDaFaixa(op);
  const vusInscritos = await prisma.participante.count({
    where: { desafioId: desafio.id, usuario: { email: FILTRO_EMAIL_VU } },
  });
  // Da faixa pedida, quantos já estão inscritos (não ocupam vaga nova).
  const daFaixaInscritos = await prisma.participante.count({
    where: { desafioId: desafio.id, usuario: { email: { in: numeros.map(emailDoVu) } } },
  });
  const livres = desafio.totalVagas - ocupadas;
  const faixa = `VU ${rotuloVu(op.inicio)}–${rotuloVu(op.inicio + op.quantidade - 1)}`;
  log(
    `Preparando ${op.quantidade} VUs (${faixa}) em "${desafio.slug}" (${ocupadas}/${desafio.totalVagas} vagas ocupadas, ` +
      `${vusInscritos} já são VUs, ${daFaixaInscritos} desta faixa) via ${ctx.config.baseUrl}`,
  );
  if (op.quantidade - daFaixaInscritos > livres) {
    log(`! Só há ${livres} vagas livres: alguns VUs vão ficar sem inscrição (VAGAS_ESGOTADAS).`);
  }

  const hoje = hojeNoFuso(new Date(), desafio.timezone);
  const preparados: Preparado[] = [];
  let erros = 0;

  for (const n of numeros) {
    const dados = dadosDoVu(n, hoje);
    const cliente = new ClienteVu(ctx, { numero: n, email: dados.email, nome: dados.nome });
    const rotulo = `VU ${rotuloVu(n)}`;
    try {
      await ctx.firebase.garantirUsuario(dados.email, dados.nome);
      let me = (await cliente.garantirSessao()) ?? (await cliente.me());
      if (!me.usuario.perfilCompleto || me.usuario.nome !== dados.nome) {
        me = await cliente.atualizarPerfil(dados.perfil);
      }
      const existente = await prisma.participante.findUnique({
        where: { desafioId_usuarioId: { desafioId: desafio.id, usuarioId: me.usuario.id } },
        select: { pagamentoStatus: true, vagaNumero: true },
      });
      let status: StatusPagamento;
      let vaga: number | null;
      if (existente) {
        status = existente.pagamentoStatus;
        vaga = existente.vagaNumero;
      } else if (op.direto) {
        const r = await prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Desafio" WHERE id = ${desafio.id} FOR UPDATE`;
          const max = await tx.participante.aggregate({
            where: { desafioId: desafio.id },
            _max: { vagaNumero: true },
          });
          const agora = new Date();
          return tx.participante.create({
            data: {
              desafioId: desafio.id,
              usuarioId: me.usuario.id,
              vagaNumero: (max._max.vagaNumero ?? 0) + 1,
              pagamentoStatus: 'CONFIRMADO',
              pagamentoInformadoEm: agora,
              pagamentoConfirmadoEm: agora,
              pagamentoConfirmadoPorId: admin?.id ?? null,
            },
            select: { pagamentoStatus: true, vagaNumero: true },
          });
        });
        status = r.pagamentoStatus;
        vaga = r.vagaNumero;
      } else {
        const r = await cliente.inscrever(desafio.slug);
        status = r.participacao.pagamentoStatus;
        vaga = r.participacao.vagaNumero;
      }
      const grupo = grupoPagamento(dados.email);
      if (grupo !== 'PENDENTE' && status === 'PENDENTE') {
        try {
          status = (await cliente.informarPagamento(desafio.slug)).status;
        } catch (e) {
          if (!(e instanceof ErroHttp)) throw e;
          if (e.codigo === 'PAGAMENTO_JA_CONFIRMADO') status = 'CONFIRMADO';
          else if (e.codigo === 'PAGAMENTO_INDISPONIVEL')
            log(`  ! ${rotulo}: Pix não configurado; aviso de pagamento pulado.`);
          else throw e;
        }
      }
      preparados.push({ rotulo, usuarioId: me.usuario.id, grupo, status });
      log(
        `  ✔ ${dados.nome} · ${perfilDoVu(dados.email).persona.toLowerCase()} · vaga ${vaga ?? '-'} · ` +
          `pagamento ${status}${grupo === 'CONFIRMADO' && status !== 'CONFIRMADO' ? ' → CONFIRMADO' : ''}`,
      );
    } catch (e) {
      if (e instanceof ErroHttp && e.codigo === 'VAGAS_ESGOTADAS') {
        log(`  ✖ ${rotulo}: vagas esgotadas; parando aqui.`);
        break;
      }
      if (
        e instanceof ErroHttp &&
        (e.codigo === 'INSCRICOES_FECHADAS' || e.codigo === 'DESAFIO_ENCERRADO')
      ) {
        throw new Error(
          `Inscrição recusada pela API (${e.codigo}). Abra as inscrições do desafio de teste.`,
          { cause: e },
        );
      }
      if (e instanceof ErroHttp && e.status === 429) {
        throw new Error(`Limite de requisições da API atingido: ${e.message}`, { cause: e });
      }
      erros++;
      log(`  ✖ ${rotulo}: ${mensagem(e)}`);
    }
  }

  // O "admin" confere o Pix de ~75%: mesmo efeito do PATCH de pagamento do painel.
  const paraConfirmar = preparados.filter(
    (p) => p.grupo === 'CONFIRMADO' && p.status !== 'CONFIRMADO',
  );
  if (paraConfirmar.length > 0) {
    const r = await prisma.participante.updateMany({
      where: {
        desafioId: desafio.id,
        usuarioId: { in: paraConfirmar.map((p) => p.usuarioId) },
        usuario: { email: FILTRO_EMAIL_VU },
        pagamentoStatus: { not: 'CONFIRMADO' },
      },
      data: {
        pagamentoStatus: 'CONFIRMADO',
        pagamentoConfirmadoEm: new Date(),
        pagamentoConfirmadoPorId: admin?.id ?? null,
      },
    });
    log(
      `Admin${admin ? ` (${admin.email})` : ''} confirmou ${r.count} pagamento(s) direto no banco.`,
    );
  }
  await invalidarCachesDoDesafio(ctx, desafio.id);

  const porStatus = await prisma.participante.groupBy({
    by: ['pagamentoStatus'],
    where: { desafioId: desafio.id, usuario: { email: FILTRO_EMAIL_VU } },
    _count: { _all: true },
  });
  const resumo = porStatus.map((g) => `${g.pagamentoStatus} ${g._count._all}`).join(', ');
  log(
    `Pronto: ${preparados.length} VU(s) ok, ${erros} erro(s). Pagamentos dos VUs: ${resumo || 'nenhum'}. ` +
      `${ctx.contador.requisicoes} requisições, ${ctx.contador.logins} login(s).`,
  );
  if (erros > 0) process.exitCode = 1;
}
