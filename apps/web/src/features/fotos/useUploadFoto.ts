import { useQueryClient } from '@tanstack/react-query';
import {
  MIME_TYPES_FOTO,
  TAMANHO_MAX_FOTO_BYTES,
  type ConfirmarFotoResposta,
  type MimeTypeFoto,
  type TipoFoto,
  type UploadUrlResposta,
} from '@everest/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ehApiError } from '../../lib/api';
import { MENSAGENS_ERRO } from '../../lib/erros';
import { chaves } from '../../lib/queries';
import { comprimirFoto } from './comprimir';
import { enviarArquivo } from './enviarArquivo';

export type FaseUpload = 'comprimindo' | 'enviando' | 'confirmando';

export interface UploadEmAndamento {
  fase: FaseUpload;
  /** 0–100, só significativo na fase "enviando". */
  progresso: number;
  /** Object URL local, para mostrar a foto antes de o servidor ter a sua. */
  previewUrl: string;
}

export interface EstadoFoto {
  upload: UploadEmAndamento | null;
  removendo: boolean;
  erro: string | null;
}

const ESTADO_INICIAL: EstadoFoto = { upload: null, removendo: false, erro: null };

class ErroFoto extends Error {}

function ehMimeTypeFoto(tipo: string): tipo is MimeTypeFoto {
  return (MIME_TYPES_FOTO as readonly string[]).includes(tipo);
}

function mensagemErro(e: unknown): string {
  if (e instanceof ErroFoto) return e.message;
  if (ehApiError(e)) return e.message;
  return 'Não foi possível enviar a foto. Tente de novo.';
}

/**
 * Upload e remoção das fotos de prova de um dia:
 * comprime → pede a upload-url → PUT direto no storage (com progresso) → confirma → recarrega o dia.
 */
export function useFotosDia(slug: string, numeroDia: number) {
  const qc = useQueryClient();
  const [estados, setEstados] = useState<Partial<Record<TipoFoto, EstadoFoto>>>({});
  const previews = useRef(new Set<string>());

  // Libera as prévias locais que ainda existirem quando o componente sair da tela.
  useEffect(() => {
    const conjunto = previews.current;
    return () => {
      for (const url of conjunto) URL.revokeObjectURL(url);
      conjunto.clear();
    };
  }, []);

  const atualizar = useCallback((tipo: TipoFoto, fn: (anterior: EstadoFoto) => EstadoFoto) => {
    setEstados((s) => ({ ...s, [tipo]: fn(s[tipo] ?? ESTADO_INICIAL) }));
  }, []);

  const recarregar = useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: chaves.dia(slug, numeroDia) }),
      qc.invalidateQueries({ queryKey: chaves.progresso(slug) }),
      qc.invalidateQueries({ queryKey: chaves.ranking(slug) }),
    ]);
  }, [qc, slug, numeroDia]);

  const enviar = useCallback(
    async (tipo: TipoFoto, arquivo: File) => {
      const previewUrl = URL.createObjectURL(arquivo);
      previews.current.add(previewUrl);
      const fase = (f: FaseUpload, progresso = 0) =>
        atualizar(tipo, (a) => ({ ...a, erro: null, upload: { fase: f, progresso, previewUrl } }));
      fase('comprimindo');
      let pediuUrl = false;
      try {
        if (arquivo.type !== '' && !arquivo.type.startsWith('image/')) {
          throw new ErroFoto('Esse arquivo não é uma imagem. Escolha uma foto.');
        }
        let comprimido: File;
        try {
          comprimido = await comprimirFoto(arquivo);
        } catch {
          throw new ErroFoto('Não conseguimos abrir essa imagem. Escolha outra foto (JPG ou PNG).');
        }
        if (comprimido.size === 0) throw new ErroFoto(MENSAGENS_ERRO.FOTO_INVALIDA);
        if (comprimido.size > TAMANHO_MAX_FOTO_BYTES) throw new ErroFoto(MENSAGENS_ERRO.FOTO_GRANDE_DEMAIS);
        const mimeType: MimeTypeFoto = ehMimeTypeFoto(comprimido.type) ? comprimido.type : 'image/jpeg';

        fase('enviando');
        pediuUrl = true;
        const destino = await api<UploadUrlResposta>(`/desafios/${slug}/dias/${numeroDia}/fotos/upload-url`, {
          method: 'POST',
          body: { tipo, mimeType, tamanhoBytes: comprimido.size },
        });
        await enviarArquivo(destino.uploadUrl, destino.headers, comprimido, (p) => fase('enviando', p));

        fase('confirmando', 100);
        await api<ConfirmarFotoResposta>(
          `/desafios/${slug}/dias/${numeroDia}/fotos/${destino.fotoId}/confirmar`,
          { method: 'POST' },
        );
        // Espera o dia recarregar (foto ENVIADA com URL do servidor) antes de soltar a prévia local.
        await recarregar();
        atualizar(tipo, (a) => ({ ...a, upload: null, erro: null }));
      } catch (e) {
        atualizar(tipo, (a) => ({ ...a, upload: null, erro: mensagemErro(e) }));
        // A foto anterior continua valendo no servidor até a nova ser confirmada (R17): recarrega
        // para o slot voltar a mostrá-la.
        if (pediuUrl) void recarregar();
      } finally {
        URL.revokeObjectURL(previewUrl);
        previews.current.delete(previewUrl);
      }
    },
    [atualizar, recarregar, slug, numeroDia],
  );

  const remover = useCallback(
    async (tipo: TipoFoto) => {
      atualizar(tipo, (a) => ({ ...a, removendo: true, erro: null }));
      try {
        await api<{ ok: true }>(`/desafios/${slug}/dias/${numeroDia}/fotos/${tipo}`, { method: 'DELETE' });
        await recarregar();
        atualizar(tipo, (a) => ({ ...a, removendo: false }));
      } catch (e) {
        if (ehApiError(e, 'NAO_ENCONTRADO')) {
          // Já não existia: só sincroniza.
          await recarregar();
          atualizar(tipo, (a) => ({ ...a, removendo: false }));
          return;
        }
        atualizar(tipo, (a) => ({ ...a, removendo: false, erro: mensagemErro(e) }));
      }
    },
    [atualizar, recarregar, slug, numeroDia],
  );

  return { estados, enviar, remover };
}
