import { METAS, TIPOS_FOTO, type FotoDia } from '@everest/shared';
import { Camera } from 'lucide-react';
import { CardRequisito } from '../checkin/CardRequisito';
import { fotoEhValida } from './fotosValidas';
import { SlotFoto } from './SlotFoto';
import { useFotosDia } from './useUploadFoto';

/** Card "Fotos": 3 slots (Água, Exercício, Leitura). */
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

  return (
    <CardRequisito titulo="Fotos" icone={<Camera className="size-5" />} cumprido={validas >= METAS.fotos}>
      <p className="text-sm text-texto-2">
        {validas} de {METAS.fotos} fotos de prova. Uma de cada: água, exercício e leitura.
      </p>
      <ul className="flex flex-col gap-2">
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
    </CardRequisito>
  );
}
