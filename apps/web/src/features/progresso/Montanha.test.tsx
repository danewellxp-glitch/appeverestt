import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ALTURA, LARGURA, Montanha, pontoNaCrista, posicionarItens } from './Montanha';

afterEach(cleanup);

describe('Montanha', () => {
  it('sem `outros`: só o SVG, com o marcador e o rótulo de sempre', () => {
    const { container } = render(<Montanha diasConcluidos={10} totalDias={30} altitude={2949} />);
    const svg = screen.getByRole('img', { name: 'Você está a 2.949 metros, 10 de 30 dias concluídos' });
    expect(container.firstElementChild).toBe(svg);
    expect(svg.getAttribute('viewBox')).toBe(`0 0 ${LARGURA} ${ALTURA}`);
    expect(svg.querySelectorAll('circle').length).toBe(3);
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('pontoNaCrista vai da base (10, 200) ao cume (300, 20)', () => {
    expect(pontoNaCrista(0)).toEqual({ x: 10, y: 200 });
    const cume = pontoNaCrista(1);
    expect(cume.x).toBeCloseTo(300);
    expect(cume.y).toBeCloseTo(20);
    const meio = pontoNaCrista(0.5);
    expect(meio.x).toBeGreaterThan(10);
    expect(meio.x).toBeLessThan(300);
  });

  it('posicionarItens desloca na vertical as bolhas que colidiriam', () => {
    const [a, b, c] = posicionarItens([{ fracao: 0.5 }, { fracao: 0.52 }, { fracao: 0.9 }]);
    expect(a).toEqual(pontoNaCrista(0.5));
    expect(b?.x).toBeCloseTo(pontoNaCrista(0.52).x);
    expect(b?.y).not.toBeCloseTo(pontoNaCrista(0.52).y);
    expect(Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.y ?? 0) - (b?.y ?? 0))).toBeGreaterThanOrEqual(36);
    expect(c).toEqual(pontoNaCrista(0.9));
  });

  it('posicionarItens: maior prioridade escolhe primeiro e a descartável sem lugar fica de fora', () => {
    const fracoes = [0.5, 0.51, 0.52, 0.53];
    const r = posicionarItens(fracoes.map((fracao, i) => ({ fracao, prioridade: i === 3 ? 10 : 0, descartavel: i !== 3 })));
    expect(r[3]).toEqual(pontoNaCrista(0.53));
    expect(r.filter((p) => p === null).length).toBeGreaterThan(0);
  });

  it('com `outros`: camada HTML posicionada em % sobre o SVG, sem o marcador quando pedido', () => {
    render(
      <Montanha
        diasConcluidos={0}
        totalDias={30}
        altitude={0}
        marcador={false}
        outros={[
          { chave: 'a', fracao: 0, conteudo: <button type="button">Base</button> },
          { chave: 'b', fracao: 1, conteudo: <button type="button">Cume</button> },
        ]}
      />,
    );
    const camada = screen.getByRole('list', { name: 'Turma na montanha' });
    const [base, cume] = within(camada).getAllByRole('listitem');
    expect(base?.style.left).toBe(`${(10 / LARGURA) * 100}%`);
    expect(base?.style.top).toBe(`${(200 / ALTURA) * 100}%`);
    expect(cume?.style.left).toBe(`${(300 / LARGURA) * 100}%`);
    expect(screen.getByRole('img').querySelectorAll('circle').length).toBe(0);
  });
});
