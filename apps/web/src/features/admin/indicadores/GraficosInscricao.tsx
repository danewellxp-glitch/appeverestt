import type { AdminMetricas } from '@everest/shared';
import { useState } from 'react';
import { Segmentado } from '../../../components/ui/Segmentado';
import { formatarDataCurta, formatarDiaCurto } from '../../../lib/datas';
import { CartaoGrafico, Legenda, VazioGrafico } from '../graficos/base';
import { BarrasHorizontais } from '../graficos/Barras';
import { indiceDoMaior } from '../graficos/escalas';
import { formatarDuracaoHoras, formatarInteiro, formatarPct, plural } from '../graficos/formato';
import { GraficoColunas } from '../graficos/GraficoColunas';
import { GraficoLinhas } from '../graficos/GraficoLinhas';
import { etapasFunil, maiorQuedaFunil, serieInscricoes } from './derivar';

/** Funil de conversão: contas → cadastro completo → inscritos → avisaram → confirmados. */
export function CartaoFunil({ m }: { m: AdminMetricas }) {
  const etapas = etapasFunil(m.funil);
  const queda = maiorQuedaFunil(etapas);
  const final = etapas[etapas.length - 1];
  const horas = m.pagamentos.horasMediasAteConfirmar;
  return (
    <CartaoGrafico
      titulo="Funil de inscrição"
      descricao={
        m.funil.contas === 0
          ? 'Ainda não há contas no app.'
          : `${formatarPct(final?.pctTopo ?? null)} das contas viraram confirmados.${queda ? ` A maior perda é em “${queda.rotulo}” (${formatarPct(queda.pctAnterior)} da etapa anterior).` : ''}`
      }
      tabela={{
        colunas: ['Etapa', 'Pessoas', 'Da etapa anterior', 'Do topo'],
        linhas: etapas.map((e) => [
          e.rotulo,
          formatarInteiro(e.valor),
          formatarPct(e.pctAnterior),
          formatarPct(e.pctTopo),
        ]),
      }}
      nota={`Confirmados inclui o embaixador.${horas !== null ? ` Você confirma um Pix, em média, ${formatarDuracaoHoras(horas)} depois do aviso.` : ''}`}
    >
      <BarrasHorizontais
        rotulo="Etapas do funil"
        larguraRotulo="minmax(0,10.5rem)"
        empilharNoCelular
        itens={etapas.map((e, i) => ({
          chave: e.chave,
          rotulo: e.rotulo,
          detalhe: i > 0 ? `${formatarPct(e.pctAnterior)} da etapa anterior` : 'Topo do funil',
          valor: e.valor,
          texto: formatarInteiro(e.valor),
          cor: 'destaque',
        }))}
      />
    </CartaoGrafico>
  );
}

type Visao = 'dia' | 'acumulado';

const OPCOES_VISAO = [
  { valor: 'dia', rotulo: 'Por dia' },
  { valor: 'acumulado', rotulo: 'Acumulado' },
] as const;

/** Inscrições e confirmações por data, por dia (colunas) ou acumuladas (linhas, com o total de vagas). */
export function CartaoInscricoes({ m }: { m: AdminMetricas }) {
  const [visao, setVisao] = useState<Visao>('dia');
  const s = serieInscricoes(m.inscricoesPorData);
  const categorias = s.datas.map((d) => ({
    curto: formatarDataCurta(d),
    longo: formatarDiaCurto(d),
  }));
  const total = s.inscricoesAcumuladas.at(-1) ?? 0;
  const melhor = indiceDoMaior(s.inscricoes);
  const melhorData = s.datas[melhor];

  const vazio = s.datas.length === 0 || total === 0;
  return (
    <CartaoGrafico
      titulo="Inscrições por data"
      descricao={
        vazio
          ? undefined
          : `${plural(total, 'inscrição', 'inscrições')} em ${plural(s.datas.length, 'dia')}${melhorData ? `; o melhor dia foi ${formatarDiaCurto(melhorData)} (${s.inscricoes[melhor]})` : ''}.`
      }
      acao={
        vazio ? undefined : (
          <div className="w-full sm:w-56">
            <Segmentado
              opcoes={OPCOES_VISAO}
              valor={visao}
              aoMudar={setVisao}
              rotulo="Visão das inscrições"
            />
          </div>
        )
      }
      legenda={
        vazio ? undefined : (
          <Legenda
            itens={
              visao === 'dia'
                ? [
                    { nome: 'Inscrições', cor: 'neutro', forma: 'bloco' },
                    { nome: 'Confirmações', cor: 'destaque', forma: 'bloco' },
                  ]
                : [
                    { nome: 'Inscritos', cor: 'neutro', forma: 'linha' },
                    { nome: 'Confirmados', cor: 'destaque', forma: 'linha' },
                  ]
            }
          />
        )
      }
      tabela={
        vazio
          ? undefined
          : {
              colunas: [
                'Data',
                'Inscrições',
                'Confirmações',
                'Inscritos (acum.)',
                'Confirmados (acum.)',
              ],
              linhas: s.datas.map((d, i) => [
                formatarDiaCurto(d),
                s.inscricoes[i] ?? 0,
                s.confirmacoes[i] ?? 0,
                s.inscricoesAcumuladas[i] ?? 0,
                s.confirmacoesAcumuladas[i] ?? 0,
              ]),
            }
      }
    >
      {vazio ? (
        <VazioGrafico>Ninguém se inscreveu ainda. Compartilhe o link do desafio!</VazioGrafico>
      ) : visao === 'dia' ? (
        <GraficoColunas
          rotulo={`Inscrições e confirmações por data, de ${categorias[0]?.longo ?? ''} a ${categorias.at(-1)?.longo ?? ''}.`}
          categorias={categorias}
          series={[
            { nome: 'Inscrições', cor: 'neutro', valores: s.inscricoes },
            { nome: 'Confirmações', cor: 'destaque', valores: s.confirmacoes },
          ]}
        />
      ) : (
        <GraficoLinhas
          rotulo={`Inscritos e confirmados acumulados: ${s.inscricoesAcumuladas.at(-1) ?? 0} inscrições e ${s.confirmacoesAcumuladas.at(-1) ?? 0} confirmações, para ${m.desafio.totalVagas} vagas.`}
          categorias={categorias}
          series={[
            { nome: 'Inscritos', cor: 'neutro', valores: s.inscricoesAcumuladas },
            {
              nome: 'Confirmados',
              cor: 'destaque',
              valores: s.confirmacoesAcumuladas,
              rotuloFinal: true,
            },
          ]}
          referencia={{ valor: m.desafio.totalVagas, rotulo: `${m.desafio.totalVagas} vagas` }}
        />
      )}
    </CartaoGrafico>
  );
}
