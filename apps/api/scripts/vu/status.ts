// `status`: resumo dos VUs direto do banco (não chama a API nem o Firebase).
import { calcularDiaAtual } from '@everest/shared';
import { CHAVE_ULTIMA_RODADA, DOMINIO_VU, numeroDoEmail } from './config';
import type { Contexto } from './contexto';
import { PERSONAS, type Persona, estaAtivoNoDia, horarioNoFuso, perfilDoVu } from './personas';
import { type ResumoRodada, linhaDoResumo } from './rodada';

export async function status(ctx: Contexto, slug: string): Promise<void> {
  const { prisma, log } = ctx;
  const agora = new Date();
  const usuariosVu = (
    await prisma.usuario.findMany({
      where: { email: { endsWith: `@${DOMINIO_VU}` } },
      select: { id: true, email: true, firebaseUid: true },
    })
  ).filter((u) => numeroDoEmail(u.email) !== null);

  const desafio = await prisma.desafio.findUnique({ where: { slug } });
  if (!desafio) {
    log(`Desafio "${slug}" não existe. Usuários VU no banco: ${usuariosVu.length}.`);
    return;
  }
  const tempo = calcularDiaAtual(
    desafio.dataInicio.toISOString().slice(0, 10),
    agora,
    desafio.timezone,
    desafio.totalDias,
  );
  const { hora, minuto } = horarioNoFuso(agora, desafio.timezone);
  const dia = tempo.status === 'EM_ANDAMENTO' ? tempo.numeroDia : null;
  const relogio = `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
  log(
    `Desafio "${desafio.slug}" (${desafio.ativo ? 'ativo' : 'INATIVO'}) · ${tempo.status}` +
      `${dia ? ` · dia ${dia}/${desafio.totalDias}` : ''} · ${relogio} em ${desafio.timezone}`,
  );

  const participantes = await prisma.participante.findMany({
    where: { desafioId: desafio.id },
    select: { id: true, pagamentoStatus: true, usuario: { select: { email: true } } },
  });
  const vus = participantes.filter((p) => numeroDoEmail(p.usuario.email) !== null);
  const outros = participantes.length - vus.length;
  log(
    `Participantes: ${participantes.length} (${vus.length} VUs, ${outros} pessoas de verdade) · ` +
      `${desafio.totalVagas} vagas · usuários VU no banco: ${usuariosVu.length}`,
  );
  if (vus.length === 0) {
    log('Nenhum VU inscrito. Rode: preparar --desafio ' + slug + ' --quantidade 30');
    return;
  }

  const personas = Object.fromEntries(PERSONAS.map((p) => [p, 0])) as Record<Persona, number>;
  let parados = 0;
  for (const v of vus) {
    const perfil = perfilDoVu(v.usuario.email);
    personas[perfil.persona]++;
    if (dia !== null && !estaAtivoNoDia(perfil, dia)) parados++;
  }
  log(
    `Personas: dedicado ${personas.DEDICADO}, regular ${personas.REGULAR}, irregular ${personas.IRREGULAR}, ` +
      `desistente ${personas.DESISTENTE} (${parados} já desistiram)`,
  );

  const pagamento = { PENDENTE: 0, INFORMADO: 0, CONFIRMADO: 0 };
  for (const v of vus) pagamento[v.pagamentoStatus]++;
  log(
    `Pagamento: CONFIRMADO ${pagamento.CONFIRMADO}, INFORMADO ${pagamento.INFORMADO} (fila do painel), ` +
      `PENDENTE ${pagamento.PENDENTE}`,
  );

  const ids = vus.map((v) => v.id);
  if (dia !== null) {
    const hoje = await prisma.diaDesafio.findMany({
      where: { participanteId: { in: ids }, numeroDia: dia },
      select: {
        concluido: true,
        aguaMl: true,
        exercicio: true,
        paginasLidas: true,
        storyPostado: true,
        fotos: { select: { status: true } },
      },
    });
    const fotos = hoje.flatMap((d) => d.fotos);
    const contar = (f: (d: (typeof hoje)[number]) => boolean): number => hoje.filter(f).length;
    log(
      `Hoje (dia ${dia}): ${hoje.length} com check-in, ${contar((d) => d.concluido)} concluídos · ` +
        `água ≥ 3 L ${contar((d) => d.aguaMl >= 3000)}, exercício ${contar((d) => d.exercicio)}, ` +
        `leitura ≥ 10 ${contar((d) => d.paginasLidas >= 10)}, story ${contar((d) => d.storyPostado)} · ` +
        `fotos: ${fotos.filter((f) => f.status === 'CONFIRMADA').length} confirmadas, ` +
        `${fotos.filter((f) => f.status === 'ENVIADA').length} processando, ` +
        `${fotos.filter((f) => f.status === 'PENDENTE').length} pendentes, ` +
        `${fotos.filter((f) => f.status === 'REJEITADA').length} rejeitadas`,
    );
  }
  const concluidos = await prisma.diaDesafio.count({
    where: { participanteId: { in: ids }, concluido: true },
  });
  const comCheckin = await prisma.diaDesafio.count({ where: { participanteId: { in: ids } } });
  log(`Total: ${comCheckin} dias com check-in, ${concluidos} concluídos.`);

  const bruto = await ctx.redis.get(CHAVE_ULTIMA_RODADA).catch(() => null);
  if (bruto) {
    try {
      const r = JSON.parse(bruto) as ResumoRodada & { slug: string };
      const quando = new Date(r.inicio).toLocaleString('pt-BR', { timeZone: desafio.timezone });
      log(`Última rodada (${quando}): ${linhaDoResumo(r, r.slug)}`);
    } catch {
      // resumo antigo/ilegível: ignora
    }
  } else {
    log('Nenhuma rodada registrada ainda.');
  }
}
