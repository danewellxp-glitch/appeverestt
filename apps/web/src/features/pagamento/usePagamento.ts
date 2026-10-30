import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MeResposta, PagamentoResposta } from '@everest/shared';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useToast } from '../../components/ui/Toast';
import { api, ehApiError } from '../../lib/api';
import { chaves } from '../../lib/queries';
import { limparInicioPix } from './useTemporizador';

/** Intervalo do polling: 30 s esperando a conferência, 60 s pendente, parado depois de confirmado. */
export function intervaloDoPagamento(status: PagamentoResposta['status'] | undefined): number | false {
  if (status === 'INFORMADO') return 30_000;
  if (status === 'PENDENTE') return 60_000;
  return false;
}

/**
 * GET /desafios/:slug/pagamento (sem o gate do pagamento). Acompanha o status por polling
 * (só com a aba visível) e, quando vira CONFIRMADO, atualiza o `me` para os guards liberarem
 * as telas do desafio. 403 NAO_INSCRITO (o embaixador removeu a inscrição) → volta para a capa.
 */
export function usePagamento(slug: string | undefined, participanteId: string | undefined) {
  const qc = useQueryClient();
  const navegar = useNavigate();
  const { toast } = useToast();
  const consulta = useQuery({
    queryKey: chaves.pagamento(slug ?? ''),
    queryFn: ({ signal }) =>
      api<PagamentoResposta>(`/desafios/${encodeURIComponent(slug ?? '')}/pagamento`, { signal }),
    enabled: Boolean(slug),
    refetchInterval: (q) => intervaloDoPagamento(q.state.data?.status),
    refetchIntervalInBackground: false,
  });

  const status = consulta.data?.status;
  // Só confia num CONFIRMADO buscado nesta montagem: um cache antigo não pode sobrescrever o `me`
  // (ex.: o embaixador voltou o pagamento para pendente depois da confirmação).
  const confirmadoAgora = status === 'CONFIRMADO' && consulta.isFetchedAfterMount;
  useEffect(() => {
    if (!confirmadoAgora) return;
    qc.setQueryData<MeResposta | null>(chaves.me, (atual) =>
      atual?.participacao
        ? { ...atual, participacao: { ...atual.participacao, pagamentoStatus: 'CONFIRMADO' } }
        : atual,
    );
    void qc.invalidateQueries({ queryKey: chaves.me });
    void qc.invalidateQueries({ queryKey: chaves.desafioAtual });
    if (participanteId) limparInicioPix(participanteId);
  }, [confirmadoAgora, participanteId, qc]);

  const removido = ehApiError(consulta.error, 'NAO_INSCRITO');
  useEffect(() => {
    if (!removido) return;
    // Sem isso o erro antigo fica no cache e uma nova inscrição cairia de novo aqui.
    qc.removeQueries({ queryKey: chaves.pagamento(slug ?? '') });
    qc.setQueryData<MeResposta | null>(chaves.me, (atual) => (atual ? { ...atual, participacao: null } : atual));
    void qc.invalidateQueries({ queryKey: chaves.me });
    void qc.invalidateQueries({ queryKey: chaves.desafioAtual });
    if (participanteId) limparInicioPix(participanteId);
    toast('Sua inscrição foi removida pelo embaixador. Você pode se inscrever de novo.', { duracao: 6000 });
    void navegar('/', { replace: true });
  }, [removido, slug, participanteId, qc, toast, navegar]);

  return { ...consulta, removido };
}

/** POST /desafios/:slug/pagamento/informar ("Já fiz o pagamento"). Idempotente na API. */
export function useInformarPagamento(slug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api<PagamentoResposta>(`/desafios/${encodeURIComponent(slug ?? '')}/pagamento/informar`, { method: 'POST' }),
    onSuccess: (resposta) => {
      qc.setQueryData(chaves.pagamento(slug ?? ''), resposta);
    },
    onError: (erro) => {
      // Já confirmado (o embaixador foi mais rápido): recarrega e a tela mostra a vaga.
      if (ehApiError(erro, 'PAGAMENTO_JA_CONFIRMADO')) {
        void qc.invalidateQueries({ queryKey: chaves.pagamento(slug ?? '') });
      }
    },
  });
}
