import type { FotoDia, TipoFoto } from '@everest/shared';
import { BookOpen, Check, Droplets, Dumbbell, Loader2, RefreshCw, X } from 'lucide-react';
import { useRef } from 'react';
import { ROTULO_TIPO_FOTO, fotoEhValida } from './fotosValidas';
import type { EstadoFoto } from './useUploadFoto';

const ICONE: Record<TipoFoto, typeof Droplets> = { AGUA: Droplets, EXERCICIO: Dumbbell, LEITURA: BookOpen };

const SELO =
  'absolute bottom-1.5 left-1.5 flex max-w-[calc(100%-12px)] items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-white';

/** Texto do selo de andamento (envio / processamento). null = sem selo de andamento. */
function andamento(foto: FotoDia | undefined, estado: EstadoFoto | undefined): string | null {
  const upload = estado?.upload;
  if (upload?.fase === 'comprimindo') return 'Preparando';
  if (upload?.fase === 'enviando') return `Enviando ${Math.floor(upload.progresso / 10) * 10}%`;
  if (upload?.fase === 'confirmando') return 'Confirmando';
  if (estado?.removendo) return 'Removendo';
  if (foto?.status === 'ENVIADA') return 'Processando';
  return null;
}

/**
 * Slot 3:4 de uma foto de prova. Vazio: borda tracejada + "Adicionar foto". Cheio: imagem,
 * selo "✓ Água" e × para remover. Enviando: spinner + %. Recusada: selo vermelho para trocar.
 */
export function SlotFoto({
  tipo,
  foto,
  estado,
  editavel,
  aoEscolher,
  aoRemover,
}: {
  tipo: TipoFoto;
  foto: FotoDia | undefined;
  estado: EstadoFoto | undefined;
  editavel: boolean;
  aoEscolher: (arquivo: File) => void;
  aoRemover: () => void;
}) {
  const rotulo = ROTULO_TIPO_FOTO[tipo];
  const Icone = ICONE[tipo];
  const entrada = useRef<HTMLInputElement>(null);
  const upload = estado?.upload ?? null;
  const ocupado = Boolean(upload) || Boolean(estado?.removendo);
  const valida = fotoEhValida(foto);
  const recusada = foto?.status === 'REJEITADA' && !upload;
  const preview = upload?.previewUrl ?? (valida ? (foto.thumbUrl ?? foto.url) : null);
  const textoAndamento = andamento(foto, estado);
  const escolher = () => entrada.current?.click();

  const input = editavel ? (
    <input
      ref={entrada}
      type="file"
      accept="image/*"
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      onChange={(e) => {
        const arquivo = e.currentTarget.files?.[0];
        // Limpa para permitir escolher o mesmo arquivo de novo.
        e.currentTarget.value = '';
        if (arquivo) aoEscolher(arquivo);
      }}
    />
  ) : null;

  if (!preview) {
    const conteudo = (
      <>
        <Icone className="size-5 text-vermelho-texto" aria-hidden />
        <span className="text-[13px] font-semibold">{rotulo}</span>
        <small className={`text-[11px] font-medium ${recusada ? 'text-vermelho-texto' : 'text-texto-2'}`}>
          {recusada ? 'Foto recusada · trocar' : editavel ? 'Adicionar foto' : 'Sem foto'}
        </small>
      </>
    );
    return (
      <li className="relative aspect-[3/4] min-w-0">
        {input}
        {editavel ? (
          <button
            type="button"
            onClick={escolher}
            disabled={ocupado}
            aria-label={recusada ? `Foto de ${rotulo} recusada. Enviar outra` : `Adicionar foto de ${rotulo}`}
            className={`press grid size-full place-content-center justify-items-center gap-1 rounded-[18px] border-[1.5px] border-dashed bg-superficie-2 text-center ${recusada ? 'border-vermelho-texto' : 'border-borda-campo'}`}
          >
            {conteudo}
          </button>
        ) : (
          <div className="grid size-full place-content-center justify-items-center gap-1 rounded-[18px] border-[1.5px] border-dashed border-borda bg-superficie-2 text-center text-texto-2">
            {conteudo}
          </div>
        )}
      </li>
    );
  }

  return (
    <li className="relative aspect-[3/4] min-w-0 overflow-hidden rounded-[18px] bg-superficie-2">
      {input}
      <img
        src={preview}
        alt={`Foto de prova: ${rotulo}`}
        className={`absolute inset-0 size-full object-cover ${upload ? 'opacity-70' : ''}`}
        style={{ animation: 'pop 450ms var(--ease-saida) both' }}
      />
      {textoAndamento ? (
        <span className={`${SELO} bg-black/60`}>
          <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden />
          {textoAndamento}
        </span>
      ) : (
        <span className={`${SELO} bg-black/60`}>
          <Check className="size-3 shrink-0" aria-hidden />
          {rotulo}
        </span>
      )}
      {editavel && !ocupado && (
        <div className="absolute top-1.5 right-1.5 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={aoRemover}
            aria-label={`Remover foto de ${rotulo}`}
            className="grid size-[30px] place-items-center rounded-full bg-black/60 text-white"
          >
            <X className="size-[15px]" aria-hidden />
          </button>
          <button
            type="button"
            onClick={escolher}
            aria-label={`Trocar foto de ${rotulo}`}
            className="grid size-[30px] place-items-center rounded-full bg-black/60 text-white"
          >
            <RefreshCw className="size-[14px]" aria-hidden />
          </button>
        </div>
      )}
    </li>
  );
}
