// `preparar`: cria os VUs (Firebase), loga pela API pública, completa o cadastro, inscreve,
// avisa o pagamento e, como "admin", confirma ~75% direto no banco. Idempotente.
import { hojeNoFuso, type StatusPagamento } from '@everest/shared';
import { ClienteVu } from './cliente';
import { DOMINIO_VU, rotuloVu } from './config';
import { type Contexto, invalidarCachesDoDesafio } from './contexto';
import { dadosDoVu } from './dados';
import { ErroHttp } from './http';
import { grupoPagamento, perfilDoVu } from './personas';

export interface OpcoesPreparar {
  slug: string;
  quantidade: number;
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
  if (!desafio.ativo) {
    throw new Error(
      `O desafio "${op.slug}" não está ativo: a inscrição pela API só aceita o desafio ativo.`,
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
  const vusInscritos = await prisma.participante.count({
    where: { desafioId: desafio.id, usuario: { email: FILTRO_EMAIL_VU } },
  });
  const livres = desafio.totalVagas - ocupadas;
  log(
    `Preparando ${op.quantidade} VUs em "${desafio.slug}" (${ocupadas}/${desafio.totalVagas} vagas ocupadas, ` +
      `${vusInscritos} já são VUs) via ${ctx.config.baseUrl}`,
  );
  if (op.quantidade - vusInscritos > livres) {
    log(`! Só há ${livres} vagas livres: alguns VUs vão ficar sem inscrição (VAGAS_ESGOTADAS).`);
  }

  const hoje = hojeNoFuso(new Date(), desafio.timezone);
  const preparados: Preparado[] = [];
  let erros = 0;

  for (let n = 1; n <= op.quantidade; n++) {
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
