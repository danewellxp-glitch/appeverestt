import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { api } from '../../lib/api';
import { chaves } from '../../lib/queries';

export function useLogout() {
  const qc = useQueryClient();
  const navegar = useNavigate();
  return useMutation({
    mutationFn: () => api<{ ok: true }>('/auth/logout', { method: 'POST', silenciar401: true }),
    onSettled: () => {
      qc.setQueryData(chaves.me, null);
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' && q.queryKey[0] !== 'desafio' });
      void navegar('/', { replace: true });
    },
  });
}
