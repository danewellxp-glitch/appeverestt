import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FolhaInferior } from './FolhaInferior';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function Cenario() {
  const [aberta, setAberta] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAberta(true)}>
        Excluir conta
      </button>
      <FolhaInferior aberta={aberta} aoFechar={() => setAberta(false)} titulo="Excluir sua conta?">
        <button type="button">Cancelar</button>
        <button type="button">Excluir</button>
      </FolhaInferior>
    </>
  );
}

function abrir(): HTMLElement {
  const gatilho = screen.getByRole('button', { name: 'Excluir conta' });
  gatilho.focus();
  fireEvent.click(gatilho);
  return gatilho;
}

describe('FolhaInferior', () => {
  it('abre como diálogo modal rotulado e foca o primeiro botão', () => {
    render(<Cenario />);
    abrir();
    const dialogo = screen.getByRole('dialog', { name: 'Excluir sua conta?' });
    expect(dialogo.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancelar' }));
  });

  it('Esc fecha e devolve o foco ao gatilho', () => {
    vi.useFakeTimers();
    render(<Cenario />);
    const gatilho = abrir();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.activeElement).toBe(gatilho);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Tab no último elemento volta para o primeiro (foco preso)', () => {
    render(<Cenario />);
    abrir();
    const excluir = screen.getByRole('button', { name: 'Excluir' });
    excluir.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancelar' }));
  });
});
