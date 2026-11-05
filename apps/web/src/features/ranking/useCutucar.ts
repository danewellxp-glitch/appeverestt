import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CutucadaResposta, PessoaHoje, TurmaHojeResposta } from '@everest/shared';
import { useToast } from '../../components/ui/Toast';
import { api, ehApiError } from '../../lib/api';
import { chaves } from '../../lib/queries';

/** Fecha a frase sem duplicar o ponto de "Maria L.". */
function comPonto(frase: string): string {
  return frase.endsWith('.') ? frase : `${frase}.`;
}

/** Marca a pessoa como cutucada hoje no cache da aba Hoje (sem esperar o próximo GET). */
function marcarCutucada(dados: TurmaHojeResposta | undefined, participanteId: string): TurmaHojeResposta | undefined {
  if (!dados || dados.minhasCutucadasHoje.includes(participanteId)) return dados;
  return { ...dados, minhasCutucadasHoje: [...dados.minhasCutucadasHoje, participanteId] };
}

/**
 * Cutucar quem ainda não fechou o dia (push). Sucesso ou JA_CUTUCOU marcam a pessoa no cache;
 * CUTUCADA_RECUSADA recarrega a lista (ela fechou o dia ou desligou as cutucadas).
 */
export function useCutucar(slug: string | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const chave = chaves.turmaHoje(slug ?? '');

  return useMutation({
    mutationFn: (pessoa: PessoaHoje) =>
      api<CutucadaResposta>(`/desafios/${encodeURIComponent(slug ?? '')}/cutucadas`, {
        method: 'POST',
        body: { participanteId: pessoa.participanteId },
      }),
    onSuccess: (resposta, pessoa) => {
      qc.setQueryData<TurmaHojeResposta>(chave, (d) => marcarCutucada(d, pessoa.participanteId));
      toast(
        resposta.entregue
          ? comPonto(`Cutucada enviada para ${pessoa.nomeExibicao}`)
          : `Cutucada registrada. ${pessoa.nomeExibicao} ainda não ativou as notificações.`,
      );
    },
    onError: (e, pessoa) => {
      if (ehApiError(e, 'JA_CUTUCOU')) {
        qc.setQueryData<TurmaHojeResposta>(chave, (d) => marcarCutucada(d, pessoa.participanteId));
        toast(`Você já cutucou ${pessoa.nomeExibicao} hoje.`);
        return;
      }
      if (ehApiError(e, 'CUTUCADA_RECUSADA')) void qc.invalidateQueries({ queryKey: chave });
      toast(ehApiError(e) ? e.message : 'Não foi possível cutucar agora. Tente de novo.');
    },
  });
}
