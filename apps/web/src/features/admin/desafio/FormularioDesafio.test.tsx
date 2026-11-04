import type { AdminDesafioConfig } from '@everest/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { diferencas, FormularioDesafio } from './FormularioDesafio';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function config(sobrescrever: Partial<AdminDesafioConfig> = {}): AdminDesafioConfig {
  return {
    id: 'd1',
    slug: 'teste-vu',
    nome: 'Desafio Teste',
    dataInicio: '2026-10-30',
    dataFim: '2026-11-28',
    totalDias: 30,
    totalVagas: 50,
    instagramHandle: 'everest',
    hashtag: 'DESAFIO30EVEREST',
    timezone: 'America/Sao_Paulo',
    inscricoesAbertas: true,
    embaixadorOcupaVaga: true,
    ativo: true,
    status: 'EM_ANDAMENTO',
    diaAtual: 2,
    vagasOcupadas: 12,
    totalInscritos: 12,
    temCheckins: false,
    criadoEm: '2026-10-20T12:00:00.000Z',
    ...sobrescrever,
  };
}

function montar(props: Partial<Parameters<typeof FormularioDesafio>[0]> = {}) {
  const aoSalvar = vi.fn();
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <FormularioDesafio aoSalvar={aoSalvar} {...props} />
    </QueryClientProvider>,
  );
  return { aoSalvar };
}

function respostaJson(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('FormularioDesafio (criar)', () => {
  it('sugere o identificador a partir do nome até a pessoa editar o identificador', () => {
    montar();
    const nome = screen.getByLabelText('Nome do desafio');
    const slug = screen.getByLabelText(/Identificador/) as HTMLInputElement;
    fireEvent.change(nome, { target: { value: 'Desafio Verão 2027' } });
    expect(slug.value).toBe('desafio-verao-2027');
    fireEvent.change(slug, { target: { value: 'verao' } });
    fireEvent.change(nome, { target: { value: 'Outro nome' } });
    expect(slug.value).toBe('verao');
  });

  it('valida no cliente com o schema e não chama a API', () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Criar desafio' }));
    expect(screen.getByText('Nome muito curto.')).toBeTruthy();
    expect(screen.getByText('Data de início inválida.')).toBeTruthy();
    expect(screen.getByText('Informe o @ do Instagram do desafio.')).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('mostra no campo o identificador repetido (DESAFIO_JA_EXISTE)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        respostaJson(
          { codigo: 'DESAFIO_JA_EXISTE', mensagem: 'Já existe um desafio "verao".' },
          409,
        ),
      ),
    );
    montar({ padroes: { instagramHandle: 'everest' } });
    fireEvent.change(screen.getByLabelText('Nome do desafio'), { target: { value: 'Verão' } });
    fireEvent.change(screen.getByLabelText('Data de início'), { target: { value: '2027-01-10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar desafio' }));
    expect(await screen.findByText('Já existe um desafio "verao".')).toBeTruthy();
    expect(screen.getByLabelText(/Identificador/).getAttribute('aria-invalid')).toBe('true');
  });
});

describe('FormularioDesafio (editar)', () => {
  it('com check-ins, data de início e total de dias ficam travados', () => {
    montar({ desafio: config({ temCheckins: true }) });
    expect((screen.getByLabelText('Data de início') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText('Total de dias') as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText(/Já existem check-ins/)).toBeTruthy();
  });

  it('não deixa as vagas abaixo das ocupadas', () => {
    montar({ desafio: config() });
    fireEvent.change(screen.getByLabelText('Vagas'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(screen.getByText('Já há 12 vagas ocupadas: use pelo menos 12.')).toBeTruthy();
  });

  it('sem mudanças avisa e não chama a API', () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    montar({ desafio: config() });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(screen.getByText('Nada mudou desde o último salvamento.')).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('manda só o que mudou no PATCH', async () => {
    const fetch = vi.fn(async () =>
      respostaJson(config({ totalVagas: 60, inscricoesAbertas: false })),
    );
    vi.stubGlobal('fetch', fetch);
    const { aoSalvar } = montar({ desafio: config() });
    fireEvent.change(screen.getByLabelText('Vagas'), { target: { value: '60' } });
    fireEvent.click(screen.getByRole('switch', { name: 'Inscrições abertas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() => expect(aoSalvar).toHaveBeenCalled());
    const [url, opcoes] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/admin/desafios/teste-vu');
    expect(opcoes.method).toBe('PATCH');
    expect(JSON.parse(String(opcoes.body))).toEqual({ totalVagas: 60, inscricoesAbertas: false });
  });
});

describe('diferencas', () => {
  it('ignora campos iguais ao salvo', () => {
    expect(
      diferencas(config(), { nome: 'Desafio Teste', totalVagas: 50, ativo: true, hashtag: 'NOVA' }),
    ).toEqual({
      hashtag: 'NOVA',
    });
  });
});
