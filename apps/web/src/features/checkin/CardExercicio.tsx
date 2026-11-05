import { Dumbbell, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Interruptor } from '../../components/ui/Interruptor';
import { useTreinosTurma } from '../../lib/queries';
import { FolhaPose, textoAutorPose } from '../ranking/pose';
import { CardRequisito } from './CardRequisito';

/** Pose do dia (R23) no card do treino: só no dia atual, vinda do feed de treinos da turma. */
function PoseDoDia({ slug }: { slug: string }) {
  const treinosQ = useTreinosTurma(slug, null);
  const [sugerindo, setSugerindo] = useState(false);
  const d = treinosQ.data;
  if (!d || d.dia === null || d.dia !== d.diaAtual) return null;
  if (d.pose) {
    return (
      <p className="flex items-start gap-2 rounded-2xl bg-superficie-2 px-3.5 py-3 text-[13px]">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-vermelho-texto" aria-hidden />
        <span>
          <b>Pose do dia:</b> {d.pose.texto} <span className="text-texto-2">· {textoAutorPose(d.pose.autor.nomeExibicao)}</span>
        </span>
      </p>
    );
  }
  if (!d.possoSugerirPose) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setSugerindo(true)}
        aria-haspopup="dialog"
        className="press flex min-h-12 items-center gap-2 rounded-2xl bg-superficie-2 px-3.5 py-3 text-left text-[13px] font-semibold"
      >
        <Sparkles className="size-4 shrink-0 text-vermelho-texto" aria-hidden />
        <span className="flex-1">Sugerir a pose do dia</span>
        <span className="text-xs font-normal text-texto-2">ninguém sugeriu ainda</span>
      </button>
      <FolhaPose slug={slug} aberta={sugerindo} aoFechar={() => setSugerindo(false)} />
    </>
  );
}

export function CardExercicio({
  exercicio,
  editavel,
  aoAlterar,
  slug,
  ehHoje = false,
}: {
  exercicio: boolean;
  editavel: boolean;
  aoAlterar: (feito: boolean) => void;
  /** Com `ehHoje`, mostra a pose do dia da turma. */
  slug?: string;
  ehHoje?: boolean;
}) {
  return (
    <CardRequisito
      titulo="Exercício"
      meta="Qualquer treino conta"
      icone={<Dumbbell className="size-5" />}
      cumprido={exercicio}
      falta="Pendente"
    >
      <Interruptor ligado={exercicio} rotulo="Fiz meu treino hoje" disabled={!editavel} aoAlternar={aoAlterar} />
      {slug && ehHoje && <PoseDoDia slug={slug} />}
    </CardRequisito>
  );
}
