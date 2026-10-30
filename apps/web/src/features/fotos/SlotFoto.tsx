import type { FotoDia, TipoFoto } from '@everest/shared';
import { Camera, ImagePlus, Loader2, RefreshCw, Trash } from 'lucide-react';
import { useRef, useState } from 'react';
import { Botao } from '../../components/ui/Botao';
import { Barra } from '../../components/ui/Barra';
import { ROTULO_TIPO_FOTO, fotoEhValida } from './fotosValidas';
import type { EstadoFoto } from './useUploadFoto';

type Tom = 'neutro' | 'sucesso' | 'erro';

function situacao(foto: FotoDia | undefined, estado: EstadoFoto | undefined): { texto: string; tom: Tom } | null {
  const upload = estado?.upload;
  if (upload) {
    if (upload.fase === 'comprimindo') return { texto: 'Preparando a foto…', tom: 'neutro' };
    // Anuncia em passos de 10% (a região é aria-live; a barra mostra o valor exato).
    if (upload.fase === 'enviando') return { texto: `Enviando ${Math.floor(upload.progresso / 10) * 10}%`, tom: 'neutro' };
    return { texto: 'Confirmando envio…', tom: 'neutro' };
  }
  if (estado?.removendo) return { texto: 'Removendo…', tom: 'neutro' };
  if (estado?.erro) return { texto: estado.erro, tom: 'erro' };
  switch (foto?.status) {
    case 'ENVIADA':
      return { texto: 'Processando…', tom: 'neutro' };
    case 'CONFIRMADA':
      return { texto: 'Confirmada', tom: 'sucesso' };
    case 'REJEITADA':
      return { texto: 'Rejeitada — envie outra', tom: 'erro' };
    case 'PENDENTE':
      return { texto: 'Envio não concluído — envie de novo', tom: 'erro' };
    default:
      return null;
  }
}

const COR_TOM: Record<Tom, string> = {
  neutro: 'text-texto-2',
  sucesso: 'text-sucesso',
  erro: 'text-vermelho-texto',
};

/** Um slot de foto de prova: prévia, estado, enviar/trocar/remover. */
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
  const entrada = useRef<HTMLInputElement>(null);
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false);

  const upload = estado?.upload ?? null;
  const ocupado = Boolean(upload) || Boolean(estado?.removendo);
  const valida = fotoEhValida(foto);
  const preview = upload?.previewUrl ?? (valida ? (foto.thumbUrl ?? foto.url) : null);
  const status = situacao(foto, estado);

  return (
    <li className="flex gap-3 rounded-xl border border-borda bg-superficie-2 p-3">
      <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-fundo">
        {preview ? (
          <img
            src={preview}
            alt={`Foto de prova: ${rotulo}`}
            className={`size-full object-cover ${upload ? 'opacity-60' : ''}`}
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1 text-texto-2">
            <Camera className="size-6" aria-hidden />
            <span className="text-[11px]">Sem foto</span>
          </div>
        )}
        {(upload || foto?.status === 'ENVIADA') && !estado?.erro && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-white drop-shadow" aria-hidden />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h3 className="font-bold">
          {rotulo}
        </h3>
        <div aria-live="polite" className="text-sm">
          {status && <p className={COR_TOM[status.tom]}>{status.texto}</p>}
        </div>
        {upload?.fase === 'enviando' && (
          <Barra valor={upload.progresso} maximo={100} rotulo={`Envio da foto de ${rotulo}`} />
        )}

        {editavel && (
          <>
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
            {confirmandoRemocao ? (
              <div className="flex flex-wrap gap-2">
                <Botao
                  variante="primario"
                  className="flex-1"
                  onClick={() => {
                    setConfirmandoRemocao(false);
                    aoRemover();
                  }}
                >
                  Remover
                </Botao>
                <Botao variante="secundario" className="flex-1" onClick={() => setConfirmandoRemocao(false)}>
                  Cancelar
                </Botao>
              </div>
            ) : valida ? (
              <div className="flex flex-wrap gap-2">
                <Botao
                  variante="secundario"
                  className="flex-1"
                  disabled={ocupado}
                  onClick={() => entrada.current?.click()}
                  icone={<RefreshCw className="size-4" aria-hidden />}
                  aria-label={`Trocar foto de ${rotulo}`}
                >
                  Trocar
                </Botao>
                <Botao
                  variante="fantasma"
                  className="flex-1"
                  disabled={ocupado}
                  onClick={() => setConfirmandoRemocao(true)}
                  icone={<Trash className="size-4" aria-hidden />}
                  aria-label={`Remover foto de ${rotulo}`}
                >
                  Remover
                </Botao>
              </div>
            ) : (
              <Botao
                variante="secundario"
                larguraTotal
                disabled={ocupado}
                onClick={() => entrada.current?.click()}
                icone={<ImagePlus className="size-4" aria-hidden />}
                aria-label={`Enviar foto de ${rotulo}`}
              >
                Enviar foto
              </Botao>
            )}
          </>
        )}
      </div>
    </li>
  );
}
