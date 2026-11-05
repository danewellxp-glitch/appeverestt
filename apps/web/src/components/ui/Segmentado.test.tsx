import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { Segmentado } from './Segmentado';

afterEach(cleanup);

const OPCOES = [
  { valor: 'claro', rotulo: 'Claro' },
  { valor: 'escuro', rotulo: 'Escuro' },
  { valor: 'sistema', rotulo: 'Sistema' },
] as const;

describe('Segmentado', () => {
  it('é um grupo rotulado e marca só a opção atual com aria-pressed', () => {
    render(<Segmentado opcoes={OPCOES} valor="escuro" aoMudar={() => undefined} rotulo="Tema" />);
    expect(screen.getByRole('group', { name: 'Tema' })).toBeTruthy();
    const estados = screen.getAllByRole('button').map((b) => [b.textContent, b.getAttribute('aria-pressed')]);
    expect(estados).toEqual([
      ['Claro', 'false'],
      ['Escuro', 'true'],
      ['Sistema', 'false'],
    ]);
  });

  it('chama aoMudar com o valor tocado', () => {
    const aoMudar = vi.fn();
    render(<Segmentado opcoes={OPCOES} valor="escuro" aoMudar={aoMudar} rotulo="Tema" />);
    fireEvent.click(screen.getByRole('button', { name: 'Sistema' }));
    expect(aoMudar).toHaveBeenCalledWith('sistema');
  });
});

describe('Segmentado compacto', () => {
  it('empilha ícone e rótulo (4 opções cabem em 360 px)', () => {
    render(
      <Segmentado
        opcoes={[...OPCOES, { valor: 'outro', rotulo: 'Outro', icone: <svg data-testid="icone" /> }]}
        valor="claro"
        aoMudar={() => undefined}
        rotulo="Abas"
        compacto
      />,
    );
    const botao = screen.getByRole('button', { name: 'Outro' });
    expect(botao.className).toContain('flex-col');
    expect(botao.className).toContain('min-w-0');
  });
});
