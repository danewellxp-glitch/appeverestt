import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FeedbackInput, FeedbackResposta } from '@everest/shared';
import { api } from '../../lib/api';
import { chaves } from '../../lib/queries';

/** GET /desafios/:slug/feedback (null = ainda não enviou). */
export function useFeedback(slug: string | undefined) {
  return useQuery({
    queryKey: chaves.feedback(slug ?? ''),
    queryFn: ({ signal }) => api<FeedbackResposta>(`/desafios/${encodeURIComponent(slug ?? '')}/feedback`, { signal }),
    enabled: Boolean(slug),
  });
}

/** PUT /desafios/:slug/feedback (cria ou atualiza). Atualiza o cache e a lista do admin. */
export function useSalvarFeedback(slug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FeedbackInput) =>
      api<FeedbackResposta>(`/desafios/${encodeURIComponent(slug ?? '')}/feedback`, { method: 'PUT', body: input }),
    onSuccess: (resposta) => {
      qc.setQueryData(chaves.feedback(slug ?? ''), resposta);
      void qc.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}
