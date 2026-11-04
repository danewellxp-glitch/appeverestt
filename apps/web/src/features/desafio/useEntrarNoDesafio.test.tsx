// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { DesafioAtual, InscricaoResposta, MeResposta, ParticipacaoResumo } from '@everest/shared';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/api';
import { BotaoQueroParticipar } from './EntrarNoDesafio';
import {
  bloqueioDaInscricao,
  destinoAposInscricao,
  estadoDoCta,
  useEntrarNoDesafio,
  type EntradaEstadoCta,
} from './useEntrarNoDesafio';

const apiMock = vi.hoisted(() => vi.fn());
vi.mock('../../lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../lib/api')>();
  return { ...original, api: apiMock };
});
// O CTA do visitante pré-carrega o Firebase no toque: fora do teste.
vi.mock('../../lib/firebase', () => ({ preCarregarAuth: vi.fn(), obterAuth: vi.fn() }));

function desafioBase(parcial: Partial<DesafioAtual> = {}): DesafioAtual {
  return {
    id: 'd1',
    nome: 'Desafio 30 Dias Everest',
    slug: 'teste-vu',
    dataInicio: '2026-11-03',
    dataFim: '2026-12-02',
    totalDias: 30,
    status: 'NAO_INICIADO',
    diaAtual: null,
    diasParaInicio: 3,
    totalVagas: 50,
    vagasDisponiveis: 37,
    inscricoesAbertas: true,
    instagramHandle: 'everest',
    hashtag: 'desafioeverest',
    timezone: 'America/Sao_Paulo',
    inscricao: { valorCentavos: 5000 },
    ...parcial,
  };
}

function participacao(parcial: Partial<ParticipacaoResumo> = {}): ParticipacaoResumo {
  return {
    participanteId: 'p1',
    desafioId: 'd1',
    desafioSlug: 'teste-vu',
    vagaNumero: 12,
    ehEmbaixador: false,
    dataInscricao: '2026-10-30T12:00:00Z',
    pagamentoStatus: 'PENDENTE',
    ...parcial,
  };
}

function meBase(parcial: { perfilCompleto?: boolean; participacao?: ParticipacaoResumo | null } = {}): MeResposta {
  return {
    usuario: {
      id: 'u1',
      nome: 'Joana Teste',
      email: 'joana@e2e.dev',
      papel: 'USUARIO',
      fotoUrl: null,
      perfilCompleto: parcial.perfilCompleto ?? true,
      instagram: 'joana',
      dataNascimento: '1994-03-21',
      whatsapp: '11987654321',
      bairro: 'Pinheiros',
      cidade: 'São Paulo',
      uf: 'SP',
      aceitouMarketing: false,
    },
    participacao: parcial.participacao ?? null,
  };
}

function entrada(parcial: Partial<EntradaEstadoCta> = {}): EntradaEstadoCta {
  return { desafio: desafioBase(), desafioPendente: false, semDesafio: false, me: null, mePendente: false, ...parcial };
}

describe('bloqueioDaInscricao', () => {
  it('encerrado > inscrições fechadas > vagas esgotadas; aberto = null', () => {
    expect(bloqueioDaInscricao(desafioBase())).toBeNull();
    expect(bloqueioDaInscricao(desafioBase({ vagasDisponiveis: 0 }))).toBe('Vagas esgotadas');
    expect(bloqueioDaInscricao(desafioBase({ inscricoesAbertas: false, vagasDisponiveis: 0 }))).toBe(
      'Inscrições encerradas',
    );
    expect(bloqueioDaInscricao(desafioBase({ status: 'ENCERRADO', inscricoesAbertas: false }))).toBe('Desafio encerrado');
  });
});

describe('estadoDoCta', () => {
  it('espera a sessão antes de decidir (mesmo com o desafio carregado)', () => {
    expect(estadoDoCta(entrada({ mePendente: true }))).toEqual({ tipo: 'carregando' });
    expect(estadoDoCta(entrada({ desafio: undefined, desafioPendente: true }))).toEqual({ tipo: 'carregando' });
  });

  it('visitante vai criar a conta; cadastro incompleto vai para a /bem-vindo', () => {
    expect(estadoDoCta(entrada())).toEqual({ tipo: 'criar-conta', para: '/criar-conta?acao=inscrever' });
    expect(estadoDoCta(entrada({ me: meBase({ perfilCompleto: false }) }))).toEqual({
      tipo: 'completar-cadastro',
      para: '/bem-vindo?acao=inscrever',
    });
  });

  it('cadastro completo e sem vaga: inscreve no desafio atual', () => {
    expect(estadoDoCta(entrada({ me: meBase() }))).toEqual({ tipo: 'inscrever', slug: 'teste-vu' });
  });

  it('quem já tem vaga recebe o próximo passo conforme o pagamento', () => {
    const comStatus = (pagamentoStatus: ParticipacaoResumo['pagamentoStatus']) =>
      estadoDoCta(entrada({ me: meBase({ participacao: participacao({ pagamentoStatus }) }) }));
    expect(comStatus('PENDENTE')).toMatchObject({ tipo: 'inscrito', para: '/pagamento', rotulo: 'Concluir pagamento', vagaNumero: 12 });
    expect(comStatus('INFORMADO')).toMatchObject({ tipo: 'inscrito', para: '/pagamento', rotulo: 'Pagamento em análise' });
    expect(comStatus('CONFIRMADO')).toMatchObject({ tipo: 'inscrito', para: '/desafio', rotulo: 'Ir para o desafio' });
  });

  it('o inscrito vê o próximo passo mesmo com as vagas esgotadas ou o desafio ainda carregando', () => {
    const me = meBase({ participacao: participacao({ pagamentoStatus: 'CONFIRMADO' }) });
    expect(estadoDoCta(entrada({ me, desafio: desafioBase({ vagasDisponiveis: 0 }) })).tipo).toBe('inscrito');
    expect(estadoDoCta(entrada({ me, desafio: undefined, desafioPendente: true })).tipo).toBe('inscrito');
  });

  it('esgotado, fechado ou encerrado: botão desabilitado com o motivo (também para quem está logado)', () => {
    expect(estadoDoCta(entrada({ desafio: desafioBase({ vagasDisponiveis: 0 }) }))).toEqual({
      tipo: 'bloqueado',
      motivo: 'Vagas esgotadas',
    });
    expect(estadoDoCta(entrada({ me: meBase(), desafio: desafioBase({ inscricoesAbertas: false }) }))).toEqual({
      tipo: 'bloqueado',
      motivo: 'Inscrições encerradas',
    });
  });

  it('sem desafio ativo: "Fiquem ligados"; desafio que não carregou: erro', () => {
    expect(estadoDoCta(entrada({ desafio: undefined, semDesafio: true }))).toEqual({ tipo: 'sem-desafio' });
    expect(estadoDoCta(entrada({ desafio: undefined }))).toEqual({ tipo: 'erro' });
  });
});

describe('destinoAposInscricao', () => {
  it('pagamento pendente vai para o Pix; o embaixador (já confirmado) vai para a vaga', () => {
    expect(destinoAposInscricao({ pagamentoStatus: 'PENDENTE' })).toBe('/pagamento');
    expect(destinoAposInscricao({ pagamentoStatus: 'CONFIRMADO' })).toBe('/bem-vindo?etapa=vaga');
  });
});

// ---------------------------------------------------------------------------------------------

/** Responde o /auth/me e o /desafios/atual com o estado do teste; o resto vai para `outras`. */
function responderApi(
  me: MeResposta | null,
  desafio: DesafioAtual | ApiError,
  outras: (url: string) => Promise<unknown> = () => Promise.reject(new Error('inesperado')),
) {
  apiMock.mockImplementation((url: string) => {
    if (url === '/auth/me') return me ? Promise.resolve(me) : Promise.reject(new ApiError('NAO_AUTENTICADO', 'x', 401));
    if (url === '/desafios/atual') return desafio instanceof ApiError ? Promise.reject(desafio) : Promise.resolve(desafio);
    return outras(url);
  });
}

function criarQc(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

let localAtual = '';
function Local() {
  const l = useLocation();
  localAtual = l.pathname + l.search;
  return null;
}

function Envoltorio({ qc, children }: { qc: QueryClient; children: ReactNode }) {
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/']}>
        {children}
        <Local />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('useEntrarNoDesafio', () => {
  let qc: QueryClient;

  beforeEach(() => {
    apiMock.mockReset();
    qc = criarQc();
    localAtual = '';
  });

  afterEach(() => {
    cleanup();
    qc.clear();
  });

  function montar() {
    return renderHook(() => useEntrarNoDesafio(), {
      wrapper: ({ children }) => <Envoltorio qc={qc}>{children}</Envoltorio>,
    });
  }

  it('reserva a vaga e segue para o Pix, já com a participação no cache do `me`', async () => {
    const resposta: InscricaoResposta = { participacao: participacao(), criada: true };
    let inscrito = false;
    apiMock.mockImplementation((url: string) => {
      if (url === '/auth/me') return Promise.resolve(meBase({ participacao: inscrito ? resposta.participacao : null }));
      if (url === '/desafios/atual') return Promise.resolve(desafioBase());
      if (url === '/desafios/teste-vu/inscricao') {
        inscrito = true;
        return Promise.resolve(resposta);
      }
      return Promise.reject(new Error(url));
    });
    const { result } = montar();
    await waitFor(() => expect(result.current.estado.tipo).toBe('inscrever'));

    await act(() => result.current.inscreverAgora());

    expect(apiMock).toHaveBeenCalledWith('/desafios/teste-vu/inscricao', { method: 'POST' });
    await waitFor(() => expect(localAtual).toBe('/pagamento'));
    expect(qc.getQueryData<MeResposta>(['me'])?.participacao?.vagaNumero).toBe(12);
  });

  it('o embaixador (inscrição já confirmada) vai para a revelação da vaga', async () => {
    const resposta: InscricaoResposta = {
      participacao: participacao({ pagamentoStatus: 'CONFIRMADO', ehEmbaixador: true, vagaNumero: 1 }),
      criada: true,
    };
    responderApi(meBase(), desafioBase(), () => Promise.resolve(resposta));
    const { result } = montar();
    await waitFor(() => expect(result.current.estado.tipo).toBe('inscrever'));

    await act(() => result.current.inscreverAgora());

    await waitFor(() => expect(localAtual).toBe('/bem-vindo?etapa=vaga'));
  });

  it('erro da API (vagas esgotadas) fica no hook e não navega', async () => {
    responderApi(meBase(), desafioBase(), () =>
      Promise.reject(new ApiError('VAGAS_ESGOTADAS', 'As vagas acabaram.', 409)),
    );
    const { result } = montar();
    await waitFor(() => expect(result.current.estado.tipo).toBe('inscrever'));

    await act(() => result.current.inscreverAgora());

    await waitFor(() => expect(result.current.erro).toBe('As vagas acabaram.'));
    expect(localAtual).toBe('/');
  });

  it('fora do estado "inscrever" (ex.: visitante) não chama a API', async () => {
    responderApi(null, desafioBase());
    const { result } = montar();
    await waitFor(() => expect(result.current.estado.tipo).toBe('criar-conta'));

    await act(() => result.current.inscreverAgora());

    expect(apiMock).not.toHaveBeenCalledWith(expect.stringContaining('/inscricao'), expect.anything());
  });
});

describe('BotaoQueroParticipar', () => {
  let qc: QueryClient;

  beforeEach(() => {
    apiMock.mockReset();
    qc = criarQc();
  });

  afterEach(() => {
    cleanup();
    qc.clear();
  });

  function montar(props: Parameters<typeof BotaoQueroParticipar>[0] = {}) {
    return render(
      <Envoltorio qc={qc}>
        <BotaoQueroParticipar {...props} />
      </Envoltorio>,
    );
  }

  it('visitante: link "Quero participar" para criar a conta', async () => {
    responderApi(null, desafioBase());
    montar();
    const link = await screen.findByRole('link', { name: 'Quero participar' });
    expect(link.getAttribute('href')).toBe('/criar-conta?acao=inscrever');
  });

  it('inscrito com pagamento pendente: link "Concluir pagamento"', async () => {
    responderApi(meBase({ participacao: participacao() }), desafioBase());
    montar();
    const link = await screen.findByRole('link', { name: 'Concluir pagamento' });
    expect(link.getAttribute('href')).toBe('/pagamento');
  });

  it('vagas esgotadas: botão desabilitado', async () => {
    responderApi(null, desafioBase({ vagasDisponiveis: 0 }));
    montar();
    const botao = await screen.findByRole('button', { name: 'Vagas esgotadas' });
    // aria-disabled (não `disabled`): continua no Tab e o leitor de tela lê o motivo.
    expect(botao.getAttribute('aria-disabled')).toBe('true');
    expect((botao as HTMLButtonElement).disabled).toBe(false);
  });

  it('sem desafio ativo: "Fiquem ligados" no lugar do botão (ou nada, no CTA do meio)', async () => {
    responderApi(null, new ApiError('NAO_ENCONTRADO', 'Nenhum desafio ativo.', 404));
    const { unmount } = montar();
    expect(await screen.findByText('Fiquem ligados!')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Quero participar' })).toBeNull();
    unmount();

    const { container } = montar({ quandoIndisponivel: 'nada' });
    await waitFor(() => expect(container.querySelector('[aria-hidden].animate-pulse')).toBeNull());
    expect(screen.queryByText('Fiquem ligados!')).toBeNull();
  });
});
