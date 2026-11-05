import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { api } from '../../lib/api';
import { chaves } from '../../lib/queries';
import { desligarPushAoSair } from '../push/usePush';

export function useLogout() {
  const qc = useQueryClient();
  const navegar = useNavigate();
  return useMutation({
    mutationFn: async () => {
      // Com a sessão ainda válida: o próximo a usar este aparelho não recebe os lembretes desta conta.
      await desligarPushAoSair();
      return api<{ ok: true }>('/auth/logout', { method: 'POST', silenciar401: true });
    },
    onSettled: async () => {
      // Navega antes de limpar a sessão: senão a rota protegida manda para /entrar primeiro.
      // flushSync: a tela nova monta já, antes de a sessão sumir (senão a rota protegida antiga redireciona).
      await navegar('/', { replace: true, flushSync: true });
      qc.setQueryData(chaves.me, null);
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' && q.queryKey[0] !== 'desafio' });
    },
  });
}
