import type { AdminMetricas } from '@everest/shared';
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  Camera,
  CircleAlert,
  Droplets,
  Dumbbell,
  Smartphone,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { LinkNav } from '../../../components/layout/LinkNav';
import { formatarDiaCurto } from '../../../lib/datas';
import { CartaoGrafico, Legenda, VazioGrafico } from '../graficos/base';
import { BarraSegmentada, BarrasHorizontais, Medidor } from '../graficos/Barras';
import { percentual } from '../graficos/escalas';
import {
  formatarCompacto,
  formatarDecimal,
  formatarHora,
  formatarInteiro,
  formatarPct,
  plural,
} from '../graficos/formato';
import { GraficoColunas } from '../graficos/GraficoColunas';
import { GraficoLinhas } from '../graficos/GraficoLinhas';
import {
  adesaoDoDia,
  checkinsPor24Horas,
  diaMaisRecente,
  distribuicaoNotas,
  horaDePico,
  mediaDiasConcluidos,
  requisitosPorDificuldade,
} from './derivar';

const TICKS_PCT = [0, 25, 50, 75, 100] as const;
const pct = (v: number) => formatarPct(v);

const CLASSE_LINK =
  'inline-flex min-h-11 items-center gap-1 self-start text-sm font-semibold underline decoration-vermelho underline-offset-4';

/** Adesão por dia: % dos ativos que abriram o dia e % que concluíram (um eixo só, 0–100%). */
export function CartaoAdesao({ m }: { m: AdminMetricas }) {
  const dias = m.adesaoPorDia;
  const hoje = adesaoDoDia(diaMaisRecente(m));
  const concluidos = dias.map((d) => percentual(d.concluidos, d.ativos) ?? 0);
  const comCheckin = dias.map((d) => percentual(d.comCheckin, d.ativos) ?? 0);
  // A média não conta o dia de hoje (ainda em andamento).
  const fechados = m.desafio.status === 'EM_ANDAMENTO' ? concluidos.slice(0, -1) : concluidos;
  const media = fechados.length > 0 ? fechados.reduce((s, v) => s + v, 0) / fechados.length : null;
  return (
    <CartaoGrafico
      titulo="Adesão por dia"
      descricao={
        hoje
          ? `${m.desafio.status === 'ENCERRADO' ? 'No último dia' : 'Hoje, até agora'}: ${formatarPct(hoje.pctConcluidos)} concluíram.${media !== null ? ` Média dos dias fechados: ${formatarPct(media)}.` : ''}`
          : undefined
      }
      legenda={
        <Legenda
          itens={[
            { nome: 'Abriram o dia', cor: 'neutro', forma: 'linha' },
            { nome: 'Concluíram', cor: 'destaque', forma: 'linha' },
          ]}
        />
      }
      tabela={{
        colunas: ['Dia', 'Ativos', 'Abriram', 'Concluíram', 'Invalidados', '% concluído'],
        linhas: dias.map((d, i) => [
          `Dia ${d.dia} (${formatarDiaCurto(d.data)})`,
          d.ativos,
          d.comCheckin,
          d.concluidos,
          d.invalidados,
          formatarPct(concluidos[i] ?? null),
        ]),
      }}
      nota="Percentual dos participantes ativos (pagamento confirmado). O dia de hoje ainda está aberto."
    >
      <GraficoLinhas
        rotulo={`Adesão por dia, do dia 1 ao dia ${dias.at(-1)?.dia ?? 1}: ${hoje ? `${formatarPct(hoje.pctConcluidos)} concluíram no dia mais recente` : 'sem dados'}.`}
        categorias={dias.map((d) => ({
          curto: String(d.dia),
          longo: `Dia ${d.dia} · ${formatarDiaCurto(d.data)}`,
        }))}
        series={[
          { nome: 'Abriram o dia', cor: 'neutro', valores: comCheckin },
          { nome: 'Concluíram', cor: 'destaque', valores: concluidos, rotuloFinal: true },
        ]}
        formatar={pct}
        ticksY={TICKS_PCT}
      />
    </CartaoGrafico>
  );
}

/** Curva de sobrevivência: quantos seguem sem falhar nenhum dia, do dia 1 até hoje. */
export function CartaoInvictos({ m }: { m: AdminMetricas }) {
  const serie = m.invictosPorDia;
  const ativos = (dia: number) => m.adesaoPorDia.find((d) => d.dia === dia)?.ativos ?? 0;
  const ultimo = serie.at(-1);
  const primeiro = serie[0];
  return (
    <CartaoGrafico
      titulo="Invictos"
      descricao={
        ultimo
          ? `${plural(ultimo.participantes, 'pessoa segue', 'pessoas seguem')} sem falhar nenhum dia até o dia ${ultimo.dia}${primeiro && primeiro.participantes > 0 ? ` (${formatarPct(percentual(ultimo.participantes, primeiro.participantes))} de quem fechou o dia 1)` : ''}.`
          : undefined
      }
      tabela={{
        colunas: ['Dia', 'Invictos', '% dos ativos'],
        linhas: serie.map((d) => [
          `Dia ${d.dia}`,
          d.participantes,
          formatarPct(percentual(d.participantes, ativos(d.dia))),
        ]),
      }}
      nota="Invicto = concluiu todos os dias, do dia 1 até aquele dia."
    >
      <GraficoLinhas
        rotulo={`Invictos por dia: ${primeiro?.participantes ?? 0} no dia 1 e ${ultimo?.participantes ?? 0} no dia ${ultimo?.dia ?? 1}.`}
        categorias={serie.map((d) => ({ curto: String(d.dia), longo: `Dia ${d.dia}` }))}
        series={[
          {
            nome: 'Invictos',
            cor: 'destaque',
            valores: serie.map((d) => d.participantes),
            area: true,
            rotuloFinal: true,
          },
        ]}
      />
    </CartaoGrafico>
  );
}

/** "Qual hábito é mais difícil": % dos check-ins que cumpriram cada requisito, o mais difícil em destaque. */
export function CartaoRequisitos({ m }: { m: AdminMetricas }) {
  const lista = requisitosPorDificuldade(m.requisitos);
  const maisDificil = lista[0];
  const semDados = lista.every((r) => r.total === 0);
  return (
    <CartaoGrafico
      titulo="Qual hábito é mais difícil"
      descricao={
        semDados || !maisDificil
          ? undefined
          : `${maisDificil.rotulo} é o menos cumprido: ${formatarPct(maisDificil.pct)} dos check-ins.`
      }
      nota="Percentual dos dias abertos (não invalidados) que cumpriram cada requisito."
    >
      {semDados ? (
        <VazioGrafico>Nenhum check-in ainda.</VazioGrafico>
      ) : (
        <BarrasHorizontais
          rotulo="Requisitos cumpridos, do mais difícil para o mais fácil"
          maximo={100}
          larguraRotulo="minmax(0,7rem)"
          empilharNoCelular
          itens={lista.map((r, i) => ({
            chave: r.requisito,
            rotulo: r.rotulo,
            detalhe: `${formatarInteiro(r.cumpridos)} de ${formatarInteiro(r.total)}`,
            valor: r.pct ?? 0,
            texto: formatarPct(r.pct),
            cor: i === 0 ? 'destaque' : 'neutro',
          }))}
        />
      )}
    </CartaoGrafico>
  );
}

/** Histograma: quantos participantes têm 0, 1, 2… dias concluídos. */
export function CartaoDistribuicao({ m }: { m: AdminMetricas }) {
  const lista = m.distribuicaoDiasConcluidos;
  const media = mediaDiasConcluidos(lista);
  const zerados = lista.find((d) => d.dias === 0)?.participantes ?? 0;
  const total = lista.reduce((s, d) => s + d.participantes, 0);
  return (
    <CartaoGrafico
      titulo="Dias concluídos por pessoa"
      descricao={
        total === 0
          ? undefined
          : `Média de ${media !== null ? formatarDecimal(media) : '—'} dias por pessoa.${zerados > 0 ? ` ${plural(zerados, 'pessoa ainda não concluiu', 'pessoas ainda não concluíram')} nenhum dia.` : ''}`
      }
      tabela={{
        colunas: ['Dias concluídos', 'Participantes'],
        linhas: lista.map((d) => [plural(d.dias, 'dia'), d.participantes]),
      }}
    >
      {total === 0 ? (
        <VazioGrafico>Sem participantes ativos.</VazioGrafico>
      ) : (
        <GraficoColunas
          rotulo={`Distribuição de dias concluídos entre ${plural(total, 'participante ativo', 'participantes ativos')}.`}
          categorias={lista.map((d) => ({
            curto: String(d.dias),
            longo: plural(d.dias, 'dia concluído', 'dias concluídos'),
          }))}
          series={[
            { nome: 'Participantes', cor: 'destaque', valores: lista.map((d) => d.participantes) },
          ]}
        />
      )}
    </CartaoGrafico>
  );
}

/** Horário dos check-ins (24 colunas, a hora de pico em destaque). */
export function CartaoHorario({ m }: { m: AdminMetricas }) {
  const horas = checkinsPor24Horas(m.checkinsPorHora);
  const pico = horaDePico(m.checkinsPorHora);
  return (
    <CartaoGrafico
      titulo="Horário dos check-ins"
      descricao={
        pico
          ? `O pico é entre ${formatarHora(pico.hora)} e ${formatarHora((pico.hora + 1) % 24)} (${formatarPct(pico.pct)} dos check-ins). Um bom momento para lembrar o grupo é logo antes.`
          : undefined
      }
      tabela={{
        colunas: ['Hora', 'Check-ins'],
        linhas: horas.map((v, h) => [`${formatarHora(h)}–${formatarHora((h + 1) % 24)}`, v]),
      }}
      nota="Hora da última atualização de cada check-in, no horário de Brasília."
    >
      {!pico ? (
        <VazioGrafico>Nenhum check-in ainda.</VazioGrafico>
      ) : (
        <GraficoColunas
          rotulo={`Check-ins por hora do dia; pico às ${formatarHora(pico.hora)}.`}
          categorias={horas.map((_, h) => ({
            curto: formatarHora(h),
            longo: `${formatarHora(h)}–${formatarHora((h + 1) % 24)}`,
          }))}
          series={[{ nome: 'Check-ins', cor: 'neutro', valores: horas }]}
          corDaColuna={(h) => (h === pico.hora ? 'destaque' : 'neutro')}
          indicesRotulo={[0, 6, 12, 18, 23]}
        />
      )}
    </CartaoGrafico>
  );
}

/** Conferência: dos dias concluídos, quantos você já aprovou e quantos esperam; e os invalidados. */
export function CartaoConferencia({ m }: { m: AdminMetricas }) {
  const c = m.conferencia;
  const numeros: { rotulo: string; valor: number; icone?: LucideIcon }[] = [
    { rotulo: 'Concluídos', valor: c.concluidos },
    { rotulo: 'Conferidos', valor: c.conferidos },
    { rotulo: 'Aguardando', valor: c.aguardando },
    { rotulo: 'Invalidados', valor: c.invalidados, icone: CircleAlert },
  ];
  return (
    <CartaoGrafico
      titulo="Conferência dos dias"
      descricao={
        c.concluidos > 0
          ? `${formatarPct(percentual(c.conferidos, c.concluidos))} dos dias concluídos já foram conferidos por você.`
          : 'Nenhum dia concluído ainda.'
      }
    >
      <BarraSegmentada
        rotulo="Dias concluídos por situação da conferência"
        descrever={(v) => plural(v, 'dia')}
        partes={[
          { chave: 'conferidos', nome: 'Conferidos', valor: c.conferidos, cor: 'destaque' },
          {
            chave: 'aguardando',
            nome: 'Aguardando conferência',
            valor: c.aguardando,
            cor: 'alerta',
          },
        ]}
      />
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {numeros.map(({ rotulo, valor, icone: Icone }) => (
          <div key={rotulo} className="rounded-2xl bg-superficie-2 px-3 py-2.5">
            <dt className="rotulo flex items-center gap-1">
              {Icone && <Icone className="size-3.5 text-vermelho-texto" aria-hidden />}
              {rotulo}
            </dt>
            <dd className="text-lg font-bold tabular-nums">{formatarInteiro(valor)}</dd>
          </div>
        ))}
      </dl>
      {c.aguardando > 0 && (
        <LinkNav to="/admin/participantes" direcao="aba" className={CLASSE_LINK}>
          Conferir os {plural(c.aguardando, 'dia')} na lista
          <ArrowRight className="size-4" aria-hidden />
        </LinkNav>
      )}
    </CartaoGrafico>
  );
}

/** Totais de impacto do grupo (números, não gráfico). */
export function CartaoImpacto({ m }: { m: AdminMetricas }) {
  const t = m.totais;
  const itens: { rotulo: string; valor: string; Icone: LucideIcon }[] = [
    {
      rotulo: 'Litros de água',
      valor: formatarCompacto(Math.round(t.aguaLitros)),
      Icone: Droplets,
    },
    { rotulo: 'Páginas lidas', valor: formatarCompacto(t.paginasLidas), Icone: BookOpen },
    { rotulo: 'Treinos', valor: formatarCompacto(t.treinos), Icone: Dumbbell },
    { rotulo: 'Stories', valor: formatarCompacto(t.stories), Icone: Smartphone },
    { rotulo: 'Fotos', valor: formatarCompacto(t.fotos), Icone: Camera },
    { rotulo: 'Dias concluídos', valor: formatarCompacto(t.diasConcluidos), Icone: CalendarCheck },
  ];
  return (
    <section
      aria-labelledby="titulo-impacto"
      className="grid gap-3 rounded-3xl bg-superficie p-[18px] shadow-[inset_0_0_0_1px_var(--borda)]"
    >
      <div className="grid gap-0.5">
        <h3 id="titulo-impacto" className="text-[17px] leading-tight font-bold">
          Impacto do grupo
        </h3>
        <p className="text-sm text-texto-2">
          Somando todos os dias válidos. Bom material para o Instagram.
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {itens.map(({ rotulo, valor, Icone }) => (
          <div key={rotulo} className="grid gap-1 rounded-2xl bg-superficie-2 px-3 py-3">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-texto-2">
              <Icone className="size-4 text-vermelho-texto" aria-hidden />
              {rotulo}
            </dt>
            <dd className="font-display text-[28px] leading-none font-extrabold">{valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Perfil dos inscritos: faixas etárias, cidades e consentimento de marketing. */
export function CartaoPerfil({ m }: { m: AdminMetricas }) {
  const p = m.perfil;
  const pctMarketing = percentual(p.aceitaramMarketing, p.total);
  const cidade = (c: AdminMetricas['perfil']['cidades'][number]) =>
    c.uf ? `${c.cidade}/${c.uf}` : c.cidade;
  return (
    <CartaoGrafico
      titulo="Perfil dos inscritos"
      descricao={p.total > 0 ? `${plural(p.total, 'inscrito')} (ativos e pendentes).` : undefined}
    >
      {p.total === 0 ? (
        <VazioGrafico>Ninguém inscrito ainda.</VazioGrafico>
      ) : (
        <div className="grid gap-5">
          <div className="grid gap-2.5">
            <h4 className="rotulo">Faixa etária</h4>
            <BarrasHorizontais
              rotulo="Inscritos por faixa etária"
              larguraRotulo="minmax(0,5rem)"
              itens={p.faixasEtarias.map((f) => ({
                chave: f.faixa,
                rotulo: f.faixa,
                valor: f.participantes,
                texto: `${f.participantes} · ${formatarPct(percentual(f.participantes, p.total))}`,
                cor: f.faixa === 'Sem data' ? 'neutro' : 'destaque',
              }))}
            />
          </div>
          <div className="grid gap-2.5">
            <h4 className="rotulo">Cidades</h4>
            {p.cidades.length === 0 ? (
              <p className="text-sm text-texto-2">Sem cidade informada.</p>
            ) : (
              <BarrasHorizontais
                rotulo="Inscritos por cidade (as 10 com mais gente)"
                itens={p.cidades.map((c) => ({
                  chave: cidade(c),
                  rotulo: cidade(c),
                  valor: c.participantes,
                  texto: formatarInteiro(c.participantes),
                  cor: 'destaque',
                }))}
              />
            )}
          </div>
          <div className="grid gap-2">
            <h4 className="rotulo">Aceitaram novidades por e-mail/WhatsApp</h4>
            <p className="flex items-baseline gap-2">
              <span className="font-display text-[28px] leading-none font-extrabold">
                {formatarPct(pctMarketing)}
              </span>
              <span className="text-sm text-texto-2">
                {p.aceitaramMarketing} de {p.total}
              </span>
            </p>
            <Medidor
              valor={p.aceitaramMarketing}
              maximo={p.total}
              rotulo="Inscritos que aceitaram receber novidades"
            />
          </div>
        </div>
      )}
    </CartaoGrafico>
  );
}

/** Feedback: distribuição das notas (5 a 1), média e quantos autorizam a divulgação. */
export function CartaoFeedback({ m }: { m: AdminMetricas }) {
  const f = m.feedback;
  const notas = distribuicaoNotas(f.distribuicao);
  return (
    <CartaoGrafico
      titulo="Feedback"
      descricao={
        f.respostas > 0
          ? `Média ${f.notaMedia !== null ? formatarDecimal(f.notaMedia) : '—'} de 5 em ${plural(f.respostas, 'resposta')}; ${plural(f.autorizamDivulgacao, 'autorizou', 'autorizaram')} divulgar.`
          : undefined
      }
    >
      {f.respostas === 0 ? (
        <VazioGrafico>
          Ainda ninguém respondeu. O convite para o feedback aparece para os participantes nos
          últimos dias do desafio.
        </VazioGrafico>
      ) : (
        <BarrasHorizontais
          rotulo="Respostas por nota"
          larguraRotulo="minmax(0,5.5rem)"
          itens={notas.map((n) => ({
            chave: String(n.nota),
            rotulo: `${n.nota} ${n.nota === 1 ? 'estrela' : 'estrelas'}`,
            valor: n.respostas,
            texto: `${n.respostas} · ${formatarPct(percentual(n.respostas, f.respostas))}`,
            cor: 'destaque',
          }))}
        />
      )}
      <LinkNav to="/admin/feedbacks" className={CLASSE_LINK}>
        <Star className="size-4" aria-hidden />
        Ler os feedbacks
      </LinkNav>
    </CartaoGrafico>
  );
}
