import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ehApiError } from './api';

/**
 * 403 PAGAMENTO_PENDENTE numa tela do desafio = o `me` em cache está desatualizado (ex.: o
 * embaixador voltou o pagamento para pendente). Recarrega o `me`; o RotaInscrito então leva a
 * pessoa para a /pagamento. O status do pagamento em cache também fica velho (podia estar
 * CONFIRMADO). (Chaves literais para não importar lib/queries aqui.)
 */
function aoErro(erro: unknown): void {
  if (!ehApiError(erro, 'PAGAMENTO_PENDENTE')) return;
  void queryClient.invalidateQueries({ queryKey: ['pagamento'] });
  void queryClient.invalidateQueries({ queryKey: ['me'] });
}

export const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({ onError: aoErro }),
  mutationCache: new MutationCache({ onError: aoErro }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: (falhas, erro) => {
        // Erros de regra/autorização não melhoram tentando de novo.
        if (ehApiError(erro) && erro.status >= 400 && erro.status < 500) return false;
        return falhas < 2;
      },
    },
    mutations: { retry: false },
  },
});
