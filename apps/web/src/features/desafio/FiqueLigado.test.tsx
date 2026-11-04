// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import type { DesafioAtual, MeResposta } from '@everest/shared';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { FiqueLigado } from './FiqueLigado';

afterEach(cleanup);

const DESAFIO = {
  slug: 'teste-vu',
  dataInicio: '2026-11-03',
  diasParaInicio: 3,
  instagramHandle: '@everest',
} as DesafioAtual;

function me(whatsapp: string | null): MeResposta {
  return {
    usuario: {
      id: 'u1',
      nome: 'Joana Teste',
      email: 'joana@e2e.dev',
      papel: 'USUARIO',
      fotoUrl: null,
      perfilCompleto: true,
      instagram: 'joana',
      dataNascimento: '1994-03-21',
      whatsapp,
      bairro: 'Pinheiros',
      cidade: 'São Paulo',
      uf: 'SP',
      aceitouMarketing: false,
    },
    participacao: {
      participanteId: 'p1',
      desafioId: 'd1',
      desafioSlug: 'teste-vu',
      vagaNumero: 12,
      ehEmbaixador: false,
      dataInscricao: '2026-10-30T12:00:00Z',
      pagamentoStatus: 'CONFIRMADO',
    },
  };
}

function montar(m: MeResposta, desafio: DesafioAtual | undefined = DESAFIO) {
  return render(
    <MemoryRouter>
      <FiqueLigado me={m} desafio={desafio} />
    </MemoryRouter>,
  );
}

describe('FiqueLigado', () => {
  it('mostra a data de início, a contagem, a vaga e só o final do WhatsApp', () => {
    montar(me('11987654321'));
    expect(screen.getByRole('heading', { level: 1, name: 'Fiquem ligados!' })).toBeTruthy();
    expect(screen.getByText('Vaga nº 12 · inscrição confirmada')).toBeTruthy();
    expect(screen.getByText('03/11')).toBeTruthy();
    expect(screen.getByText('faltam 3 dias')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Todas as informações serão enviadas pelo WhatsApp' })).toBeTruthy();
    expect(screen.getByText(/final 4321/)).toBeTruthy();
    expect(document.body.textContent).not.toContain('98765');
  });

  it('sem link do grupo configurado, o botão do WhatsApp não aparece; as regras sim', () => {
    montar(me('11987654321'));
    expect(screen.queryByRole('link', { name: /grupo do WhatsApp/ })).toBeNull();
    expect(screen.getByRole('link', { name: /Leia as regras completas/ }).getAttribute('href')).toBe('/regras');
    expect(screen.getByRole('link', { name: /Siga @everest/ }).getAttribute('href')).toBe('https://instagram.com/everest');
  });

  it('sem WhatsApp cadastrado, pede para cadastrar no perfil', () => {
    montar(me(null));
    expect(screen.getByText(/Cadastre seu WhatsApp no perfil/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Cadastrar meu WhatsApp' }).getAttribute('href')).toBe('/perfil');
  });
});
