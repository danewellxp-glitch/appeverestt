import { Dumbbell } from 'lucide-react';
import { CardRequisito } from './CardRequisito';
import { Interruptor } from '../../components/ui/Interruptor';

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
    <CardRequisito titulo="Exercício" icone={<Dumbbell className="size-5" />} cumprido={exercicio}>
      <Interruptor ligado={exercicio} rotulo="Fiz meu exercício hoje" disabled={!editavel} aoAlternar={aoAlterar} />
    </CardRequisito>
  );
}
