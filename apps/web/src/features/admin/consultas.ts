import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  TIMEZONE_PADRAO,
  type AdminDiaDetalhe,
  type AdminParticipanteDetalhe,
  type AdminParticipantesResposta,
  type AtualizarDesafioInput,
  type ConferenciaInput,
  type ConferenciaResposta,
  type InvalidacaoInput,
  type InvalidacaoResposta,
} from '@everest/shared';
import { api } from '../../lib/api';
import { chaves, useDesafioAtual, useMe } from '../../lib/queries';

/**
 * Slug do desafio para as telas do embaixador: o da participação do admin ou,
 * se ele não estiver inscrito, o do desafio ativo.
 */
export function useSlugAdmin() {
  const me = useMe();
  const desafio = useDesafioAtual();
  const slug = me.data?.participacao?.desafioSlug ?? desafio.data?.slug;
  const carregando = !slug && (me.isPending || desafio.isPending);
  const erro = !slug && !carregando && (me.isError || desafio.isError);
  return {
    slug,
    carregando,
    erro,
    tentarDeNovo: () => {
      void me.refetch();
      void desafio.refetch();
    },
  };
}

export function useAdminParticipantes(slug: string | undefined) {
  return useQuery({
    queryKey: chaves.adminParticipantes(slug ?? ''),
    queryFn: ({ signal }) =>
      api<AdminParticipantesResposta>(`/admin/desafios/${slug ?? ''}/participantes`, { signal }),
    enabled: Boolean(slug),
  });
}

export function useAdminParticipante(slug: string | undefined, id: string | undefined) {
  return useQuery({
    queryKey: chaves.adminParticipante(slug ?? '', id ?? ''),
    queryFn: ({ signal }) =>
      api<AdminParticipanteDetalhe>(
        `/admin/desafios/${slug ?? ''}/participantes/${encodeURIComponent(id ?? '')}`,
        { signal },
      ),
    enabled: Boolean(slug) && Boolean(id),
  });
}

export function useAdminDia(slug: string | undefined, id: string | undefined, n: number | null) {
  return useQuery({
    queryKey: chaves.adminDia(slug ?? '', id ?? '', n ?? 0),
    queryFn: ({ signal }) =>
      api<AdminDiaDetalhe>(
        `/admin/desafios/${slug ?? ''}/participantes/${encodeURIComponent(id ?? '')}/dias/${n ?? 0}`,
        { signal },
      ),
    enabled: Boolean(slug) && Boolean(id) && n !== null && n > 0,
    // URLs assinadas das fotos valem 10 min: renova antes disso
    staleTime: 60_000,
    refetchInterval: 8 * 60_000,
  });
}

/** Abre/fecha as inscrições. Atualiza o cache da lista e o desafio atual. */
export function useAtualizarInscricoes(slug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AtualizarDesafioInput) =>
      api<AdminParticipantesResposta['desafio']>(`/admin/desafios/${slug ?? ''}`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: (desafio) => {
      qc.setQueryData<AdminParticipantesResposta>(
        chaves.adminParticipantes(desafio.slug),
        (antigo) => (antigo ? { ...antigo, desafio } : antigo),
      );
      void qc.invalidateQueries({ queryKey: chaves.desafioAtual });
    },
  });
}

/** Invalida ou revalida um dia. Recarrega telas admin, ranking e progresso. */
export function useInvalidacaoDia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ diaId, ...input }: InvalidacaoInput & { diaId: string }) =>
      api<InvalidacaoResposta>(`/admin/dias/${encodeURIComponent(diaId)}/invalidacao`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['admin'] }),
        qc.invalidateQueries({ queryKey: ['ranking'] }),
        qc.invalidateQueries({ queryKey: ['progresso'] }),
        qc.invalidateQueries({ queryKey: ['dia'] }),
      ]);
    },
  });
}

/** Aprova (ou desfaz a aprovação de) um dia na fila de conferência (X8). */
export function useConferenciaDia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ diaId, ...input }: ConferenciaInput & { diaId: string }) =>
      api<ConferenciaResposta>(`/admin/dias/${encodeURIComponent(diaId)}/conferencia`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

const FORMATO_DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: TIMEZONE_PADRAO,
});

/** Data e hora de um ISO 8601 completo (ex.: invalidadoEm), no fuso padrão do desafio. */
export function formatarDataHora(iso: string): string {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? iso : FORMATO_DATA_HORA.format(data);
}
