import type { CheckinInput, DiaDetalhe } from '@everest/shared';
import { useEffect, useRef } from 'react';
import { aplicarAcaoRapida, lerAcaoRapida, PARAMETRO_ACAO } from './acaoRapida';

interface Opcoes {
  params: URLSearchParams;
  setParams: (params: URLSearchParams, opcoes: { replace: boolean }) => void;
  dia: Pick<DiaDetalhe, 'numeroDia' | 'editavel'>;
  editavel: boolean;
  online: boolean;
  valores: CheckinInput | null;
  alterar: (fn: (v: CheckinInput) => CheckinInput, opcoes?: { imediato?: boolean }) => void;
  toast: (texto: string) => void;
}

/**
 * Aplica a ação rápida pedida na URL do dia (`/desafio/dia/N?acao=...`) assim que os valores
 * estiverem disponíveis, salva na hora (sem debounce) e remove o parâmetro com `replace`, para
 * um reload ou "voltar" não repetir a ação. Cada ação é aplicada no máximo uma vez por montagem.
 */
export function useAcaoRapida({ params, setParams, dia, editavel, online, valores, alterar, toast }: Opcoes): void {
  const aplicada = useRef(false);
  const acao = lerAcaoRapida(params);
  const temParametro = params.has(PARAMETRO_ACAO);

  useEffect(() => {
    if (!temParametro || aplicada.current || !valores) return;
    aplicada.current = true;

    const limpar = () => {
      const novos = new URLSearchParams(params);
      novos.delete(PARAMETRO_ACAO);
      setParams(novos, { replace: true });
    };

    if (!acao) {
      limpar();
      return;
    }
    if (!dia.editavel) {
      toast('Só o dia de hoje pode ser editado.');
      limpar();
      return;
    }
    if (!online || !editavel) {
      toast('Sem conexão: marque de novo quando a internet voltar.');
      limpar();
      return;
    }
    const resultado = aplicarAcaoRapida(acao, valores);
    if (resultado.mudou) alterar((v) => aplicarAcaoRapida(acao, v).valores, { imediato: true });
    toast(resultado.mensagem);
    limpar();
    // Só na montagem com valores prontos: a ação da URL é consumida uma única vez.
  }, [temParametro, valores !== null]);
}
