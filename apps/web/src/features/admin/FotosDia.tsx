import { TIPOS_FOTO, type FotoDia, type StatusFoto, type TipoFoto } from '@everest/shared';
import { ExternalLink, ImageOff, Loader2 } from 'lucide-react';

const NOME_TIPO: Record<TipoFoto, string> = {
  AGUA: 'Água',
  EXERCICIO: 'Exercício',
  LEITURA: 'Leitura',
};

const STATUS: Record<StatusFoto, { rotulo: string; estilo: string }> = {
  PENDENTE: { rotulo: 'Pendente', estilo: 'border-borda bg-superficie-2 text-texto-2' },
  ENVIADA: { rotulo: 'Enviada', estilo: 'border-sky-800 bg-sky-950 text-sky-100' },
  CONFIRMADA: { rotulo: 'Confirmada', estilo: 'border-green-800 bg-green-950 text-green-100' },
  REJEITADA: {
    rotulo: 'Rejeitada',
    estilo: 'border-vermelho-texto bg-superficie-2 text-vermelho-texto',
  },
};

function SeloStatus({ status }: { status: StatusFoto }) {
  const s = STATUS[status];
  return (
    <span
      className={`rounded-md border px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${s.estilo}`}
    >
      {s.rotulo}
    </span>
  );
}

function SlotFoto({
  tipo,
  foto,
  numeroDia,
}: {
  tipo: TipoFoto;
  foto: FotoDia | undefined;
  numeroDia: number;
}) {
  const nome = NOME_TIPO[tipo];
  const src = foto?.url ?? foto?.thumbUrl ?? null;
  return (
    <li className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-semibold">{nome}</h4>
        {foto ? (
          <SeloStatus status={foto.status} />
        ) : (
          <span className="text-xs text-texto-2">sem foto</span>
        )}
      </div>
      {foto && src ? (
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block overflow-hidden rounded-xl border border-borda bg-superficie-2"
        >
          <img
            src={src}
            alt={`Foto de ${nome.toLocaleLowerCase('pt-BR')} do dia ${numeroDia}`}
            loading="lazy"
            decoding="async"
            className="h-auto w-full object-contain"
          />
          <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-lg bg-black/80 px-2 py-1 text-xs font-semibold text-white">
            <ExternalLink className="size-3.5" aria-hidden />
            Abrir em nova aba
          </span>
        </a>
      ) : (
        <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-borda bg-superficie-2 text-sm text-texto-2">
          {foto ? (
            foto.status === 'REJEITADA' ? (
              <>
                <ImageOff className="size-6" aria-hidden />
                Foto rejeitada no processamento
              </>
            ) : (
              <>
                <Loader2 className="size-6 animate-spin" aria-hidden />
                Processando a foto…
              </>
            )
          ) : (
            <>
              <ImageOff className="size-6" aria-hidden />
              Sem foto
            </>
          )}
        </div>
      )}
    </li>
  );
}

/** As 3 fotos do dia em tamanho cheio (clique abre em nova aba). Slots vazios mostram "sem foto". */
export function FotosDia({ fotos, numeroDia }: { fotos: FotoDia[]; numeroDia: number }) {
  return (
    <ul className="flex flex-col gap-4">
      {TIPOS_FOTO.map((tipo) => (
        <SlotFoto
          key={tipo}
          tipo={tipo}
          foto={fotos.find((f) => f.tipo === tipo)}
          numeroDia={numeroDia}
        />
      ))}
    </ul>
  );
}
