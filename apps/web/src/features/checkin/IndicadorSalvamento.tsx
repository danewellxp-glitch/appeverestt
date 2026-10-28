import { Check, CloudOff, Loader2 } from 'lucide-react';
import { Botao } from '../../components/ui/Botao';
import { Alerta } from '../../components/ui/basicos';
import type { ErroSalvamento, EstadoSalvamento } from './useCheckin';

/** "Salvando…" / "Salvo" / erro com "tentar de novo" (região aria-live). */
export function IndicadorSalvamento({
  estado,
  erro,
  aguardandoConexao,
  aoTentarDeNovo,
}: {
  estado: EstadoSalvamento;
  erro: ErroSalvamento | null;
  aguardandoConexao: boolean;
  aoTentarDeNovo: () => void;
}) {
  let conteudo = null;
  if (estado === 'salvando' && aguardandoConexao) {
    conteudo = (
      <>
        <CloudOff className="size-4" aria-hidden /> Sem conexão — salvaremos quando ela voltar
      </>
    );
  } else if (estado === 'pendente' || estado === 'salvando') {
    conteudo = (
      <>
        <Loader2 className="size-4 animate-spin" aria-hidden /> Salvando…
      </>
    );
  } else if (estado === 'salvo') {
    conteudo = (
      <>
        <Check className="size-4 text-sucesso" aria-hidden /> Salvo
      </>
    );
  } else if (estado === 'ocioso') {
    conteudo = <>As alterações são salvas automaticamente</>;
  }

  return (
    <div className="flex flex-col gap-2">
      <p aria-live="polite" className="flex min-h-6 items-center gap-1.5 text-sm text-texto-2">
        {estado === 'erro' ? 'Erro ao salvar' : conteudo}
      </p>
      {estado === 'erro' && erro && (
        <Alerta
          tipo={erro.podeTentar ? 'erro' : 'aviso'}
          acao={
            erro.podeTentar ? (
              <Botao variante="secundario" onClick={aoTentarDeNovo} className="shrink-0">
                Tentar de novo
              </Botao>
            ) : undefined
          }
        >
          {erro.podeTentar ? `Erro ao salvar — ${erro.mensagem}` : erro.mensagem}
        </Alerta>
      )}
    </div>
  );
}
