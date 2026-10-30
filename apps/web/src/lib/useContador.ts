import { useEffect, useRef, useState } from 'react';
import { reduzirMovimento } from './transicoes';

const DURACAO_PADRAO_MS = 800;

/** ease-out cúbico. */
function suavizar(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * Conta de 0 até `valor` em 800 ms, só na primeira exibição. Depois disso (refetch, edição)
 * o número muda direto. Com reduced motion devolve o valor final na hora.
 */
export function useContador(valor: number, duracaoMs = DURACAO_PADRAO_MS): number {
  const jaAnimou = useRef(false);
  const [atual, setAtual] = useState(() => (reduzirMovimento() ? valor : 0));

  useEffect(() => {
    if (jaAnimou.current || reduzirMovimento() || valor === 0) {
      jaAnimou.current = true;
      setAtual(valor);
      return;
    }
    let quadro = 0;
    let terminou = false;
    const inicio = performance.now();
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracaoMs);
      setAtual(Math.round(valor * suavizar(t)));
      if (t < 1) {
        quadro = requestAnimationFrame(passo);
      } else {
        terminou = true;
        jaAnimou.current = true;
      }
    };
    quadro = requestAnimationFrame(passo);
    return () => {
      cancelAnimationFrame(quadro);
      // Interrompida antes do fim (StrictMode remonta em dev; valor mudou no meio): recomeça.
      if (!terminou) jaAnimou.current = false;
    };
  }, [valor, duracaoMs]);

  return atual;
}
