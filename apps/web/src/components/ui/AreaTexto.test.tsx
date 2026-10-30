import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { AreaTexto } from './AreaTexto';

afterEach(cleanup);

function Cenario({ inicial = '' }: { inicial?: string }) {
  const [texto, setTexto] = useState(inicial);
  return (
    <AreaTexto rotulo="O que você achou?" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={1000} />
  );
}

describe('AreaTexto', () => {
  it('mostra o contador n/1000 e atualiza ao digitar', () => {
    render(<Cenario inicial="Muito bom" />);
    const campo = screen.getByRole('textbox', { name: 'O que você achou?' });
    const contador = document.getElementById(campo.getAttribute('aria-describedby') ?? '');
    expect(contador?.textContent).toContain('9/1000');

    fireEvent.change(campo, { target: { value: 'Mudou minha rotina' } });
    expect(contador?.textContent).toContain('18/1000');
  });

  it('liga o erro ao campo e marca aria-invalid', () => {
    render(<AreaTexto rotulo="Texto" value="" onChange={() => undefined} maxLength={1000} erro="Escreva mais." />);
    const campo = screen.getByRole('textbox', { name: 'Texto' });
    expect(campo.getAttribute('aria-invalid')).toBe('true');
    const ids = (campo.getAttribute('aria-describedby') ?? '').split(' ');
    expect(ids.map((i) => document.getElementById(i)?.textContent)).toContain('Escreva mais.');
  });
});
