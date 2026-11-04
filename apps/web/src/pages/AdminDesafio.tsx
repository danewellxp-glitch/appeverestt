import type { AdminDesafioConfig } from '@everest/shared';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router';
import { LinkNav } from '../components/layout/LinkNav';
import { useToast } from '../components/ui/Toast';
import { FormularioDesafio } from '../features/admin/desafio/FormularioDesafio';
import { ListaDesafios } from '../features/admin/desafio/ListaDesafios';
import { rotuloStatus } from '../features/admin/desafio/regras';
import { CLASSE_TOKENS_GRAFICO } from '../features/admin/graficos/base';
import { Medidor } from '../features/admin/graficos/Barras';
import { CLASSE_LINK_PRIMARIO, useContextoPainel } from '../features/admin/LayoutPainel';
import { formatarData } from '../lib/datas';

const CLASSE_TITULO = 'mt-1.5 text-[13px] font-semibold tracking-[0.14em] text-texto-2 uppercase';

/** Situação do desafio em números: status, período, vagas e inscritos. */
function ResumoDesafio({ d }: { d: AdminDesafioConfig }) {
  const itens = [
    { rotulo: 'Status', valor: rotuloStatus(d) },
    { rotulo: 'Período', valor: `${formatarData(d.dataInicio)} a ${formatarData(d.dataFim)}` },
    { rotulo: 'Inscritos', valor: String(d.totalInscritos) },
  ];
  return (
    <div
      className={`grid gap-3 rounded-3xl bg-superficie p-[18px] shadow-[inset_0_0_0_1px_var(--borda)] ${CLASSE_TOKENS_GRAFICO}`}
    >
      <dl className="grid gap-3 sm:grid-cols-3">
        {itens.map((i) => (
          <div key={i.rotulo} className="grid gap-0.5">
            <dt className="rotulo">{i.rotulo}</dt>
            <dd className="text-[15px] font-semibold">{i.valor}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-1.5">
        <p className="flex items-baseline justify-between gap-2 text-sm">
          <span className="rotulo">Vagas ocupadas</span>
          <span className="font-semibold tabular-nums">
            {d.vagasOcupadas}/{d.totalVagas}
          </span>
        </p>
        <Medidor valor={d.vagasOcupadas} maximo={d.totalVagas} rotulo="Vagas ocupadas" />
      </div>
    </div>
  );
}

/** /admin/desafio (aba Desafio): configuração do desafio ativo e a lista de todos os desafios. */
export default function AdminDesafio() {
  const { desafio, desafios } = useContextoPainel();
  const { toast } = useToast();
  const navegar = useNavigate();

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <section aria-labelledby="titulo-configuracao" className="flex min-w-0 flex-col gap-3">
        <h2 id="titulo-configuracao" className={CLASSE_TITULO}>
          Configuração
        </h2>
        <ResumoDesafio d={desafio} />
        <FormularioDesafio
          key={desafio.slug}
          desafio={desafio}
          ativoAtual={desafio}
          aoSalvar={(d) => {
            toast('Alterações salvas.');
            if (!d.ativo) void navegar('/admin', { replace: true });
          }}
        />
      </section>

      <section aria-labelledby="titulo-todos-desafios" className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="titulo-todos-desafios" className={CLASSE_TITULO}>
            Todos os desafios
          </h2>
          <LinkNav to="/admin/desafios/novo" className={CLASSE_LINK_PRIMARIO}>
            <Plus className="size-4" aria-hidden />
            Criar desafio
          </LinkNav>
        </div>
        <ListaDesafios desafios={desafios} />
      </section>
    </div>
  );
}
