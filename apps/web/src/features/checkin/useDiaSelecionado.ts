import type { MeuProgresso } from '@everest/shared';
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Dia selecionado na tela, guardado em `?dia=N` (recarregar mantém a seleção).
 * Só aceita dias de 1 até o dia atual; qualquer outro valor cai no dia atual.
 * Selecionar o dia atual remove o parâmetro, para que recarregar no dia seguinte abra o novo "hoje".
 */
export function useDiaSelecionado(progresso: MeuProgresso) {
  const [params, setParams] = useSearchParams();
  const diaAtual = progresso.diaAtual;
  const bruto = params.get('dia');

  let selecionado = diaAtual;
  if (diaAtual !== null && bruto !== null && /^\d{1,3}$/.test(bruto)) {
    const n = Number(bruto);
    if (n >= 1 && n <= Math.min(diaAtual, progresso.totalDias)) selecionado = n;
  }

  const selecionar = useCallback(
    (n: number) => {
      setParams(
        (atuais) => {
          const novos = new URLSearchParams(atuais);
          if (n === diaAtual) novos.delete('dia');
          else novos.set('dia', String(n));
          return novos;
        },
        { replace: true },
      );
    },
    [setParams, diaAtual],
  );

  return { selecionado, selecionar };
}
