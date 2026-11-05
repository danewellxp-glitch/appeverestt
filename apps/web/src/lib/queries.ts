import { useQuery } from '@tanstack/react-query';
import type {
  DesafioAtual,
  DiaDetalhe,
  FeedResposta,
  MeResposta,
  MeuProgresso,
  RankingResposta,
  TreinosTurmaResposta,
  TurmaHojeResposta,
} from '@everest/shared';
import { api, ehApiError } from './api';

/** Chaves de cache do TanStack Query (use sempre estas). */
export const chaves = {
  me: ['me'] as const,
  desafioAtual: ['desafio', 'atual'] as const,
  progresso: (slug: string) => ['progresso', slug] as const,
  dia: (slug: string, n: number) => ['dia', slug, n] as const,
  ranking: (slug: string) => ['ranking', slug] as const,
  feed: (slug: string) => ['feed', slug] as const,
  turmaHoje: (slug: string) => ['turma', 'hoje', slug] as const,
  /** `dia` null = o dia atual (padrão do servidor). */
  treinosTurma: (slug: string, dia: number | null) => ['turma', 'treinos', slug, dia] as const,
  pagamento: (slug: string) => ['pagamento', slug] as const,
  feedback: (slug: string) => ['feedback', slug] as const,
  adminParticipantes: (slug: string) => ['admin', 'participantes', slug] as const,
  adminParticipante: (slug: string, id: string) => ['admin', 'participante', slug, id] as const,
  adminDia: (slug: string, id: string, n: number) => ['admin', 'dia', slug, id, n] as const,
  adminFeedbacks: (slug: string) => ['admin', 'feedbacks', slug] as const,
};

/** Usuário logado (ou null se visitante). 401 aqui não é erro. */
export function useMe() {
  return useQuery({
    queryKey: chaves.me,
    queryFn: async ({ signal }): Promise<MeResposta | null> => {
      try {
        return await api<MeResposta>('/auth/me', { signal, silenciar401: true });
      } catch (e) {
        if (ehApiError(e, 'NAO_AUTENTICADO')) return null;
        throw e;
      }
    },
    staleTime: 5 * 60_000,
  });
}

export function useDesafioAtual(opcoes: { atualizarACada?: number } = {}) {
  return useQuery({
    queryKey: chaves.desafioAtual,
    queryFn: ({ signal }) => api<DesafioAtual>('/desafios/atual', { signal }),
    // refetchInterval só roda com a aba visível (refetchIntervalInBackground = false)
    refetchInterval: opcoes.atualizarACada ?? false,
    refetchIntervalInBackground: false,
  });
}

export function useMeuProgresso(slug: string | undefined) {
  return useQuery({
    queryKey: chaves.progresso(slug ?? ''),
    queryFn: ({ signal }) => api<MeuProgresso>(`/desafios/${slug ?? ''}/meu-progresso`, { signal }),
    enabled: Boolean(slug),
  });
}

export function useDia(slug: string | undefined, n: number | null) {
  return useQuery({
    queryKey: chaves.dia(slug ?? '', n ?? 0),
    queryFn: ({ signal }) => api<DiaDetalhe>(`/desafios/${slug ?? ''}/dias/${n ?? 0}`, { signal }),
    enabled: Boolean(slug) && n !== null && n > 0,
    // URLs assinadas valem 10 min: renova antes disso
    staleTime: 60_000,
    refetchInterval: 8 * 60_000,
  });
}

export function useRanking(slug: string | undefined) {
  return useQuery({
    queryKey: chaves.ranking(slug ?? ''),
    queryFn: ({ signal }) => api<RankingResposta>(`/desafios/${slug ?? ''}/ranking`, { signal }),
    enabled: Boolean(slug),
  });
}

/** Atividade do grupo no dia (inscrito ou admin). O servidor guarda 60 s em cache. */
export function useFeed(slug: string | undefined) {
  return useQuery({
    queryKey: chaves.feed(slug ?? ''),
    queryFn: ({ signal }) => api<FeedResposta>(`/desafios/${encodeURIComponent(slug ?? '')}/feed`, { signal }),
    enabled: Boolean(slug),
  });
}

/** Quem fechou e quem falta fechar o dia atual (aba Hoje do ranking). O servidor guarda 60 s. */
export function useTurmaHoje(slug: string | undefined) {
  return useQuery({
    queryKey: chaves.turmaHoje(slug ?? ''),
    queryFn: ({ signal }) =>
      api<TurmaHojeResposta>(`/desafios/${encodeURIComponent(slug ?? '')}/turma/hoje`, { signal }),
    enabled: Boolean(slug),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}

/** Fotos de treino da turma num dia (null = dia atual) e a pose do dia. URLs assinadas valem 10 min. */
export function useTreinosTurma(slug: string | undefined, dia: number | null, opcoes: { habilitado?: boolean } = {}) {
  return useQuery({
    queryKey: chaves.treinosTurma(slug ?? '', dia),
    queryFn: ({ signal }) =>
      api<TreinosTurmaResposta>(
        `/desafios/${encodeURIComponent(slug ?? '')}/turma/treinos${dia === null ? '' : `?dia=${dia}`}`,
        { signal },
      ),
    enabled: Boolean(slug) && (opcoes.habilitado ?? true),
    staleTime: 30_000,
    refetchInterval: 8 * 60_000,
    refetchIntervalInBackground: false,
  });
}
