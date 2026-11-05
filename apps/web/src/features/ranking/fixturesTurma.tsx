// Fixtures e provedores dos testes do hub da turma (R23). Só usado por arquivos *.test.tsx.
import type { DesafioAtual, MeResposta } from '@everest/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { ToastProvider } from '../../components/ui/Toast';
import { ApiError } from '../../lib/api';

export const SLUG = 'desafio-teste';
export const MEU_ID = 'p-eu';

export const ME: MeResposta = {
  usuario: {
    id: 'u-eu',
    nome: 'Ana Souza',
    email: 'ana@exemplo.com',
    papel: 'USUARIO',
    fotoUrl: null,
    perfilCompleto: true,
    instagram: 'ana',
    dataNascimento: '1990-01-01',
    whatsapp: '11987654321',
    bairro: 'Centro',
    cidade: 'Curitiba',
    uf: 'PR',
    aceitouMarketing: false,
    aceitaCutucadas: true,
  },
  participacao: {
    participanteId: MEU_ID,
    desafioId: 'd1',
    desafioSlug: SLUG,
    vagaNumero: 3,
    ehEmbaixador: false,
    dataInscricao: '2026-10-01T12:00:00.000Z',
    pagamentoStatus: 'CONFIRMADO',
  },
};

export const DESAFIO: DesafioAtual = {
  id: 'd1',
  nome: 'Desafio Teste',
  slug: SLUG,
  dataInicio: '2026-11-01',
  dataFim: '2026-11-30',
  totalDias: 30,
  status: 'EM_ANDAMENTO',
  diaAtual: 5,
  diasParaInicio: 0,
  totalVagas: 50,
  vagasDisponiveis: 10,
  inscricoesAbertas: false,
  instagramHandle: 'everest',
  hashtag: 'DESAFIO30',
  timezone: 'America/Sao_Paulo',
  inscricao: null,
};

/** Resposta da API simulada: função por caminho (o primeiro prefixo que casar). */
export type Rotas = Record<string, (opcoes: { method?: string; body?: unknown } | undefined, caminho: string) => unknown>;

/** Implementação para `vi.fn()` do `api`: `/auth/me` e `/desafios/atual` já respondem. */
export function apiSimulada(rotas: Rotas) {
  const todas: Rotas = { '/auth/me': () => ME, '/desafios/atual': () => DESAFIO, ...rotas };
  return async (caminho: string, opcoes?: { method?: string; body?: unknown }) => {
    const chave = Object.keys(todas)
      .sort((a, b) => b.length - a.length)
      .find((c) => caminho.startsWith(c));
    if (!chave) throw new ApiError('NAO_ENCONTRADO', `sem rota: ${caminho}`, 404);
    const r = todas[chave]?.(opcoes, caminho);
    if (r instanceof Error) throw r;
    return r;
  };
}

export function montarComProvedores(ui: ReactNode, rota = '/ranking') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const resultado = render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={[rota]}>{ui}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { ...resultado, qc };
}
