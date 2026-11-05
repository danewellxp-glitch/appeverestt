import { ALTITUDE_CUME, agruparPorAltitude, altitudeSimbolica, type GrupoAltitude, type ItemRankingPosicionado } from '@everest/shared';
import { Mountain } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '../../components/ui/Avatar';
import { Alerta, Skeleton } from '../../components/ui/basicos';
import { Botao } from '../../components/ui/Botao';
import { useDesafioAtual, useMe, useRanking } from '../../lib/queries';
import { reduzirMovimento } from '../../lib/transicoes';
import { Montanha, type ItemSobreMontanha } from '../progresso/Montanha';

const FORMATO = new Intl.NumberFormat('pt-BR');

function textoDias(n: number): string {
  return `${n} ${n === 1 ? 'dia' : 'dias'}`;
}

export function idGrupoAltitude(dias: number): string {
  return `altitude-${dias}`;
}

/** "Maria L. e mais 3, a 2.950 m (10 dias)". */
export function rotuloBolha(grupo: GrupoAltitude<ItemRankingPosicionado>, meuId: string | undefined): string {
  const [primeira] = grupo.pessoas;
  const souEu = grupo.pessoas.some((p) => p.participanteId === meuId);
  const nome = souEu ? 'Você' : (primeira?.nomeExibicao ?? '');
  const mais = grupo.pessoas.length - 1;
  return `${nome}${mais > 0 ? ` e mais ${mais}` : ''}, a ${FORMATO.format(grupo.altitude)} m (${textoDias(grupo.diasConcluidos)})`;
}

/**
 * Aba "Montanha" (R23): a montanha do Progresso com a turma inteira. Cada altitude é uma bolha
 * (avatar + "+N" para empates); tocar destaca e rola até o grupo na lista abaixo.
 */
export function MontanhaTurma() {
  const { data: me } = useMe();
  const slug = me?.participacao?.desafioSlug;
  const meuId = me?.participacao?.participanteId;
  const rankingQ = useRanking(slug);
  const desafioQ = useDesafioAtual();
  const [selecionado, setSelecionado] = useState<number | null>(null);

  if (rankingQ.isPending || desafioQ.isPending) {
    return (
      <div role="status" aria-label="Carregando a montanha" className="flex flex-col gap-2">
        <Skeleton className="h-72 rounded-[28px]" />
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-16 rounded-[20px]" />
        ))}
      </div>
    );
  }
  if (rankingQ.isError) {
    return (
      <Alerta
        tipo="erro"
        acao={
          <Botao variante="secundario" tamanho="sm" onClick={() => void rankingQ.refetch()}>
            Tentar de novo
          </Botao>
        }
      >
        {rankingQ.error.message}
      </Alerta>
    );
  }

  const itens = rankingQ.data.itens;
  if (itens.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-3xl bg-superficie py-10 text-center shadow-[inset_0_0_0_1px_var(--borda)]">
        <Mountain className="size-8 text-texto-2" aria-hidden />
        <p className="font-semibold">Ninguém na montanha ainda</p>
        <p className="text-sm text-texto-2">Assim que os participantes concluírem dias, eles aparecem aqui.</p>
      </div>
    );
  }

  const totalDias = desafioQ.data?.totalDias ?? 30;
  const grupos = agruparPorAltitude(itens, totalDias);
  const meuItem = itens.find((i) => i.participanteId === meuId);
  const meusDias = meuItem?.diasConcluidos ?? 0;

  function selecionar(dias: number) {
    const novo = selecionado === dias ? null : dias;
    setSelecionado(novo);
    if (novo === null) return;
    const el = document.getElementById(idGrupoAltitude(novo));
    el?.scrollIntoView?.({ behavior: reduzirMovimento() ? 'auto' : 'smooth', block: 'nearest' });
  }

  const bolhas: ItemSobreMontanha[] = [...grupos].reverse().map((g) => {
    const [primeira] = g.pessoas;
    const meu = g.pessoas.some((p) => p.participanteId === meuId);
    const ativo = selecionado === g.diasConcluidos;
    const mais = g.pessoas.length - 1;
    const destaque = meu ? (meuItem ?? primeira) : primeira;
    return {
      chave: String(g.diasConcluidos),
      fracao: g.fracao,
      // A sua bolha sempre aparece; as outras disputam espaço pelo tamanho do grupo.
      prioridade: meu ? 1000 : g.pessoas.length,
      descartavel: !meu,
      conteudo: (
        <button
          type="button"
          aria-pressed={ativo}
          aria-label={rotuloBolha(g, meuId)}
          onClick={() => selecionar(g.diasConcluidos)}
          className={`press relative grid place-items-center rounded-full p-[2px] transition-transform duration-200 ${ativo ? 'z-10 scale-110' : ''} ${meu ? 'bg-vermelho' : ativo ? 'bg-texto' : 'bg-superficie'} shadow-[0_1px_4px_rgb(0_0_0/0.25)]`}
        >
          <Avatar nome={destaque?.nomeExibicao ?? ''} fotoUrl={destaque?.fotoUrl} tamanho="sm" />
          {mais > 0 && (
            <span
              aria-hidden
              className="absolute -right-2 -bottom-1.5 min-w-[22px] rounded-full bg-texto px-1 py-px text-center text-[10px] leading-[14px] font-bold text-fundo tabular-nums"
            >
              +{mais}
            </span>
          )}
        </button>
      ),
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <section
        aria-label="Turma na montanha"
        className="surgir grid gap-2 rounded-[28px] bg-superficie px-[18px] pt-[18px] pb-3.5 shadow-[inset_0_0_0_1px_var(--borda)]"
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[13px] text-texto-2">
            {meuItem ? (
              <>
                Você está a <b className="text-texto">{FORMATO.format(altitudeSimbolica(meusDias, totalDias))} m</b>
              </>
            ) : (
              `${itens.length} ${itens.length === 1 ? 'pessoa' : 'pessoas'} na escalada`
            )}
          </p>
          <p className="text-[13px] text-texto-2">cume a {FORMATO.format(ALTITUDE_CUME)} m</p>
        </div>
        <Montanha
          diasConcluidos={meusDias}
          totalDias={totalDias}
          altitude={altitudeSimbolica(meusDias, totalDias)}
          outros={bolhas}
          marcador={false}
        />
        <p className="text-[13px] text-texto-2">Toque numa bolha para ver quem está ali. Sem espaço, os grupos menores ficam só como ponto; a lista abaixo tem todo mundo.</p>
      </section>

      <ol aria-label="Turma por altitude" className="grid gap-2">
        {grupos.map((g) => {
          const ativo = selecionado === g.diasConcluidos;
          return (
            <li
              key={g.diasConcluidos}
              id={idGrupoAltitude(g.diasConcluidos)}
              aria-current={ativo ? 'true' : undefined}
              className={`grid scroll-mt-24 scroll-mb-28 gap-2 rounded-[20px] bg-superficie p-3.5 transition-shadow duration-300 ${ativo ? 'shadow-[inset_0_0_0_2px_var(--texto)]' : 'shadow-[inset_0_0_0_1px_var(--borda)]'}`}
            >
              <p className="flex items-baseline justify-between gap-2">
                <b className="font-display text-[22px] leading-none font-extrabold tabular-nums">
                  {FORMATO.format(g.altitude)} m
                </b>
                <span className="text-xs text-texto-2">{textoDias(g.diasConcluidos)}</span>
              </p>
              <ul className="flex flex-wrap gap-x-3 gap-y-2">
                {g.pessoas.map((p) => {
                  const souEu = p.participanteId === meuId;
                  return (
                    <li key={p.participanteId} className="flex min-w-0 items-center gap-1.5 text-sm">
                      <Avatar nome={p.nomeExibicao} fotoUrl={p.fotoUrl} tamanho="sm" className={souEu ? 'ring-2 ring-vermelho' : ''} />
                      <span className={souEu ? 'font-semibold text-vermelho-texto' : ''}>
                        {p.nomeExibicao}
                        {souEu && ' (você)'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
