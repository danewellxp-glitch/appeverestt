import { Dumbbell } from 'lucide-react';
import { Interruptor } from '../../components/ui/Interruptor';
import { CardRequisito } from './CardRequisito';

export function CardExercicio({
  exercicio,
  editavel,
  aoAlterar,
}: {
  exercicio: boolean;
  editavel: boolean;
  aoAlterar: (feito: boolean) => void;
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
    </CardRequisito>
  );
}
