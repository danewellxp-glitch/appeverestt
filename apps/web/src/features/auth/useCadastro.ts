import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CadastroInput, MeResposta } from '@everest/shared';
import { api } from '../../lib/api';
import { chaves } from '../../lib/queries';
import { limparDadosDeSessaoAnterior } from './sessao';

/** POST /auth/cadastro: cria a conta e já abre a sessão (cookie). */
export function useCadastro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: CadastroInput) =>
      api<MeResposta>('/auth/cadastro', { method: 'POST', body: dados, silenciar401: true }),
    onSuccess: (me) => {
      limparDadosDeSessaoAnterior(qc);
      qc.setQueryData(chaves.me, me);
    },
  });
}
