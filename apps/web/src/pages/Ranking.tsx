import { Trophy } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Alerta, Skeleton } from '../components/ui/basicos';
import { Botao } from '../components/ui/Botao';
import { fraseSuaPosicao } from '../features/ranking/fraseRanking';
import { ListaRanking, TEXTO_CRITERIO, idLinhaRanking } from '../features/ranking/TabelaRanking';
import { useDesafioAtual, useMe, useRanking } from '../lib/queries';
import { reduzirMovimento } from '../lib/transicoes';

export default function Ranking() {
  const { data: me } = useMe();
  const slug = me?.participacao?.desafioSlug;
  const meuId = me?.participacao?.participanteId;
  const rankingQ = useRanking(slug);
  const desafioQ = useDesafioAtual();
  const rolou = useRef(false);

  const itens = rankingQ.data?.itens ?? [];
  const meuItem = itens.find((i) => i.participanteId === meuId);

  // Rola até a sua linha uma vez, quando a lista carrega.
  useEffect(() => {
    if (rolou.current || !meuId || !meuItem) return;
    rolou.current = true;
    const linha = document.getElementById(idLinhaRanking(meuId));
    if (!linha) return;
    const r = linha.getBoundingClientRect();
    const visivel = r.top >= 0 && r.bottom <= window.innerHeight - 110;
    if (!visivel) linha.scrollIntoView({ behavior: reduzirMovimento() ? 'auto' : 'smooth', block: 'center' });
  }, [meuId, meuItem]);

  const diaAtual = desafioQ.data?.diaAtual;
  const eyebrow = `${itens.length} ${itens.length === 1 ? 'participante' : 'participantes'}${diaAtual ? ` · dia ${diaAtual}` : ''}`;

  return (
    <div className="flex flex-col gap-4">
      <header className="surgir grid gap-1.5">
        <p className="rotulo">{rankingQ.data ? eyebrow : 'Ranking do desafio'}</p>
        <h1 className="font-display text-[38px] leading-[0.9] font-black uppercase">Ranking</h1>
      </header>

      {rankingQ.isPending ? (
        <div role="status" aria-label="Carregando ranking" className="flex flex-col gap-2">
          <Skeleton className="h-28 rounded-[28px]" />
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-[20px]" />
          ))}
        </div>
      ) : rankingQ.isError ? (
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
      ) : itens.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl bg-superficie py-10 text-center shadow-[inset_0_0_0_1px_var(--borda)]">
          <Trophy className="size-8 text-texto-2" aria-hidden />
          <p className="font-semibold">O ranking ainda está vazio</p>
          <p className="text-sm text-texto-2">Assim que os participantes concluírem dias, eles aparecem aqui.</p>
        </div>
      ) : (
        <>
          {meuItem && meuId && (
            <section
              aria-label="Sua posição"
              className="surgir grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1 rounded-[28px] bg-pop p-4 text-pop-texto"
            >
              <span className="row-span-2 font-display text-[66px] leading-[0.9] font-extrabold tabular-nums">
                {meuItem.posicao}
                <sup className="text-[26px]">º</sup>
              </span>
              <span className="text-[11px] font-semibold tracking-[0.16em] text-pop-texto-2 uppercase">Sua posição</span>
              <span className="text-[13px]">
                {meuItem.diasConcluidos} {meuItem.diasConcluidos === 1 ? 'dia concluído' : 'dias concluídos'}.{' '}
                {fraseSuaPosicao(itens, meuId)}
              </span>
            </section>
          )}
          <ListaRanking itens={itens} meuParticipanteId={meuId} />
        </>
      )}

      <p className="text-xs leading-relaxed text-texto-2">{TEXTO_CRITERIO}</p>
    </div>
  );
}
