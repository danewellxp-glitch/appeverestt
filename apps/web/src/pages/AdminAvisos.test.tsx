// @vitest-environment jsdom
import { MODELOS_AVISO, type AdminDesafioConfig } from '@everest/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContextoPainel } from '../features/admin/LayoutPainel';
import AdminAvisos from './AdminAvisos';

const DESAFIO = { slug: 'teste-vu', nome: 'Desafio Teste', ativo: true } as AdminDesafioConfig;

function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });
}

let fetchMock: ReturnType<typeof vi.fn>;

/** Responde a API do painel: resumo do push e o envio do aviso. */
function api(envio: () => Response = () => json({ destinatarios: 4, entregues: 3, removidas: 1, falhas: 0 })) {
  fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url === '/api/admin/desafios/teste-vu/push') return Promise.resolve(json({ pessoas: 3, aparelhos: 4 }));
    if (url === '/api/admin/desafios/teste-vu/avisos' && init?.method === 'POST') return Promise.resolve(envio());
    return Promise.resolve(json({ codigo: 'NAO_ENCONTRADO', mensagem: 'x' }, 404));
  });
  vi.stubGlobal('fetch', fetchMock);
}

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const router = createMemoryRouter(
    [
      {
        path: '/admin',
        element: <Outlet context={{ desafio: DESAFIO, desafios: [DESAFIO] } satisfies ContextoPainel} />,
        children: [{ path: 'avisos', element: <AdminAvisos /> }],
      },
    ],
    { initialEntries: ['/admin/avisos'] },
  );
  render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function corpoDoEnvio(): unknown {
  const chamada = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'POST') as
    | [string, RequestInit]
    | undefined;
  return chamada ? (JSON.parse(chamada[1].body as string) as unknown) : null;
}

beforeEach(() => api());

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AdminAvisos', () => {
  it('mostra quantas pessoas têm os lembretes ativos', async () => {
    montar();
    expect(await screen.findByText('pessoas com os lembretes ativos')).toBeTruthy();
    expect(screen.getByText(/4 aparelhos/)).toBeTruthy();
  });

  it('modelo pronto: prévia na folha, confirma e mostra o resultado', async () => {
    montar();
    await screen.findByText('pessoas com os lembretes ativos');
    fireEvent.click(screen.getByRole('button', { name: /Enviar lembrete: Água/ }));

    const folha = screen.getByRole('dialog', { name: 'Enviar este aviso?' });
    expect(within(folha).getByText(MODELOS_AVISO.agua.titulo)).toBeTruthy();
    expect(within(folha).getByText(MODELOS_AVISO.agua.botao)).toBeTruthy();
    expect(within(folha).getByText(/Vai para 3 pessoas \(4 aparelhos\)/)).toBeTruthy();
    expect(corpoDoEnvio()).toBeNull();

    fireEvent.click(within(folha).getByRole('button', { name: 'Enviar agora' }));
    expect(await screen.findByText('Aviso enviado: 3 de 4 aparelhos.')).toBeTruthy();
    expect(corpoDoEnvio()).toEqual({ modelo: 'agua' });
    expect(screen.getByText('Removidas:')).toBeTruthy();
  });

  it('mensagem livre: valida antes de abrir a confirmação', async () => {
    montar();
    await screen.findByText('pessoas com os lembretes ativos');
    fireEvent.click(screen.getByRole('button', { name: 'Revisar e enviar' }));
    expect(screen.getByText('Escreva o título.')).toBeTruthy();
    expect(screen.getByText('Escreva a mensagem.')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('mensagem livre: contadores, prévia e envio com título e corpo', async () => {
    montar();
    await screen.findByText('pessoas com os lembretes ativos');
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Amanhã começa!' } });
    fireEvent.change(screen.getByLabelText('Mensagem'), { target: { value: 'Durma cedo e beba água.' } });
    expect(screen.getByText('14/60')).toBeTruthy();
    expect(screen.getByText('23/160')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Revisar e enviar' }));

    const folha = screen.getByRole('dialog', { name: 'Enviar este aviso?' });
    expect(within(folha).getByText('Amanhã começa!')).toBeTruthy();
    fireEvent.click(within(folha).getByRole('button', { name: 'Enviar agora' }));
    await screen.findByText('Aviso enviado: 3 de 4 aparelhos.');
    expect(corpoDoEnvio()).toEqual({ modelo: 'livre', titulo: 'Amanhã começa!', corpo: 'Durma cedo e beba água.' });
    await waitFor(() => expect((screen.getByLabelText('Título') as HTMLInputElement).value).toBe(''));
  });

  it('push não configurado no servidor: erro na folha, sem resultado', async () => {
    api(() => json({ codigo: 'PUSH_NAO_CONFIGURADO', mensagem: 'Lembretes indisponíveis no momento.' }, 503));
    montar();
    await screen.findByText('pessoas com os lembretes ativos');
    fireEvent.click(screen.getByRole('button', { name: /Enviar lembrete: Treino/ }));
    const folha = screen.getByRole('dialog', { name: 'Enviar este aviso?' });
    fireEvent.click(within(folha).getByRole('button', { name: 'Enviar agora' }));
    expect(await within(folha).findByRole('alert')).toBeTruthy();
    expect(screen.queryByText(/Aviso enviado/)).toBeNull();
  });
});
