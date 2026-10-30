import type { AdminParticipante, StatusPagamento } from '@everest/shared';
import { ChevronRight, Search } from 'lucide-react';
import { useDeferredValue, useId, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Avatar } from '../../components/ui/Avatar';
import { Segmentado } from '../../components/ui/Segmentado';
import { marcarDirecao } from '../../lib/transicoes';
import { SeloEmbaixador } from '../ranking/TabelaRanking';
import { PilulaPagamento } from './PilulaPagamento';

type FiltroPagamento = 'TODOS' | StatusPagamento;

const OPCOES_FILTRO = [
  { valor: 'TODOS', rotulo: 'Todos' },
  { valor: 'INFORMADO', rotulo: 'A confirmar' },
  { valor: 'PENDENTE', rotulo: 'Pendentes' },
  { valor: 'CONFIRMADO', rotulo: 'Confirmados' },
] as const satisfies readonly { valor: FiltroPagamento; rotulo: string }[];

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

/** Quem tem mais itens para revisar primeiro; depois mais dias concluídos; depois a vaga. */
export function ordenarParaRevisao(lista: readonly AdminParticipante[]): AdminParticipante[] {
  return [...lista].sort(
    (a, b) =>
      b.paraRevisar - a.paraRevisar ||
      b.diasConcluidos - a.diasConcluidos ||
      (a.vagaNumero ?? 0) - (b.vagaNumero ?? 0),
  );
}

/** Lista de participantes (admin) com filtro de pagamento e busca sem acento por nome ou e-mail. */
export function ListaParticipantes({ participantes }: { participantes: AdminParticipante[] }) {
  const idBusca = useId();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroPagamento>('TODOS');
  const buscaAdiada = useDeferredValue(busca);

  const filtrados = useMemo(() => {
    const termo = normalizar(buscaAdiada);
    const ordenados = ordenarParaRevisao(participantes).filter(
      (p) => filtro === 'TODOS' || p.pagamentoStatus === filtro,
    );
    if (!termo) return ordenados;
    // Conta excluída: a API devolve um e-mail técnico (removido+…@everest.invalid), que não entra na busca.
    return ordenados.filter(
      (p) => normalizar(p.nome).includes(termo) || (!p.contaExcluida && normalizar(p.email).includes(termo)),
    );
  }, [participantes, buscaAdiada, filtro]);
  const filtrando = busca.trim() !== '' || filtro !== 'TODOS';

  return (
    <div className="flex flex-col gap-3">
      <Segmentado opcoes={OPCOES_FILTRO} valor={filtro} aoMudar={setFiltro} rotulo="Filtrar por pagamento" />
      <label htmlFor={idBusca} className="sr-only">
        Buscar participante
      </label>
      <div className="flex h-[54px] items-center gap-2 rounded-full bg-superficie-2 px-[22px] focus-within:shadow-[inset_0_0_0_1.5px_var(--vermelho)]">
        <Search className="size-4 shrink-0 text-texto-2" aria-hidden />
        <input
          id={idBusca}
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou e-mail"
          autoComplete="off"
          className="h-full w-full min-w-0 bg-transparent text-base text-texto placeholder:text-texto-2 focus-visible:outline-none"
        />
      </div>

      <p aria-live="polite" className="px-1 text-xs text-texto-2">
        {filtrando
          ? `${filtrados.length} de ${participantes.length} participantes`
          : `${participantes.length} ${participantes.length === 1 ? 'participante' : 'participantes'}`}
      </p>

      {filtrados.length === 0 ? (
        <p className="rounded-3xl bg-superficie p-6 text-center text-sm text-texto-2 shadow-[inset_0_0_0_1px_var(--borda)]">
          {participantes.length === 0 ? 'Ninguém se inscreveu ainda.' : 'Nenhum participante encontrado.'}
        </p>
      ) : (
        <ul className="grid gap-2">
          {filtrados.map((p) => (
            <li key={p.participanteId}>
              <Link
                to={`/admin/participantes/${p.participanteId}`}
                viewTransition
                onClick={() => marcarDirecao('avancar')}
                className="press flex min-h-11 items-center gap-3 rounded-[20px] bg-superficie py-2.5 pr-3 pl-2.5 shadow-[inset_0_0_0_1px_var(--borda)]"
              >
                <Avatar nome={p.nome} />
                <span className="grid min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5 font-semibold">
                    <span className="truncate">{p.nome}</span>
                    {p.ehEmbaixador && <SeloEmbaixador />}
                    <PilulaPagamento status={p.pagamentoStatus} />
                  </span>
                  <small className="text-xs text-texto-2">
                    {p.vagaNumero !== null ? `Vaga nº ${p.vagaNumero} · ` : ''}
                    {p.diasConcluidos} {p.diasConcluidos === 1 ? 'dia concluído' : 'dias concluídos'}
                    {p.diasInvalidados > 0 ? ` · ${p.diasInvalidados} invalidado${p.diasInvalidados === 1 ? '' : 's'}` : ''}
                  </small>
                </span>
                {p.paraRevisar > 0 && (
                  <span className="shrink-0 rounded-full bg-laranja px-2.5 py-1 text-xs font-bold text-texto escuro:text-fundo">
                    {p.paraRevisar} para revisar
                  </span>
                )}
                <ChevronRight className="size-4 shrink-0 text-texto-2" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
