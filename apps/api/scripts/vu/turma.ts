// `turma`: smoke de uma vez só do hub da turma (R23) com os VUs pagos do desafio, cada um com a sua
// sessão de verdade (o mesmo login da rodada). Cada check imprime uma linha "ok/FALHOU ..."; no fim,
// a tabela de latência e exit code 1 se algo falhou. Desfaz o que muda (visibilidade, cutucadas).
import {
  type CutucadaResposta,
  type DiaDetalhe,
  METAS,
  type MeResposta,
  type PoseDiaResposta,
  TIPOS_FOTO,
  type TreinosTurmaResposta,
  type TurmaHojeResposta,
  type UsuarioMe,
  calcularDiaAtual,
} from '@everest/shared';
import { ClienteVu, type Medicao, type RespostaApi, estadoDoDetalhe } from './cliente';
import { DOMINIO_VU, numeroDoEmail, rotuloVu } from './config';
import { type Contexto, travarRodada } from './contexto';
import { ErroHttp } from './http';
import { enviarFoto } from './rodada';
import {
  type CandidatoTurma,
  type Esperado,
  MINIMO_VUS_TURMA,
  OK_200,
  type PapeisTurma,
  type ResultadoCheck,
  confere,
  descreverEsperado,
  escolherPapeis,
  linhaCheck,
  perfilDoMe,
  tabelaResumo,
} from './verificacao';

export interface OpcoesTurma {
  slug: string;
  /** Usa só os N primeiros VUs pagos (padrão: todos). */
  maxVus?: number;
}

interface VuTurma extends CandidatoTurma {
  cliente: ClienteVu;
  rotulo: string;
  me: UsuarioMe;
  detalhe: DiaDetalhe;
  minhasCutucadasHoje: string[];
}

const STATUS_FOTO_VALIDOS = new Set(['ENVIADA', 'CONFIRMADA']);

function mensagem(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function temTreino(d: DiaDetalhe): boolean {
  return d.fotos.some((f) => f.tipo === 'EXERCICIO' && STATUS_FOTO_VALIDOS.has(f.status));
}

class Smoke {
  readonly medicoes: Medicao[] = [];
  checks = 0;
  falhas = 0;

  constructor(private readonly ctx: Contexto) {}

  cliente(numero: number, email: string, nome: string): ClienteVu {
    const c = new ClienteVu(this.ctx, { numero, email, nome });
    c.observar = (m) => this.medicoes.push(m);
    return c;
  }

  private registrar(r: ResultadoCheck): boolean {
    this.checks++;
    if (!r.ok) this.falhas++;
    this.ctx.log(linhaCheck(r));
    return r.ok;
  }

  private falhaLancada(descricao: string, inicio: number, e: unknown): void {
    this.registrar({
      ok: false,
      descricao,
      status: e instanceof ErroHttp ? e.status : 0,
      codigo: e instanceof ErroHttp ? e.codigo : null,
      ms: Math.round(performance.now() - inicio),
      motivo: mensagem(e),
    });
  }

  /**
   * Uma chamada à API conferida contra o esperado (status e `codigo`) e, em 2xx, contra `validar`
   * (devolve o motivo da falha ou null). Devolve os dados do 2xx (mesmo se a validação falhou).
   */
  async api<T>(
    descricao: string,
    esperado: Esperado,
    chamada: () => Promise<RespostaApi<T>>,
    validar?: (dados: T) => string | null,
  ): Promise<T | null> {
    const inicio = performance.now();
    let r: RespostaApi<T>;
    try {
      r = await chamada();
    } catch (e) {
      this.falhaLancada(descricao, inicio, e);
      return null;
    }
    let ok = confere(esperado, r.status, r.codigo);
    let motivo: string | undefined;
    if (!ok) {
      motivo = `esperado ${descreverEsperado(esperado)}${r.erro?.detalhe ? `: ${r.erro.detalhe}` : ''}`;
    } else if (validar && r.dados !== null) {
      const m = validar(r.dados);
      if (m) {
        ok = false;
        motivo = m;
      }
    }
    this.registrar({ ok, descricao, status: r.status, codigo: r.codigo, ms: r.ms, motivo });
    return r.dados;
  }

  /** Passo composto (ex.: upload de foto em 3 chamadas): ok se não lançar; ms = duração total. */
  async passo(descricao: string, fn: () => Promise<void>): Promise<boolean> {
    const inicio = performance.now();
    try {
      await fn();
    } catch (e) {
      this.falhaLancada(descricao, inicio, e);
      return false;
    }
    return this.registrar({
      ok: true,
      descricao,
      status: 200,
      codigo: null,
      ms: Math.round(performance.now() - inicio),
    });
  }

  /** Para quando não dá para continuar (ex.: faltam VUs): conta como falha. */
  falhar(descricao: string, motivo: string): void {
    this.registrar({ ok: false, descricao, status: 0, codigo: null, ms: 0, motivo });
  }
}

export async function turma(ctx: Contexto, op: OpcoesTurma): Promise<void> {
  // Mesma trava da rodada: o loop não mexe nos VUs no meio do smoke.
  const trava = await travarRodada(ctx, 30 * 60, 5 * 60_000);
  if (!trava) {
    throw new Error('Uma rodada (ou um limpar) não terminou em 5 min. Tente de novo em seguida.');
  }
  try {
    await executar(ctx, op);
  } finally {
    await trava.liberar();
  }
}

async function executar(ctx: Contexto, op: OpcoesTurma): Promise<void> {
  const { prisma, log } = ctx;
  const inicio = Date.now();
  const desafio = await prisma.desafio.findUnique({ where: { slug: op.slug } });
  if (!desafio) throw new Error(`O desafio "${op.slug}" não existe.`);
  const tempo = calcularDiaAtual(
    desafio.dataInicio.toISOString().slice(0, 10),
    new Date(),
    desafio.timezone,
    desafio.totalDias,
  );
  const dia = tempo.numeroDia;
  if (tempo.status !== 'EM_ANDAMENTO' || dia === null) {
    throw new Error(
      `O desafio "${op.slug}" está ${tempo.status}: o smoke da turma só roda com o desafio EM_ANDAMENTO ` +
        '(cutucadas, pose e treinos são do dia atual).',
    );
  }
  const slug = desafio.slug;
  const base = `desafios/${slug}`;

  const pagos = (
    await prisma.participante.findMany({
      where: {
        desafioId: desafio.id,
        pagamentoStatus: 'CONFIRMADO',
        usuario: { email: { endsWith: `@${DOMINIO_VU}` }, excluidoEm: null },
      },
      select: { id: true, usuario: { select: { email: true, nome: true } } },
    })
  )
    .map((p) => ({ ...p, numero: numeroDoEmail(p.usuario.email) }))
    .filter((p): p is typeof p & { numero: number } => p.numero !== null)
    .sort((a, b) => a.numero - b.numero)
    .slice(0, op.maxVus ?? Number.MAX_SAFE_INTEGER);
  if (pagos.length < MINIMO_VUS_TURMA) {
    throw new Error(
      `São precisos pelo menos ${MINIMO_VUS_TURMA} VUs com pagamento confirmado em "${slug}" (há ${pagos.length}). ` +
        'Rode preparar (ou confirme pagamentos no painel).',
    );
  }
  log(
    `Smoke da turma em "${slug}" · dia ${dia}/${desafio.totalDias} · ${pagos.length} VUs pagos · ` +
      `API ${ctx.config.baseUrl} (até ${ctx.config.maxRpm} req/min)`,
  );

  const s = new Smoke(ctx);

  // 1) Cada VU abre a aba Hoje, o próprio perfil e o dia (o estado decide os papéis).
  const vus: VuTurma[] = [];
  for (const p of pagos) {
    const cliente = s.cliente(p.numero, p.usuario.email, p.usuario.nome);
    const rotulo = `VU ${rotuloVu(p.numero)}`;
    const me = await s.api(
      `${rotulo} GET auth/me`,
      OK_200,
      () => cliente.chamar<MeResposta>('GET', 'auth/me', 'GET auth/me'),
      (d) => (d.usuario.email === p.usuario.email ? null : `e-mail ${d.usuario.email}`),
    );
    const hoje = await s.api(
      `${rotulo} GET turma/hoje`,
      OK_200,
      () => cliente.chamar<TurmaHojeResposta>('GET', `${base}/turma/hoje`, 'GET turma/hoje'),
      (d) =>
        d.diaAtual === dia && d.status === 'EM_ANDAMENTO'
          ? null
          : `diaAtual ${d.diaAtual} / ${d.status} (esperado ${dia} / EM_ANDAMENTO)`,
    );
    const detalhe = await s.api(`${rotulo} GET dias/${dia}`, OK_200, () =>
      cliente.chamar<DiaDetalhe>('GET', `${base}/dias/${dia}`, `GET dias/${dia}`),
    );
    if (!me || !hoje || !detalhe) continue;
    vus.push({
      numero: p.numero,
      participanteId: p.id,
      concluido: detalhe.concluido && !detalhe.invalidado,
      temTreino: temTreino(detalhe),
      aceitaCutucadas: me.usuario.aceitaCutucadas,
      cliente,
      rotulo,
      me: me.usuario,
      detalhe,
      minhasCutucadasHoje: hoje.minhasCutucadasHoje,
    });
  }

  let papeis: PapeisTurma<VuTurma> | null = null;
  try {
    papeis = escolherPapeis(vus);
  } catch (e) {
    s.falhar('escolher os papéis dos VUs', mensagem(e));
  }

  if (papeis) {
    const { a, b, c, d, e } = papeis;
    log(
      `Papéis: A=${a.rotulo} e B=${b.rotulo} fecham o dia · C=${c.rotulo} sem treino · ` +
        `D=${d.rotulo} desliga as cutucadas · E=${e.rotulo} cutuca`,
    );

    // 2) A e B fecham o dia inteiro (check-in + as 3 fotos, inclusive a do treino).
    for (const v of [a, b]) await fecharDia(s, v, slug, dia, desafio.timezone);

    // 3) Pose do dia: A sugere (200), B tenta (409), C sem treino tenta (403).
    const treinosA = await s.api(
      `${a.rotulo} GET turma/treinos`,
      OK_200,
      () =>
        a.cliente.chamar<TreinosTurmaResposta>('GET', `${base}/turma/treinos`, 'GET turma/treinos'),
      (t) =>
        t.pose === null && !t.possoSugerirPose
          ? 'possoSugerirPose=false com o treino enviado'
          : null,
    );
    const poseExistia = treinosA?.pose != null;
    const texto = `Smoke ${a.rotulo}: prancha segurando o livro`;
    await s.api(
      `${a.rotulo} POST turma/pose${poseExistia ? ' (pose já definida antes do smoke)' : ''}`,
      poseExistia ? { status: 409, codigo: 'POSE_JA_DEFINIDA' } : OK_200,
      () =>
        a.cliente.chamar<PoseDiaResposta>('POST', `${base}/turma/pose`, 'POST turma/pose', {
          texto,
        }),
      (r) => (r.pose.texto === texto ? null : `pose "${r.pose.texto}"`),
    );
    await s.api(
      `${b.rotulo} POST turma/pose depois da A`,
      { status: 409, codigo: 'POSE_JA_DEFINIDA' },
      () =>
        b.cliente.chamar('POST', `${base}/turma/pose`, 'POST turma/pose', {
          texto: `Smoke ${b.rotulo}`,
        }),
    );
    await s.api(
      `${c.rotulo} GET turma/treinos (sem treino)`,
      OK_200,
      () =>
        c.cliente.chamar<TreinosTurmaResposta>('GET', `${base}/turma/treinos`, 'GET turma/treinos'),
      (t) => (t.possoSugerirPose ? 'possoSugerirPose=true sem a foto do treino' : null),
    );
    await s.api(
      `${c.rotulo} POST turma/pose sem treino`,
      { status: 403, codigo: 'POSE_SEM_TREINO' },
      () =>
        c.cliente.chamar('POST', `${base}/turma/pose`, 'POST turma/pose', {
          texto: `Smoke ${c.rotulo}`,
        }),
    );

    // 4) B esconde a foto do treino: some para D; depois mostra de novo.
    const visibilidade = (visivel: boolean) =>
      s.api(
        `${b.rotulo} PATCH fotos/EXERCICIO/visibilidade ${visivel}`,
        OK_200,
        () =>
          b.cliente.chamar<{ visivelTurma: boolean }>(
            'PATCH',
            `${base}/dias/${dia}/fotos/EXERCICIO/visibilidade`,
            'PATCH fotos/visibilidade',
            { visivel },
          ),
        (r) => (r.visivelTurma === visivel ? null : `visivelTurma=${r.visivelTurma}`),
      );
    const treinosDe = (
      quem: VuTurma,
      descricao: string,
      validar: (t: TreinosTurmaResposta) => string | null,
    ) =>
      s.api(
        `${quem.rotulo} GET turma/treinos ${descricao}`,
        OK_200,
        () =>
          quem.cliente.chamar<TreinosTurmaResposta>(
            'GET',
            `${base}/turma/treinos`,
            'GET turma/treinos',
          ),
        validar,
      );
    const listaB = (t: TreinosTurmaResposta): boolean =>
      t.fotos.some((f) => f.participanteId === b.participanteId);
    try {
      await visibilidade(false);
      await treinosDe(d, `(sem a foto escondida de ${b.rotulo})`, (t) =>
        listaB(t) ? `a foto de ${b.rotulo} ainda aparece` : null,
      );
    } finally {
      await visibilidade(true);
    }
    await treinosDe(d, `(com a foto de ${b.rotulo} de volta)`, (t) =>
      listaB(t) ? null : `a foto de ${b.rotulo} não aparece`,
    );

    // 5) Cutucadas: D desliga; E cutuca C (200), de novo (409), A que fechou (409) e D (409).
    const aceitar = (aceita: boolean) =>
      s.api(
        `${d.rotulo} PATCH me aceitaCutucadas=${aceita}`,
        OK_200,
        () => d.cliente.chamar<MeResposta>('PATCH', 'me', 'PATCH me', perfilDoMe(d.me, aceita)),
        (r) =>
          r.usuario.aceitaCutucadas === aceita
            ? null
            : `aceitaCutucadas=${r.usuario.aceitaCutucadas}`,
      );
    const cutucar = (alvo: VuTurma, descricao: string, esperado: Esperado) =>
      s.api(
        `${e.rotulo} POST cutucadas → ${alvo.rotulo} ${descricao}`,
        esperado,
        () =>
          e.cliente.chamar<CutucadaResposta>('POST', `${base}/cutucadas`, 'POST cutucadas', {
            participanteId: alvo.participanteId,
          }),
        (r) => (typeof r.entregue === 'boolean' ? null : 'sem `entregue`'),
      );
    const jaCutucou = e.minhasCutucadasHoje.includes(c.participanteId);
    const JA_CUTUCOU: Esperado = { status: 409, codigo: 'JA_CUTUCOU' };
    const RECUSADA: Esperado = { status: 409, codigo: 'CUTUCADA_RECUSADA' };
    try {
      await aceitar(false);
      await cutucar(
        c,
        jaCutucou ? '(já cutucado antes do smoke)' : '',
        jaCutucou ? JA_CUTUCOU : OK_200,
      );
      await cutucar(c, 'de novo', JA_CUTUCOU);
      await cutucar(a, '(já fechou o dia)', RECUSADA);
      await cutucar(d, '(desligou as cutucadas)', RECUSADA);
    } finally {
      await aceitar(true);
    }

    // 6) Todo mundo navega: treinos, hoje (A e B fecharam, C falta), ranking, feed, progresso e /me.
    for (const v of vus) {
      await treinosDe(v, '', (t) => (t.dia === dia ? null : `dia ${t.dia} (esperado ${dia})`));
      await s.api(
        `${v.rotulo} GET turma/hoje`,
        OK_200,
        () => v.cliente.chamar<TurmaHojeResposta>('GET', `${base}/turma/hoje`, 'GET turma/hoje'),
        (h) => {
          const fecharam = new Set(h.fecharam.map((x) => x.participanteId));
          const faltam = new Set(h.faltam.map((x) => x.participanteId));
          if (!fecharam.has(a.participanteId) || !fecharam.has(b.participanteId))
            return `${a.rotulo}/${b.rotulo} fora de "fecharam"`;
          if (!faltam.has(c.participanteId)) return `${c.rotulo} fora de "faltam"`;
          if (v === e && !h.minhasCutucadasHoje.includes(c.participanteId))
            return `minhasCutucadasHoje sem ${c.rotulo}`;
          return null;
        },
      );
      for (const onde of ['ranking', 'feed', 'meu-progresso'] as const) {
        await s.api(`${v.rotulo} GET ${onde}`, OK_200, () =>
          v.cliente.chamar('GET', `${base}/${onde}`, `GET ${onde}`),
        );
      }
      await s.api(
        `${v.rotulo} GET auth/me`,
        OK_200,
        () => v.cliente.chamar<MeResposta>('GET', 'auth/me', 'GET auth/me'),
        (m) =>
          m.usuario.aceitaCutucadas || v !== d ? null : 'aceitaCutucadas não voltou para true',
      );
    }
  }

  log('');
  log(
    tabelaResumo(s.medicoes, {
      checks: s.checks,
      falhas: s.falhas,
      requisicoesHttp: ctx.contador.requisicoes,
      logins: ctx.contador.logins,
      duracaoS: Math.round((Date.now() - inicio) / 1000),
    }),
  );
  log(s.falhas === 0 ? '✔ Smoke da turma ok.' : `✖ Smoke da turma: ${s.falhas} falha(s).`);
  if (s.falhas > 0) process.exitCode = 1;
}

/** Check-in completo (só o que falta) + as fotos que faltam; confere `concluido` no fim. */
async function fecharDia(
  s: Smoke,
  v: VuTurma,
  slug: string,
  dia: number,
  timezone: string,
): Promise<void> {
  const base = `desafios/${slug}`;
  const estado = estadoDoDetalhe(v.detalhe);
  const checkinOk =
    estado.aguaMl >= METAS.aguaMl &&
    estado.exercicio &&
    estado.paginasLidas >= METAS.paginas &&
    estado.storyPostado;
  if (!checkinOk) {
    await s.api(`${v.rotulo} PUT dias/${dia} (água, exercício, leitura e story)`, OK_200, () =>
      v.cliente.chamar<DiaDetalhe>('PUT', `${base}/dias/${dia}`, `PUT dias/${dia}`, {
        aguaMl: Math.max(estado.aguaMl, METAS.aguaMl),
        exercicio: true,
        paginasLidas: Math.max(estado.paginasLidas, METAS.paginas),
        storyPostado: true,
      }),
    );
  }
  for (const tipo of TIPOS_FOTO.filter((t) => !estado.fotosEnviadas.includes(t))) {
    await s.passo(`${v.rotulo} envia a foto ${tipo} (upload-url → storage → confirmar)`, () =>
      enviarFoto(v.cliente, slug, dia, tipo, timezone),
    );
  }
  const depois = await s.api(
    `${v.rotulo} GET dias/${dia} (dia fechado)`,
    OK_200,
    () => v.cliente.chamar<DiaDetalhe>('GET', `${base}/dias/${dia}`, `GET dias/${dia}`),
    (d) =>
      d.concluido && !d.invalidado
        ? null
        : `concluido=${d.concluido}, pendentes: ${d.requisitosPendentes.join(', ') || '-'}`,
  );
  if (depois) {
    v.detalhe = depois;
    v.concluido = depois.concluido && !depois.invalidado;
    v.temTreino = temTreino(depois);
  }
}
