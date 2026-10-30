import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { useToast } from '../../components/ui/Toast';
import { api } from '../../lib/api';
import { chaves } from '../../lib/queries';

/** DELETE /me (X5): apaga fotos e dados pessoais; a sessão é encerrada e a pessoa volta para a "/". */
export function useExcluirConta() {
  const qc = useQueryClient();
  const navegar = useNavigate();
  const { toast } = useToast();
  return useMutation({
    mutationFn: () => api<{ ok: true }>('/me', { method: 'DELETE', silenciar401: true }),
    onSuccess: async () => {
      // Navega antes de limpar a sessão: senão a rota protegida manda para /entrar primeiro.
      // flushSync: a tela nova monta já, antes de a sessão sumir (senão a rota protegida antiga redireciona).
      await navegar('/', { replace: true, flushSync: true });
      qc.setQueryData(chaves.me, null);
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' && q.queryKey[0] !== 'desafio' });
      void qc.invalidateQueries({ queryKey: chaves.desafioAtual });
      toast('Conta excluída.');
    },
  });
}
