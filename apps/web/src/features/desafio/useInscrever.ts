import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { InscricaoResposta, MeResposta } from '@everest/shared';
import { api, ehApiError } from '../../lib/api';
import { chaves } from '../../lib/queries';

/** Erros de inscrição que mudam o estado do desafio (o contador precisa ser recarregado). */
const ERROS_QUE_MUDAM_VAGAS = ['VAGAS_ESGOTADAS', 'INSCRICOES_FECHADAS', 'DESAFIO_ENCERRADO'] as const;

/**
 * POST /desafios/{slug}/inscricao (idempotente).
 * No sucesso, grava a participação no `me` ANTES de qualquer navegação, para o
 * RotaInscrito não devolver a pessoa para "/" com o cache antigo.
 */
export function useInscrever() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) =>
      api<InscricaoResposta>(`/desafios/${encodeURIComponent(slug)}/inscricao`, { method: 'POST' }),
    onSuccess: (resposta) => {
      qc.setQueryData<MeResposta | null>(chaves.me, (atual) =>
        atual ? { ...atual, participacao: resposta.participacao } : atual,
      );
      void qc.invalidateQueries({ queryKey: chaves.me });
      void qc.invalidateQueries({ queryKey: chaves.desafioAtual });
    },
    onError: (erro) => {
      if (ERROS_QUE_MUDAM_VAGAS.some((codigo) => ehApiError(erro, codigo))) {
        void qc.invalidateQueries({ queryKey: chaves.desafioAtual });
      }
    },
  });
}
