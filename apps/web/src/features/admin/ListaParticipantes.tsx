import type { AdminParticipante } from '@everest/shared';
import { AlertTriangle, ChevronRight, Search } from 'lucide-react';
import { useDeferredValue, useId, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { SeloEmbaixador } from '../ranking/TabelaRanking';

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

/** Lista de participantes (admin) com busca por nome ou e-mail. */
export function ListaParticipantes({
  participantes,
  totalDias,
}: {
  participantes: AdminParticipante[];
  totalDias: number;
}) {
  const idBusca = useId();
  const [busca, setBusca] = useState('');
  const buscaAdiada = useDeferredValue(busca);

  const filtrados = useMemo(() => {
    const termo = normalizar(buscaAdiada);
    if (!termo) return participantes;
    return participantes.filter(
      (p) => normalizar(p.nome).includes(termo) || normalizar(p.email).includes(termo),
    );
  }, [participantes, buscaAdiada]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={idBusca} className="text-sm font-semibold">
          Buscar participante
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-texto-2"
            aria-hidden
          />
          <input
            id={idBusca}
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome ou e-mail"
            autoComplete="off"
            className="min-h-11 w-full rounded-xl border border-borda bg-superficie-2 pr-3 pl-9 text-base text-texto placeholder:text-texto-2/70"
          />
        </div>
      </div>

      <p aria-live="polite" className="text-xs text-texto-2">
        {busca.trim()
          ? `${filtrados.length} de ${participantes.length} participantes`
          : `${participantes.length} ${participantes.length === 1 ? 'participante' : 'participantes'}`}
      </p>

      {filtrados.length === 0 ? (
        <p className="rounded-2xl border border-borda bg-superficie p-6 text-center text-sm text-texto-2">
          {participantes.length === 0
            ? 'Ninguém se inscreveu ainda.'
            : 'Nenhum participante encontrado.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtrados.map((p) => (
            <li key={p.participanteId}>
              <Link
                to={`/admin/participantes/${p.participanteId}`}
                className="flex min-h-11 items-center gap-3 rounded-2xl border border-borda bg-superficie p-3 hover:border-texto-2"
              >
                <span className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-superficie-2 py-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-texto-2">
                    Vaga
                  </span>
                  <span className="text-lg font-bold tabular-nums">{p.vagaNumero ?? '—'}</span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate font-semibold">{p.nome}</span>
                    {p.ehEmbaixador && <SeloEmbaixador />}
                  </span>
                  <span className="truncate text-xs text-texto-2">{p.email}</span>
                  <span className="flex flex-wrap gap-x-3 text-xs text-texto-2">
                    <span>
                      <strong className="text-texto tabular-nums">{p.diasConcluidos}</strong>/
                      {totalDias} concluídos
                    </span>
                    {p.diasInvalidados > 0 ? (
                      <span className="inline-flex items-center gap-1 text-amber-200">
                        <AlertTriangle className="size-3" aria-hidden />
                        {p.diasInvalidados} {p.diasInvalidados === 1 ? 'invalidado' : 'invalidados'}
                      </span>
                    ) : (
                      <span>0 invalidados</span>
                    )}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-texto-2" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
