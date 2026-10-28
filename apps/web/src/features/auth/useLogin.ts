import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { LoginInput, MeResposta } from '@everest/shared';
import { api } from '../../lib/api';
import { chaves } from '../../lib/queries';
import { limparDadosDeSessaoAnterior } from './sessao';

/** POST /auth/login. 401 (credenciais inválidas) não dispara o "deslogar" global. */
export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: LoginInput) =>
      api<MeResposta>('/auth/login', { method: 'POST', body: dados, silenciar401: true }),
    onSuccess: (me) => {
      limparDadosDeSessaoAnterior(qc);
      qc.setQueryData(chaves.me, me);
    },
  });
}
