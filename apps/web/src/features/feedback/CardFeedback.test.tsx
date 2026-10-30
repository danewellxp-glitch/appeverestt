import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { CardFeedback, deveMostrarFeedback } from './CardFeedback';

afterEach(cleanup);

describe('deveMostrarFeedback', () => {
  it('só a partir do dia 28 (de 30) ou depois do fim', () => {
    expect(deveMostrarFeedback({ status: 'NAO_INICIADO', diaAtual: null, totalDias: 30 })).toBe(false);
    expect(deveMostrarFeedback({ status: 'EM_ANDAMENTO', diaAtual: 1, totalDias: 30 })).toBe(false);
    expect(deveMostrarFeedback({ status: 'EM_ANDAMENTO', diaAtual: 27, totalDias: 30 })).toBe(false);
    expect(deveMostrarFeedback({ status: 'EM_ANDAMENTO', diaAtual: 28, totalDias: 30 })).toBe(true);
    expect(deveMostrarFeedback({ status: 'EM_ANDAMENTO', diaAtual: 30, totalDias: 30 })).toBe(true);
    expect(deveMostrarFeedback({ status: 'ENCERRADO', diaAtual: null, totalDias: 30 })).toBe(true);
  });
});

describe('CardFeedback', () => {
  function montar(props: Parameters<typeof CardFeedback>[0]) {
    return render(
      <MemoryRouter>
        <CardFeedback {...props} />
      </MemoryRouter>,
    );
  }

  it('não aparece antes do dia 28', () => {
    montar({ status: 'EM_ANDAMENTO', diaAtual: 27, totalDias: 30 });
    expect(screen.queryByRole('link', { name: /Conte como foi/ })).toBeNull();
  });

  it('aparece no dia 28 com link para /feedback', () => {
    montar({ status: 'EM_ANDAMENTO', diaAtual: 28, totalDias: 30 });
    const link = screen.getByRole('link', { name: /Conte como foi/ });
    expect(link.getAttribute('href')).toBe('/feedback');
  });

  it('aparece depois do encerramento', () => {
    montar({ status: 'ENCERRADO', diaAtual: null, totalDias: 30 });
    expect(screen.getByRole('link', { name: /Conte como foi/ })).toBeTruthy();
  });
});
