import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { metricasExemplo } from './exemplo';
import { PainelIndicadores } from './PainelIndicadores';

afterEach(cleanup);

// Movimento reduzido: os contadores mostram o valor final na hora.
beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    (q: string) =>
      ({
        matches: q.includes('reduce'),
        media: q,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );
  return () => vi.unstubAllGlobals();
});

function montar(m = metricasExemplo()) {
  const aoAtualizar = vi.fn();
  render(
    <MemoryRouter>
      <PainelIndicadores m={m} atualizando={false} aoAtualizar={aoAtualizar} />
    </MemoryRouter>,
  );
  return { aoAtualizar };
}

describe('PainelIndicadores', () => {
  it('mostra a hora da atualização e atualiza no botão', () => {
    const { aoAtualizar } = montar();
    expect(screen.getByText('Atualizado às 14:05 · atualiza sozinho a cada minuto')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    expect(aoAtualizar).toHaveBeenCalledOnce();
  });

  it('KPIs: vagas, dinheiro esperando conferência com atalho e invictos', () => {
    montar();
    const kpis = screen.getByRole('region', { name: 'Números principais' });
    expect(within(kpis).getByText('8 vagas livres')).toBeTruthy();
    expect(
      within(kpis).getByRole('meter', { name: 'Vagas ocupadas' }).getAttribute('aria-valuenow'),
    ).toBe('42');
    expect(within(kpis).getByText(/^R\$\s150$/)).toBeTruthy();
    expect(within(kpis).getByText('3 avisos · o mais antigo há 1 dia e 2 h')).toBeTruthy();
    expect(
      within(kpis)
        .getByRole('link', { name: /Conferir agora/ })
        .getAttribute('href'),
    ).toBe('/admin/participantes');
  });

  it('em risco: WhatsApp com mensagem pronta, e quem não tem número', () => {
    montar();
    const secao = screen.getByRole('region', { name: 'Em risco' });
    const wa = within(secao).getByRole('link', { name: 'Chamar Ana Souza no WhatsApp' });
    expect(wa.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/5511987654321\?text=Oi%2C%20Ana!/);
    expect(within(secao).getByRole('link', { name: 'Bruno Lima' }).getAttribute('href')).toBe(
      '/admin/participantes/p2',
    );
    expect(within(secao).getByText('sem número')).toBeTruthy();
  });

  it('o hábito mais difícil vem primeiro e em destaque', () => {
    montar();
    const cartao = screen.getByRole('figure', { name: 'Qual hábito é mais difícil' });
    expect(within(cartao).getByText('Leitura é o menos cumprido: 64% dos check-ins.')).toBeTruthy();
    const itens = within(cartao).getAllByRole('listitem');
    expect(itens[0]?.textContent).toContain('Leitura');
  });

  it('teclado percorre o gráfico e a tabela mostra os mesmos valores', () => {
    montar();
    const cartao = screen.getByRole('figure', { name: 'Horário dos check-ins' });
    const grafico = within(cartao).getByRole('group', {
      name: /^Check-ins por hora do dia; pico às 21h/,
    });
    const leitura = document.getElementById(grafico.getAttribute('aria-describedby') ?? '');
    fireEvent.focus(grafico);
    expect(leitura?.textContent).toBe('23h–0h: Check-ins 30');
    fireEvent.keyDown(grafico, { key: 'Home' });
    expect(leitura?.textContent).toBe('0h–1h: Check-ins 0');
    fireEvent.keyDown(grafico, { key: 'ArrowRight' });
    expect(leitura?.textContent).toBe('1h–2h: Check-ins 0');

    fireEvent.click(within(cartao).getByRole('button', { name: 'Ver tabela' }));
    const tabela = within(cartao).getByRole('table', { name: 'Horário dos check-ins' });
    expect(within(tabela).getAllByRole('row')).toHaveLength(25);
    expect(
      within(tabela).getByRole('rowheader', { name: '21h–22h' }).nextElementSibling?.textContent,
    ).toBe('60');
  });

  it('inscrições: alterna entre por dia e acumulado', () => {
    montar();
    const cartao = screen.getByRole('figure', { name: 'Inscrições por data' });
    expect(
      within(cartao).getByRole('group', { name: /^Inscrições e confirmações por data/ }),
    ).toBeTruthy();
    fireEvent.click(within(cartao).getByRole('button', { name: 'Acumulado' }));
    expect(
      within(cartao).getByRole('group', {
        name: /^Inscritos e confirmados acumulados: 42 inscrições/,
      }),
    ).toBeTruthy();
  });

  it('antes do início: sem em risco nem engajamento, com um aviso único', () => {
    const base = metricasExemplo();
    montar(
      metricasExemplo({
        desafio: {
          ...base.desafio,
          status: 'NAO_INICIADO',
          diaAtual: null,
          dataInicio: '2099-01-10',
        },
        adesaoPorDia: [],
        invictosPorDia: [],
        emRisco: [],
      }),
    );
    expect(screen.queryByRole('region', { name: 'Em risco' })).toBeNull();
    expect(screen.queryByRole('figure', { name: 'Adesão por dia' })).toBeNull();
    expect(screen.getByText(/aparecem a partir do dia 1/)).toBeTruthy();
    expect(screen.getByText('Aparece a partir do dia 1')).toBeTruthy();
  });

  it('sem inscritos e sem feedback: estados vazios', () => {
    const base = metricasExemplo();
    montar(
      metricasExemplo({
        inscricoesPorData: [],
        perfil: { ...base.perfil, total: 0, faixasEtarias: [], cidades: [], aceitaramMarketing: 0 },
        feedback: { respostas: 0, notaMedia: null, distribuicao: [], autorizamDivulgacao: 0 },
      }),
    );
    expect(
      screen.getByText('Ninguém se inscreveu ainda. Compartilhe o link do desafio!'),
    ).toBeTruthy();
    expect(screen.getByText(/Ainda ninguém respondeu/)).toBeTruthy();
    expect(screen.getByText('Ainda sem respostas')).toBeTruthy();
  });
});
