import { Dumbbell, Mountain, Sun, Trophy } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { Segmentado, type OpcaoSegmentado } from '../components/ui/Segmentado';
import { AbaRanking } from '../features/ranking/AbaRanking';
import { type AbaRanking as TipoAba, lerAba } from '../features/ranking/abas';
import { Hoje } from '../features/ranking/Hoje';
import { MontanhaTurma } from '../features/ranking/MontanhaTurma';
import { Treinos } from '../features/ranking/Treinos';
import { useDesafioAtual, useMe, useRanking } from '../lib/queries';

const OPCOES_ABAS: readonly OpcaoSegmentado<TipoAba>[] = [
  { valor: 'ranking', rotulo: 'Ranking', icone: <Trophy className="size-4" aria-hidden /> },
  { valor: 'montanha', rotulo: 'Montanha', icone: <Mountain className="size-4" aria-hidden /> },
  { valor: 'hoje', rotulo: 'Hoje', icone: <Sun className="size-4" aria-hidden /> },
  { valor: 'treinos', rotulo: 'Treinos', icone: <Dumbbell className="size-4" aria-hidden /> },
];

/** /ranking (R23): hub da turma com 4 sub-abas em `?aba=` (ranking, montanha, hoje, treinos). */
export default function Ranking() {
  const { data: me } = useMe();
  const slug = me?.participacao?.desafioSlug;
  const meuId = me?.participacao?.participanteId;
  const rankingQ = useRanking(slug);
  const desafioQ = useDesafioAtual();
  const [params, setParams] = useSearchParams();
  const aba = lerAba(params.get('aba'));

  function trocarAba(nova: TipoAba) {
    const novos = new URLSearchParams(params);
    if (nova === 'ranking') novos.delete('aba');
    else novos.set('aba', nova);
    // Troca no lugar (sem empilhar histórico nem View Transition lateral).
    setParams(novos, { replace: true });
  }

  const itens = rankingQ.data?.itens ?? [];
  const diaAtual = desafioQ.data?.diaAtual;
  const eyebrow = `${itens.length} ${itens.length === 1 ? 'participante' : 'participantes'}${diaAtual ? ` · dia ${diaAtual}` : ''}`;

  return (
    <div className="flex flex-col gap-4">
      <header className="surgir grid gap-1.5">
        <p className="rotulo">{rankingQ.data ? eyebrow : 'Ranking do desafio'}</p>
        <h1 className="font-display text-[38px] leading-[0.9] font-black uppercase">Ranking</h1>
      </header>

      <Segmentado opcoes={OPCOES_ABAS} valor={aba} aoMudar={trocarAba} rotulo="Seções da turma" compacto />

      {aba === 'ranking' && <AbaRanking rankingQ={rankingQ} meuId={meuId} />}
      {aba === 'montanha' && <MontanhaTurma />}
      {aba === 'hoje' && <Hoje />}
      {aba === 'treinos' && <Treinos />}
    </div>
  );
}
