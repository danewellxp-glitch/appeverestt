import { lazy } from 'react';
import { createBrowserRouter } from 'react-router';
import { AppShell } from '../components/layout/AppShell';
import {
  RedirecionarPreservandoBusca,
  RotaAdmin,
  RotaInscrito,
  RotaPerfilCompleto,
  RotaProtegida,
  RotaVisitante,
} from '../features/auth/rotas';
import Entrada from '../pages/Entrada';

// Todas as rotas, exceto a Entrada, são carregadas sob demanda (code splitting).
// O Firebase só entra nos chunks das telas de auth (import dinâmico em lib/firebase.ts).
const Entrar = lazy(() => import('../pages/Entrar'));
const CriarConta = lazy(() => import('../pages/CriarConta'));
const RecuperarSenha = lazy(() => import('../pages/RecuperarSenha'));
const BemVindo = lazy(() => import('../pages/BemVindo'));
const Privacidade = lazy(() => import('../pages/Privacidade'));
const Regras = lazy(() => import('../pages/Regras'));
const Desafio = lazy(() => import('../pages/Desafio'));
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
      {
        element: <RotaVisitante />,
        children: [
          { path: '/entrar', element: <Entrar /> },
          { path: '/criar-conta', element: <CriarConta /> },
        ],
      },
      { path: '/recuperar-senha', element: <RecuperarSenha /> },
      // Rotas antigas (docs/FRONTEND.md §3): redirecionam preservando a query.
      { path: '/login', element: <RedirecionarPreservandoBusca para="/entrar" /> },
      { path: '/cadastro', element: <RedirecionarPreservandoBusca para="/criar-conta" /> },
      { path: '/privacidade', element: <Privacidade /> },
      { path: '/regras', element: <Regras /> },
      {
        element: <RotaProtegida />,
        children: [
          { path: '/bem-vindo', element: <BemVindo /> },
          {
            element: <RotaPerfilCompleto />,
            children: [
              {
                element: <RotaInscrito />,
                children: [
                  { path: '/hoje', element: <Hoje /> },
                  { path: '/desafio', element: <Desafio /> },
                  { path: '/progresso', element: <Progresso /> },
                  { path: '/ranking', element: <Ranking /> },
                ],
              },
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
