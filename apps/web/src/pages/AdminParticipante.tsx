import type { MeuProgresso } from '@everest/shared';
import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { BotaoVoltar } from '../components/layout/BotaoVoltar';
import { GridDias, LegendaDias } from '../components/GridDias';
import { Alerta, Skeleton } from '../components/ui/basicos';
import { Botao } from '../components/ui/Botao';
import { useAdminParticipante, useSlugAdmin } from '../features/admin/consultas';
import { PainelDia } from '../features/admin/PainelDia';
import { SecaoDados, SecaoFeedback, SecaoPagamento } from '../features/admin/SecoesParticipante';
import { SeloEmbaixador } from '../features/ranking/TabelaRanking';
import { ehApiError } from '../lib/api';

/** Abre por padrão no último dia aguardando conferência; senão no último dia que já chegou. */
function diaPadrao(progresso: MeuProgresso): number | null {
  const aguardando = progresso.dias.filter((d) => d.situacao === 'AGUARDANDO_CONFERENCIA');
  if (aguardando.length > 0) return aguardando.at(-1)?.numeroDia ?? null;
  const passados = progresso.dias.filter((d) => d.situacao !== 'FUTURO');
  return passados.at(-1)?.numeroDia ?? null;
}

/** Lê ?dia=N, aceitando só dias que existem e já chegaram. */
function diaDaUrl(valor: string | null, progresso: MeuProgresso): number | null {
  if (!valor) return null;
  const n = Number(valor);
  const dia = progresso.dias.find((d) => d.numeroDia === n);
  return dia && dia.situacao !== 'FUTURO' ? n : null;
}

function Topo({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  return (
    <header className="surgir flex items-center gap-3">
      <BotaoVoltar para="/admin/participantes" />
      <div className="min-w-0 flex-1">
        <p className="rotulo">{subtitulo ?? 'Participante'}</p>
        <h1 className="font-display text-[38px] leading-[0.9] font-black uppercase [overflow-wrap:anywhere]">{titulo}</h1>
      </div>
    </header>
  );
}

/** /admin/participantes/:id (docs/FRONTEND.md §9.12). */
export default function AdminParticipante() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { slug, carregando, erro, tentarDeNovo } = useSlugAdmin();
  const consulta = useAdminParticipante(slug, id);
  const progressoCarregado = consulta.data?.progresso;
  const semDiaNaUrl = !params.get('dia');

  // Fixa o dia padrão na URL ao abrir: depois de aprovar, a fila muda e a seleção não pode pular de dia.
  useEffect(() => {
    if (!progressoCarregado || !semDiaNaUrl) return;
    const n = diaPadrao(progressoCarregado);
    if (n === null) return;
    setParams(
      (atual) => {
        const proximo = new URLSearchParams(atual);
        proximo.set('dia', String(n));
        return proximo;
      },
      { replace: true, preventScrollReset: true },
    );
  }, [progressoCarregado, semDiaNaUrl, setParams]);

  if (erro) {
    return (
      <div className="flex flex-col gap-4">
        <Topo titulo="Participante" />
        <Alerta
          tipo="erro"
          acao={
            <Botao variante="secundario" tamanho="sm" onClick={tentarDeNovo}>
              Tentar de novo
            </Botao>
          }
        >
          Não foi possível identificar o desafio ativo.
        </Alerta>
      </div>
    );
  }
  if (carregando || consulta.isPending) {
    return (
      <div role="status" aria-label="Carregando participante" className="flex flex-col gap-3">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    );
  }
  if (consulta.isError) {
    const naoEncontrado = ehApiError(consulta.error, 'NAO_ENCONTRADO');
    return (
      <div className="flex flex-col gap-4">
        <Topo titulo="Participante" />
        <Alerta
          tipo="erro"
          acao={
            naoEncontrado ? undefined : (
              <Botao variante="secundario" tamanho="sm" onClick={() => void consulta.refetch()}>
                Tentar de novo
              </Botao>
            )
          }
        >
          {naoEncontrado ? 'Participante não encontrado neste desafio.' : consulta.error.message}
        </Alerta>
      </div>
    );
  }

  const detalhe = consulta.data;
  const { participante, progresso } = detalhe;
  const selecionado = diaDaUrl(params.get('dia'), progresso) ?? diaPadrao(progresso);
  const subtitulo = `${participante.vagaNumero !== null ? `Vaga nº ${participante.vagaNumero} · ` : ''}${participante.diasConcluidos} ${participante.diasConcluidos === 1 ? 'dia' : 'dias'}${participante.paraRevisar > 0 ? ` · ${participante.paraRevisar} para revisar` : ''}`;

  function selecionar(n: number) {
    setParams(
      (atual) => {
        const proximo = new URLSearchParams(atual);
        proximo.set('dia', String(n));
        return proximo;
      },
      { replace: true, preventScrollReset: true },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Topo titulo={participante.nome} subtitulo={subtitulo} />
      <p className="-mt-2 flex flex-wrap items-center gap-2 text-sm break-all text-texto-2">
        {/* Conta excluída: o e-mail que a API devolve é técnico (removido+…@everest.invalid). */}
        {participante.contaExcluida ? 'Conta excluída' : participante.email}
        {participante.ehEmbaixador && <SeloEmbaixador />}
      </p>

      <SecaoDados detalhe={detalhe} />
      {slug && <SecaoPagamento key={participante.participanteId} slug={slug} detalhe={detalhe} />}
      <SecaoFeedback detalhe={detalhe} />

      <section
        aria-labelledby="titulo-dias"
        className="grid gap-3 rounded-3xl bg-superficie p-[18px] shadow-[inset_0_0_0_1px_var(--borda)]"
      >
        <h2 id="titulo-dias" className="text-[17px] font-bold">
          Dias
        </h2>
        <GridDias
          dias={progresso.dias}
          selecionado={selecionado}
          aoSelecionar={selecionar}
          rotulo={`Dias de ${participante.nome}`}
        />
        <LegendaDias comConferencia />
        {participante.diasFotoParecida.length > 0 && (
          <div className="grid gap-2 rounded-xl border border-aviso-borda bg-aviso-fundo p-3 text-sm text-aviso-texto">
            <p className="flex items-start gap-2 font-semibold">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              Foto parecida com outra do desafio em dias para revisar. É só um sinal: compare antes de aprovar.
            </p>
            <div className="flex flex-wrap gap-2">
              {participante.diasFotoParecida.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => selecionar(n)}
                  aria-current={selecionado === n ? 'true' : undefined}
                  className="press min-h-11 rounded-full bg-superficie px-4 font-semibold text-texto shadow-[inset_0_0_0_1px_var(--aviso-borda)] aria-[current=true]:shadow-[inset_0_0_0_2px_var(--texto)]"
                >
                  Dia {n}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {selecionado === null ? (
        <p className="rounded-3xl bg-superficie p-5 text-sm text-texto-2 shadow-[inset_0_0_0_1px_var(--borda)]">
          O desafio ainda não começou: nenhum dia para revisar.
        </p>
      ) : slug && id ? (
        <PainelDia key={selecionado} slug={slug} participanteId={id} numeroDia={selecionado} />
      ) : null}
    </div>
  );
}
