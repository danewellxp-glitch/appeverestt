// `rodada`: um "tique" da simulação. `loop`: uma rodada a cada N minutos, para sempre.
import { calcularDiaAtual, type TipoFoto } from '@everest/shared';
import { chance, criarAleatorio, embaralhar, escolherUm } from './aleatorio';
import { ClienteVu, type Navegacao, estadoDoDetalhe } from './cliente';
import {
  CHAVE_ULTIMA_RODADA,
  DOMINIO_VU,
  INTERVALO_PADRAO_MIN,
  numeroDoEmail,
  rotuloVu,
} from './config';
import { type Contexto, novoContador, travarRodada } from './contexto';
import { ErroHttp } from './http';
import { gerarFotoJpeg } from './imagem';
import {
  CHANCE_AVISAR_PAGAMENTO,
  type Periodo,
  type Tarefa,
  acaoDaTarefa,
  escolherTarefas,
  estaAtivoNoDia,
  horarioNoFuso,
  perfilDoVu,
  periodoDoHorario,
  planoDoDia,
  quantasTarefas,
  tarefasDisponiveis,
} from './personas';

export interface OpcoesRodada {
  slug: string;
  /** Intervalo entre rodadas (ajusta a chance de agir de cada VU). */
  intervaloMin: number;
  /** Força o período do dia (testes manuais); sem ele, vale o relógio de Brasília. */
  periodo?: Periodo;
}

export interface ResumoRodada {
  inicio: string;
  horario: string;
  diaAtual: number | null;
  totalDias: number;
  periodo: Periodo;
  vus: number;
  confirmados: number;
  agiram: number;
  desistiram: number;
  tarefas: Record<Tarefa, number>;
  avisosPagamento: number;
  concluidosHoje: number;
  erros: number;
  logins: number;
  requisicoes: number;
  duracaoS: number;
}

/** Chance de, ao abrir o app, o VU também olhar o progresso, o ranking ou o feed. */
const CHANCE_NAVEGAR = 0.25;
const NAVEGACOES: readonly Navegacao[] = ['meu-progresso', 'ranking', 'feed'];

function mensagem(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function tarefasZeradas(): Record<Tarefa, number> {
  return {
    AGUA: 0,
    EXERCICIO: 0,
    LEITURA: 0,
    STORY: 0,
    FOTO_AGUA: 0,
    FOTO_EXERCICIO: 0,
    FOTO_LEITURA: 0,
  };
}

export function linhaDoResumo(r: ResumoRodada, slug: string): string {
  const t = r.tarefas;
  const fotos = t.FOTO_AGUA + t.FOTO_EXERCICIO + t.FOTO_LEITURA;
  const total = t.AGUA + t.EXERCICIO + t.LEITURA + t.STORY + fotos;
  const dia =
    r.diaAtual === null ? 'fora do período do desafio' : `dia ${r.diaAtual}/${r.totalDias}`;
  return (
    `[${r.horario} Brasília] ${slug} · ${dia} · ${r.periodo.toLowerCase()} · ${r.vus} VUs (${r.confirmados} pagos) · ` +
    `${r.agiram} agiram · ${total} tarefas (água ${t.AGUA}, exercício ${t.EXERCICIO}, leitura ${t.LEITURA}, ` +
    `story ${t.STORY}, fotos ${fotos}) · ${r.concluidosHoje} concluíram hoje · ${r.avisosPagamento} aviso(s) de Pix · ` +
    `${r.desistiram} desistente(s) parado(s) · ${r.logins} login(s) · ${r.requisicoes} req · ${r.erros} erro(s) · ${r.duracaoS}s`
  );
}

/** Uma rodada. Devolve null se não rodou (outra rodada em andamento ou desafio inexistente). */
export async function rodada(
  ctx: Contexto,
  op: OpcoesRodada,
  deveParar: () => boolean = () => false,
): Promise<ResumoRodada | null> {
  const trava = await travarRodada(ctx, 20 * 60);
  if (!trava) {
    ctx.log('Outra rodada (ou um limpar) ainda está em andamento; pulando esta.');
    return null;
  }
  try {
    return await executarRodada(ctx, op, deveParar);
  } finally {
    await trava.liberar();
  }
}

async function executarRodada(
  ctx: Contexto,
  op: OpcoesRodada,
  deveParar: () => boolean,
): Promise<ResumoRodada | null> {
  const { prisma, log } = ctx;
  const inicio = new Date();
  // Contagem por rodada (o loop reaproveita o contexto).
  Object.assign(ctx.contador, novoContador());

  const desafio = await prisma.desafio.findUnique({ where: { slug: op.slug } });
  if (!desafio) {
    log(`Desafio "${op.slug}" não existe; nada a fazer.`);
    return null;
  }
  const tempo = calcularDiaAtual(
    desafio.dataInicio.toISOString().slice(0, 10),
    inicio,
    desafio.timezone,
    desafio.totalDias,
  );
  const { hora, minuto } = horarioNoFuso(inicio, desafio.timezone);
  const periodo = op.periodo ?? periodoDoHorario(hora, minuto);
  const fator = Math.max(0.1, op.intervaloMin / INTERVALO_PADRAO_MIN);
  const rng = criarAleatorio(Math.floor(Math.random() * 2 ** 32));
  const dia = tempo.status === 'EM_ANDAMENTO' ? tempo.numeroDia : null;

  const participantes = await prisma.participante.findMany({
    where: {
      desafioId: desafio.id,
      usuario: { email: { endsWith: `@${DOMINIO_VU}` }, excluidoEm: null },
    },
    select: { id: true, pagamentoStatus: true, usuario: { select: { email: true, nome: true } } },
  });
  const vus = participantes.filter((p) => numeroDoEmail(p.usuario.email) !== null);

  const resumo: ResumoRodada = {
    inicio: inicio.toISOString(),
    horario: `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`,
    diaAtual: dia,
    totalDias: desafio.totalDias,
    periodo,
    vus: vus.length,
    confirmados: vus.filter((v) => v.pagamentoStatus === 'CONFIRMADO').length,
    agiram: 0,
    desistiram: 0,
    tarefas: tarefasZeradas(),
    avisosPagamento: 0,
    concluidosHoje: 0,
    erros: 0,
    logins: 0,
    requisicoes: 0,
    duracaoS: 0,
  };

  for (const p of embaralhar(rng, vus)) {
    if (deveParar()) break;
    const numero = numeroDoEmail(p.usuario.email)!;
    const email = p.usuario.email;
    const cliente = new ClienteVu(ctx, { numero, email, nome: p.usuario.nome });
    const perfil = perfilDoVu(email);
    try {
      if (p.pagamentoStatus === 'PENDENTE') {
        // Alguns não pagos, de vez em quando, avisam que pagaram (entram na fila do painel).
        if (
          periodo !== 'MADRUGADA' &&
          chance(rng, Math.min(0.5, CHANCE_AVISAR_PAGAMENTO * fator))
        ) {
          await cliente.informarPagamento(desafio.slug);
          resumo.avisosPagamento++;
        }
        continue;
      }
      if (p.pagamentoStatus !== 'CONFIRMADO' || dia === null) continue;
      if (!estaAtivoNoDia(perfil, dia)) {
        resumo.desistiram++;
        continue;
      }
      const k = quantasTarefas(periodo, rng, fator);
      if (k === 0) continue;

      const plano = planoDoDia(email, dia, perfil.persona);
      let detalhe = await cliente.dia(desafio.slug, dia);
      if (!detalhe.editavel) continue;
      let estado = estadoDoDetalhe(detalhe);
      const escolhidas = escolherTarefas(rng, tarefasDisponiveis(plano, estado, periodo), k);
      if (escolhidas.length === 0) continue;
      resumo.agiram++;
      if (chance(rng, CHANCE_NAVEGAR))
        await cliente.navegar(desafio.slug, escolherUm(rng, NAVEGACOES));

      for (const tarefa of escolhidas) {
        const acao = acaoDaTarefa(tarefa, estado, plano, periodo, rng);
        if (acao.tipo === 'CHECKIN') {
          detalhe = await cliente.salvarDia(desafio.slug, dia, acao.dados);
          estado = estadoDoDetalhe(detalhe);
        } else {
          await enviarFoto(cliente, desafio.slug, dia, acao.foto, desafio.timezone);
          estado = { ...estado, fotosEnviadas: [...estado.fotosEnviadas, acao.foto] };
        }
        resumo.tarefas[tarefa]++;
      }
    } catch (e) {
      resumo.erros++;
      log(`  ! VU ${rotuloVu(numero)} (${perfil.persona.toLowerCase()}): ${mensagem(e)}`);
      if (e instanceof ErroHttp && e.status === 429) {
        log(
          '  ! Limite de requisições da API atingido mesmo com as esperas; encerrando esta rodada.',
        );
        break;
      }
    }
  }

  if (dia !== null && vus.length > 0) {
    resumo.concluidosHoje = await prisma.diaDesafio.count({
      where: { participanteId: { in: vus.map((v) => v.id) }, numeroDia: dia, concluido: true },
    });
  }
  resumo.logins = ctx.contador.logins;
  resumo.requisicoes = ctx.contador.requisicoes;
  resumo.duracaoS = Math.round((Date.now() - inicio.getTime()) / 1000);
  log(linhaDoResumo(resumo, desafio.slug));
  await ctx.redis
    .set(
      CHAVE_ULTIMA_RODADA,
      JSON.stringify({ slug: desafio.slug, ...resumo }),
      'EX',
      7 * 24 * 60 * 60,
    )
    .catch(() => undefined);
  return resumo;
}

/** Gera a foto de prova do VU e envia pelo fluxo do app (também usada pelo smoke da turma). */
export async function enviarFoto(
  cliente: ClienteVu,
  slug: string,
  dia: number,
  tipo: TipoFoto,
  timezone: string,
): Promise<void> {
  const agora = new Date();
  const rodape = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(agora)
    .replace(',', '');
  const jpeg = await gerarFotoJpeg({
    rotuloVu: rotuloVu(cliente.vu.numero),
    numeroDia: dia,
    tipo,
    rodape,
  });
  await cliente.enviarFoto(slug, dia, tipo, jpeg);
}

/** Roda `rodada` a cada `intervaloMin` minutos até receber SIGTERM/SIGINT. */
export async function loop(ctx: Contexto, op: OpcoesRodada): Promise<void> {
  let parar = false;
  let acordar: (() => void) | null = null;
  const aoSinal = (sinal: string): void => {
    if (!parar) ctx.log(`Recebi ${sinal}; encerrando depois do VU atual.`);
    parar = true;
    acordar?.();
  };
  process.on('SIGTERM', () => aoSinal('SIGTERM'));
  process.on('SIGINT', () => aoSinal('SIGINT'));

  const intervaloMs = op.intervaloMin * 60_000;
  ctx.log(
    `Simulador de VUs: uma rodada a cada ${op.intervaloMin} min no desafio "${op.slug}" ` +
      `(API ${ctx.config.baseUrl}, até ${ctx.config.maxRpm} req/min).`,
  );
  while (!parar) {
    const inicio = Date.now();
    try {
      await rodada(ctx, op, () => parar);
    } catch (e) {
      ctx.log(`✖ A rodada falhou: ${mensagem(e)}`);
    }
    if (parar) break;
    const espera = Math.max(5_000, intervaloMs - (Date.now() - inicio));
    await new Promise<void>((resolve) => {
      const t = setTimeout(resolve, espera);
      acordar = () => {
        clearTimeout(t);
        resolve();
      };
    });
    acordar = null;
  }
  ctx.log('Simulador encerrado.');
}
