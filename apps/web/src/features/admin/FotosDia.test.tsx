import type { AdminFotoDia } from '@everest/shared';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { FotosDia } from './FotosDia';

afterEach(cleanup);

function foto(tipo: AdminFotoDia['tipo'], parecida: AdminFotoDia['parecida']): AdminFotoDia {
  return {
    id: `f-${tipo}`,
    tipo,
    status: 'CONFIRMADA',
    thumbUrl: `https://arquivos.exemplo/${tipo}.thumb.webp`,
    url: `https://arquivos.exemplo/${tipo}.full.webp`,
    parecida,
  };
}

function montar(fotos: AdminFotoDia[]) {
  return render(
    <MemoryRouter>
      <FotosDia fotos={fotos} numeroDia={5} />
    </MemoryRouter>,
  );
}

describe('FotosDia: sinal de foto parecida (X20)', () => {
  it('foto parecida com a de outra pessoa leva ao dia dela', () => {
    montar([
      foto('AGUA', {
        participanteId: 'p 2',
        nome: 'Maria Souza Lima',
        numeroDia: 3,
        tipo: 'LEITURA',
        mesmaPessoa: false,
      }),
      foto('EXERCICIO', null),
    ]);
    const link = screen.getByRole('link', {
      name: 'Parecida com a foto de Maria L. · dia 3 · leitura',
    });
    expect(link.getAttribute('href')).toBe('/admin/participantes/p%202?dia=3');
    expect(screen.getAllByText(/Parecida com/)).toHaveLength(1);
  });

  it('parecida com outra foto do mesmo dia da mesma pessoa: aviso sem link', () => {
    montar([
      foto('AGUA', {
        participanteId: 'p1',
        nome: 'Ana Souza',
        numeroDia: 5,
        tipo: 'LEITURA',
        mesmaPessoa: true,
      }),
    ]);
    expect(screen.getByText('Parecida com a foto de leitura deste mesmo dia')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Parecida/ })).toBeNull();
  });

  it('sem parecida, sem aviso', () => {
    montar([foto('AGUA', null), foto('EXERCICIO', null), foto('LEITURA', null)]);
    expect(screen.queryByText(/Parecida com/)).toBeNull();
  });
});
