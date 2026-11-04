import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  TIMEZONE_PADRAO,
  type AdicionarParticipanteInput,
  type AdminDesafioConfig,
  type AdminDesafiosResposta,
  type AdminDiaDetalhe,
  type AdminFeedbacksResposta,
  type AdminMetricas,
  type AdminParticipante,
  type AdminParticipanteDetalhe,
  type AdminParticipantesResposta,
  type AvisoPushInput,
  type AvisoPushResultado,
  type AtualizarDesafioInput,
  type ConferenciaInput,
  type ConferenciaResposta,
  type CriarDesafioInput,
  type InvalidacaoInput,
  type InvalidacaoResposta,
  type PagamentoAdminInput,
  type PushResumoAdmin,
} from '@everest/shared';
import { api, ehApiError } from '../../lib/api';
import { chaves, useDesafioAtual, useMe } from '../../lib/queries';

/** Chaves de cache do painel (todas começam com 'admin': `invalidateQueries(['admin'])` pega tudo). */
export const chavesAdmin = {
  desafios: ['admin', 'desafios'] as const,
  desafio: (slug: string) => ['admin', 'desafio', slug] as const,
  metricas: (slug: string) => ['admin', 'metricas', slug] as const,
  push: (slug: string) => ['admin', 'push', slug] as const,
};

/** Indicadores se atualizam sozinhos a cada 60 s (só com a aba visível). */
export const INTERVALO_METRICAS_MS = 60_000;

/**
 * Slug do desafio para as telas do embaixador: o da participação do admin ou,
 * se ele não estiver inscrito, o do desafio ativo. Sem desafio ativo (404) não é erro: slug vazio.
 */
export function useSlugAdmin() {
  const me = useMe();
  const desafio = useDesafioAtual();
  const slug = me.data?.participacao?.desafioSlug ?? desafio.data?.slug;
  const carregando = !slug && (me.isPending || desafio.isPending);
  const semDesafioAtivo = ehApiError(desafio.error, 'NAO_ENCONTRADO');
  const erro = !slug && !carregando && (me.isError || (desafio.isError && !semDesafioAtivo));
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

export function useAdminFeedbacks(slug: string | undefined) {
  return useQuery({
    queryKey: chaves.adminFeedbacks(slug ?? ''),
    queryFn: ({ signal }) => api<AdminFeedbacksResposta>(`/admin/desafios/${slug ?? ''}/feedbacks`, { signal }),
    enabled: Boolean(slug),
  });
}

/** Caminho do CSV com os dados de todos (baixado por um <a download>, não pelo `api()`). */
export function caminhoCsvParticipantes(slug: string): string {
  return `/api/admin/desafios/${encodeURIComponent(slug)}/participantes.csv`;
}

/**
 * Depois de mexer no pagamento ou remover alguém: telas do admin, vagas do desafio, ranking e
 * feed (só confirmados contam). `refetch: false` só marca como desatualizado (sem buscar agora).
 */
async function invalidarAposPagamento(qc: QueryClient, refetch = true): Promise<void> {
  const refetchType = refetch ? 'active' : 'none';
  await Promise.all([
    qc.invalidateQueries({ queryKey: ['admin'], refetchType }),
    qc.invalidateQueries({ queryKey: chaves.desafioAtual }),
    qc.invalidateQueries({ queryKey: ['ranking'] }),
    qc.invalidateQueries({ queryKey: ['feed'] }),
  ]);
}

/** PATCH .../participantes/:id/pagamento: confirma o Pix ou volta para pendente ("Não recebi"). */
export function useAtualizarPagamento(slug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ participanteId, ...input }: PagamentoAdminInput & { participanteId: string }) =>
      api<unknown>(
        `/admin/desafios/${slug ?? ''}/participantes/${encodeURIComponent(participanteId)}/pagamento`,
        { method: 'PATCH', body: input },
      ),
    onSuccess: () => invalidarAposPagamento(qc),
  });
}

/**
 * DELETE .../participantes/:id: remove uma inscrição não paga (libera a vaga).
 * Não rebusca agora: a tela do participante removido fecha logo em seguida (voltaria 404).
 */
export function useRemoverParticipante(slug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (participanteId: string) =>
      api<{ ok: true }>(`/admin/desafios/${slug ?? ''}/participantes/${encodeURIComponent(participanteId)}`, {
        method: 'DELETE',
      }),
    onSuccess: () => invalidarAposPagamento(qc, false),
  });
}

/** Coloca a configuração nova nos caches do painel (lista de desafios, desafio e participantes). */
function guardarDesafio(qc: QueryClient, desafio: AdminDesafioConfig): void {
  qc.setQueryData(chavesAdmin.desafio(desafio.slug), desafio);
  qc.setQueryData<AdminDesafiosResposta>(chavesAdmin.desafios, (antigo) => {
    if (!antigo) return antigo;
    const existe = antigo.desafios.some((d) => d.slug === desafio.slug);
    const desafios = existe
      ? antigo.desafios.map((d) => (d.slug === desafio.slug ? desafio : d))
      : [desafio, ...antigo.desafios];
    // Só um ativo por vez: ativar este desativa os outros.
    return {
      desafios: desafio.ativo
        ? desafios.map((d) => (d.slug === desafio.slug ? d : { ...d, ativo: false }))
        : desafios,
    };
  });
  qc.setQueryData<AdminParticipantesResposta>(chaves.adminParticipantes(desafio.slug), (antigo) =>
    antigo
      ? {
          ...antigo,
          desafio: {
            slug: desafio.slug,
            nome: desafio.nome,
            inscricoesAbertas: desafio.inscricoesAbertas,
            totalVagas: desafio.totalVagas,
          },
        }
      : antigo,
  );
}

/**
 * Depois de criar/editar/ativar um desafio: painel, desafio público e `me` (a participação do
 * admin é a do desafio ativo), além de ranking e feed.
 */
async function invalidarAposDesafio(qc: QueryClient): Promise<void> {
  await Promise.all([
    qc.invalidateQueries({ queryKey: ['admin'] }),
    qc.invalidateQueries({ queryKey: chaves.desafioAtual }),
    qc.invalidateQueries({ queryKey: chaves.me }),
    qc.invalidateQueries({ queryKey: ['ranking'] }),
    qc.invalidateQueries({ queryKey: ['feed'] }),
  ]);
}

/** Abre/fecha as inscrições. Atualiza o cache da lista e o desafio atual. */
export function useAtualizarInscricoes(slug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AtualizarDesafioInput) =>
      api<AdminDesafioConfig>(`/admin/desafios/${slug ?? ''}`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: (desafio) => {
      guardarDesafio(qc, desafio);
      void qc.invalidateQueries({ queryKey: chaves.desafioAtual });
      void qc.invalidateQueries({ queryKey: chavesAdmin.desafios });
    },
  });
}

/** GET /admin/desafios: todos os desafios (o ativo primeiro). */
export function useAdminDesafios() {
  return useQuery({
    queryKey: chavesAdmin.desafios,
    queryFn: ({ signal }) => api<AdminDesafiosResposta>('/admin/desafios', { signal }),
  });
}

/** GET /admin/desafios/:slug (com o valor da lista como prévia, se já estiver no cache). */
export function useAdminDesafio(slug: string | undefined) {
  const qc = useQueryClient();
  return useQuery<AdminDesafioConfig>({
    queryKey: chavesAdmin.desafio(slug ?? ''),
    queryFn: ({ signal }) =>
      api<AdminDesafioConfig>(`/admin/desafios/${encodeURIComponent(slug ?? '')}`, { signal }),
    enabled: Boolean(slug),
    placeholderData: () =>
      qc.getQueryData<AdminDesafiosResposta>(chavesAdmin.desafios)?.desafios.find((d) => d.slug === slug),
  });
}

/** GET /admin/desafios/:slug/metricas, atualizado a cada 60 s com a aba visível. */
export function useAdminMetricas(slug: string | undefined) {
  return useQuery({
    queryKey: chavesAdmin.metricas(slug ?? ''),
    queryFn: ({ signal }) =>
      api<AdminMetricas>(`/admin/desafios/${encodeURIComponent(slug ?? '')}/metricas`, { signal }),
    enabled: Boolean(slug),
    refetchInterval: INTERVALO_METRICAS_MS,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
  });
}

/** POST /admin/desafios: cria (e, com `ativar`, já ativa) um desafio. */
export function useCriarDesafio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CriarDesafioInput) =>
      api<AdminDesafioConfig>('/admin/desafios', { method: 'POST', body: input }),
    onSuccess: async (desafio) => {
      guardarDesafio(qc, desafio);
      await invalidarAposDesafio(qc);
    },
  });
}

/** PATCH /admin/desafios/:slug com o slug na chamada (editar qualquer desafio, ou ativar). */
export function useAtualizarDesafio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, ...input }: AtualizarDesafioInput & { slug: string }) =>
      api<AdminDesafioConfig>(`/admin/desafios/${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: async (desafio) => {
      guardarDesafio(qc, desafio);
      await invalidarAposDesafio(qc);
    },
  });
}

/** POST .../participantes: inscreve quem já tem conta (pelo e-mail), com o status do pagamento. */
export function useAdicionarParticipante(slug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AdicionarParticipanteInput) =>
      api<AdminParticipante>(`/admin/desafios/${encodeURIComponent(slug ?? '')}/participantes`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => invalidarAposPagamento(qc),
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

/** GET /admin/desafios/:slug/push: quantos confirmados têm o push ativo (aba Avisos, R22). */
export function useAdminPush(slug: string | undefined) {
  return useQuery({
    queryKey: chavesAdmin.push(slug ?? ''),
    queryFn: ({ signal }) =>
      api<PushResumoAdmin>(`/admin/desafios/${encodeURIComponent(slug ?? '')}/push`, { signal }),
    enabled: Boolean(slug),
  });
}

/** POST /admin/desafios/:slug/avisos: dispara um aviso pronto (água/treino/leitura) ou livre. */
export function useEnviarAviso(slug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AvisoPushInput) =>
      api<AvisoPushResultado>(`/admin/desafios/${encodeURIComponent(slug ?? '')}/avisos`, {
        method: 'POST',
        body: input,
      }),
    // Inscrições vencidas saem no envio: a contagem muda.
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesAdmin.push(slug ?? '') }),
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
