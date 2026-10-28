import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './app/router';
import { definirAoNaoAutenticado } from './lib/api';
import { chaves } from './lib/queries';
import { queryClient } from './lib/queryClient';
import './styles/index.css';

// Em qualquer 401 inesperado: limpa o estado de auth; RotaProtegida leva ao /login.
definirAoNaoAutenticado(() => {
  queryClient.setQueryData(chaves.me, null);
});

const raiz = document.getElementById('root');
if (!raiz) throw new Error('Elemento #root não encontrado');

createRoot(raiz).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
