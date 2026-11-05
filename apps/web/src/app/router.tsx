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
import { RedirecionarHoje } from '../features/checkin/RedirecionarHoje';
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
const Dia = lazy(() => import('../pages/Dia'));
const Progresso = lazy(() => import('../pages/Progresso'));
const Ranking = lazy(() => import('../pages/Ranking'));
const Perfil = lazy(() => import('../pages/Perfil'));
const Admin = lazy(() => import('../pages/Admin'));
const AdminIndicadores = lazy(() => import('../pages/AdminIndicadores'));
const AdminParticipantes = lazy(() => import('../pages/AdminParticipantes'));
const AdminDesafio = lazy(() => import('../pages/AdminDesafio'));
const AdminAvisos = lazy(() => import('../pages/AdminAvisos'));
const AdminDesafioForm = lazy(() => import('../pages/AdminDesafioForm'));
const AdminParticipante = lazy(() => import('../pages/AdminParticipante'));
const AdminFeedbacks = lazy(() => import('../pages/AdminFeedbacks'));
const Pagamento = lazy(() => import('../pages/Pagamento'));
const Feedback = lazy(() => import('../pages/Feedback'));
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
          // Logado basta (abas só para inscritos, pelo AppShell).
          { path: '/perfil', element: <Perfil /> },
          {
            element: <RotaPerfilCompleto />,
            children: [
              // Fora do RotaInscrito (que manda para cá quem ainda não teve o pagamento confirmado).
              { path: '/pagamento', element: <Pagamento /> },
              {
                element: <RotaInscrito />,
                children: [
                  // Rota antiga: /hoje → /desafio/dia/<hoje>; /hoje?dia=N → /desafio/dia/N.
                  { path: '/hoje', element: <RedirecionarHoje /> },
                  { path: '/desafio', element: <Desafio /> },
                  { path: '/desafio/dia/:n', element: <Dia /> },
                  { path: '/progresso', element: <Progresso /> },
                  { path: '/ranking', element: <Ranking /> },
                  { path: '/feedback', element: <Feedback /> },
                ],
              },
            ],
          },
          {
            element: <RotaAdmin />,
            children: [
              // Painel com abas (layout com <Outlet />): Indicadores (padrão), Participantes, Desafio e Avisos.
              {
                path: '/admin',
                element: <Admin />,
                children: [
                  { index: true, element: <AdminIndicadores /> },
                  { path: 'participantes', element: <AdminParticipantes /> },
                  { path: 'desafio', element: <AdminDesafio /> },
                  { path: 'avisos', element: <AdminAvisos /> },
                ],
              },
              { path: '/admin/desafios/novo', element: <AdminDesafioForm /> },
              { path: '/admin/desafios/:slug', element: <AdminDesafioForm /> },
              { path: '/admin/participantes/:id', element: <AdminParticipante /> },
              { path: '/admin/feedbacks', element: <AdminFeedbacks /> },
            ],
          },
        ],
      },
      { path: '*', element: <NaoEncontrada /> },
    ],
  },
]);
