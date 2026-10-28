import { Trophy } from 'lucide-react';
import { Botao } from '../components/ui/Botao';
import { Alerta, Card, Skeleton } from '../components/ui/basicos';
import { idLinhaRanking, TabelaRanking, TEXTO_CRITERIO } from '../features/ranking/TabelaRanking';
import { useMe, useRanking } from '../lib/queries';

function EsqueletoRanking() {
  return (
    <div role="status" aria-label="Carregando ranking" className="flex flex-col gap-2">
      <Skeleton className="h-20" />
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-12" />
      ))}
    </div>
  );
}

function irParaMinhaLinha(participanteId: string) {
  const linha = document.getElementById(idLinhaRanking(participanteId));
  if (!linha) return;
  const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  linha.scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth', block: 'center' });
  linha.focus({ preventScroll: true });
}

export default function Ranking() {
  const { data: me } = useMe();
  const slug = me?.participacao?.desafioSlug;
  const meuId = me?.participacao?.participanteId;
  const ranking = useRanking(slug);

  const meuItem = ranking.data?.itens.find((i) => i.participanteId === meuId);
  const minhaPosicao = ranking.data?.minhaPosicao ?? meuItem?.posicao ?? null;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="rotulo">Quem está mais firme</p>
        <h1 className="text-3xl font-bold">Ranking</h1>
      </header>

      {ranking.isPending ? (
        <EsqueletoRanking />
      ) : ranking.isError ? (
        <Alerta
          tipo="erro"
          acao={
            <Botao variante="secundario" onClick={() => void ranking.refetch()}>
              Tentar de novo
            </Botao>
          }
        >
          {ranking.error.message}
        </Alerta>
      ) : ranking.data.itens.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <Trophy className="size-8 text-texto-2" aria-hidden />
          <p className="font-semibold">O ranking ainda está vazio</p>
          <p className="text-sm text-texto-2">
            Assim que os participantes concluírem dias, eles aparecem aqui.
          </p>
        </Card>
      ) : (
        <>
          {minhaPosicao !== null && meuId && (
            <Card className="flex items-center justify-between gap-3">
              <div>
                <p className="rotulo">Sua posição</p>
                <p className="text-2xl font-bold">
                  {minhaPosicao}º{' '}
                  <span className="text-base font-semibold text-texto-2">
                    de {ranking.data.itens.length}
                  </span>
                </p>
                {meuItem && (
                  <p className="text-sm text-texto-2">
                    {meuItem.diasConcluidos}{' '}
                    {meuItem.diasConcluidos === 1 ? 'dia concluído' : 'dias concluídos'}
                  </p>
                )}
              </div>
              {meuItem && ranking.data.itens.length > 8 && (
                <Botao variante="secundario" onClick={() => irParaMinhaLinha(meuId)}>
                  Ver na lista
                </Botao>
              )}
            </Card>
          )}

          <TabelaRanking itens={ranking.data.itens} meuParticipanteId={meuId} />
        </>
      )}

      <footer className="text-xs leading-relaxed text-texto-2">
        <p>{TEXTO_CRITERIO}</p>
        <p className="mt-1">Dias invalidados pelo embaixador não contam.</p>
      </footer>
    </div>
  );
}
