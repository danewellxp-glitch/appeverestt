import { Check, CloudOff, Loader2, RotateCw } from 'lucide-react';
import type { ErroSalvamento, EstadoSalvamento } from './useCheckin';

/** Status compacto no topo da tela do dia: "Salvando…", "Salvo", "Sem conexão" ou "Erro · tentar de novo". */
export function IndicadorSalvamento({
  estado,
  erro,
  aguardandoConexao,
  online,
  aoTentarDeNovo,
}: {
  estado: EstadoSalvamento;
  erro: ErroSalvamento | null;
  aguardandoConexao: boolean;
  online: boolean;
  aoTentarDeNovo: () => void;
}) {
  if (estado === 'erro' && erro?.podeTentar) {
    return (
      <button
        type="button"
        onClick={aoTentarDeNovo}
        className="flex min-h-11 items-center gap-1.5 rounded-full px-2 text-xs font-semibold whitespace-nowrap text-vermelho-texto"
      >
        <RotateCw className="size-3.5" aria-hidden />
        Erro · tentar de novo
      </button>
    );
  }
  let conteudo = null;
  if (!online || (estado === 'salvando' && aguardandoConexao)) {
    conteudo = (
      <>
        <CloudOff className="size-3.5" aria-hidden /> Sem conexão
      </>
    );
  } else if (estado === 'pendente' || estado === 'salvando') {
    conteudo = (
      <>
        <Loader2 className="size-3.5 animate-spin" aria-hidden /> Salvando…
      </>
    );
  } else if (estado === 'salvo' || estado === 'ocioso') {
    conteudo = (
      <>
        <Check className="size-3.5" aria-hidden /> Salvo
      </>
    );
  }
  return (
    <p aria-live="polite" className="flex min-h-11 items-center gap-1.5 text-xs whitespace-nowrap text-texto-2">
      {conteudo}
    </p>
  );
}
