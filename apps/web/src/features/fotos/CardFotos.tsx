import { METAS, TIPOS_FOTO, type FotoDia } from '@everest/shared';
import { Camera } from 'lucide-react';
import { CardRequisito } from '../checkin/CardRequisito';
import { ROTULO_TIPO_FOTO, fotoEhValida } from './fotosValidas';
import { SlotFoto } from './SlotFoto';
import { useFotosDia } from './useUploadFoto';

/** "Prova do dia": 3 slots (água, treino, leitura), cada um com o seu envio. */
export function CardFotos({
  slug,
  numeroDia,
  fotos,
  editavel,
}: {
  slug: string;
  numeroDia: number;
  fotos: FotoDia[];
  editavel: boolean;
}) {
  const { estados, enviar, remover } = useFotosDia(slug, numeroDia);
  const validas = TIPOS_FOTO.filter((t) => fotoEhValida(fotos.find((f) => f.tipo === t))).length;
  const erros = TIPOS_FOTO.flatMap((t) => {
    const erro = estados[t]?.erro;
    return erro ? [`${ROTULO_TIPO_FOTO[t]}: ${erro}`] : [];
  });

  return (
    <CardRequisito
      titulo="Prova do dia"
      meta="Uma foto de cada: água, treino e leitura"
      icone={<Camera className="size-5" />}
      cumprido={validas >= METAS.fotos}
      falta={`${validas} de ${METAS.fotos}`}
    >
      <ul className="grid grid-cols-3 gap-2" aria-label="Fotos de prova">
        {TIPOS_FOTO.map((tipo) => (
          <SlotFoto
            key={tipo}
            tipo={tipo}
            foto={fotos.find((f) => f.tipo === tipo)}
            estado={estados[tipo]}
            editavel={editavel}
            aoEscolher={(arquivo) => void enviar(tipo, arquivo)}
            aoRemover={() => void remover(tipo)}
          />
        ))}
      </ul>
      <div aria-live="polite" className="text-[13px] text-vermelho-texto empty:hidden">
        {erros.map((e) => (
          <p key={e}>{e}</p>
        ))}
      </div>
    </CardRequisito>
  );
}
