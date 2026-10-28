import { QueryClient } from '@tanstack/react-query';
import { ehApiError } from './api';

export const queryClient = new QueryClient({
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
