import { lazy } from 'react';
import { createBrowserRouter } from 'react-router';
import { AppShell } from '../components/layout/AppShell';
import { RotaAdmin, RotaInscrito, RotaProtegida } from '../features/auth/rotas';
import Entrada from '../pages/Entrada';

// Todas as rotas, exceto a Entrada, são carregadas sob demanda (code splitting).
const Login = lazy(() => import('../pages/Login'));
const Cadastro = lazy(() => import('../pages/Cadastro'));
const Privacidade = lazy(() => import('../pages/Privacidade'));
const Regras = lazy(() => import('../pages/Regras'));
const Hoje = lazy(() => import('../pages/Hoje'));
const Progresso = lazy(() => import('../pages/Progresso'));
const Ranking = lazy(() => import('../pages/Ranking'));
const Admin = lazy(() => import('../pages/Admin'));
const AdminParticipante = lazy(() => import('../pages/AdminParticipante'));
const NaoEncontrada = lazy(() => import('../pages/NaoEncontrada'));

export const router = createBrowserRouter([
  { path: '/', element: <Entrada /> },
  {
    element: <AppShell />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/cadastro', element: <Cadastro /> },
      { path: '/privacidade', element: <Privacidade /> },
      { path: '/regras', element: <Regras /> },
      {
        element: <RotaProtegida />,
        children: [
          {
            element: <RotaInscrito />,
            children: [
              { path: '/hoje', element: <Hoje /> },
              { path: '/progresso', element: <Progresso /> },
              { path: '/ranking', element: <Ranking /> },
            ],
          },
          {
            element: <RotaAdmin />,
            children: [
              { path: '/admin', element: <Admin /> },
              { path: '/admin/participantes/:id', element: <AdminParticipante /> },
            ],
          },
        ],
      },
      { path: '*', element: <NaoEncontrada /> },
    ],
  },
]);
