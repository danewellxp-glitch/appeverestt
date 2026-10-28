import { useQueryClient } from '@tanstack/react-query';
import type { DiaDetalhe } from '@everest/shared';
import { useEffect, useRef } from 'react';
import { chaves } from '../../lib/queries';
import { CHAVE_MUTACAO_CHECKIN } from '../checkin/useCheckin';

const INTERVALO_RAPIDO_MS = 2_000;
const INTERVALO_LENTO_MS = 10_000;
/** Depois de ~1 min no ritmo rápido, desacelera (worker lento ou fora do ar). */
const TENTATIVAS_RAPIDAS = 30;

/**
 * Enquanto alguma foto do dia estiver ENVIADA (o worker está processando), recarrega o dia
 * a cada ~2 s. Quando o processamento termina, atualiza progresso e ranking
 * (uma foto REJEITADA pode desfazer a conclusão do dia).
 */
export function usePollingFotos(slug: string, dia: DiaDetalhe | undefined): void {
  const qc = useQueryClient();
  const numeroDia = dia?.numeroDia ?? null;
  const processando = dia?.fotos.some((f) => f.status === 'ENVIADA') ?? false;
  const processavaAntes = useRef(false);

  useEffect(() => {
    if (processavaAntes.current && !processando) {
      void qc.invalidateQueries({ queryKey: chaves.progresso(slug) });
      void qc.invalidateQueries({ queryKey: chaves.ranking(slug) });
    }
    processavaAntes.current = processando;
  }, [processando, qc, slug]);

  useEffect(() => {
    if (!processando || numeroDia === null) return;
    let tentativas = 0;
    let timer: number;
    const agendar = () => {
      timer = window.setTimeout(tick, tentativas < TENTATIVAS_RAPIDAS ? INTERVALO_RAPIDO_MS : INTERVALO_LENTO_MS);
    };
    const tick = () => {
      tentativas += 1;
      // Não recarrega durante um salvamento do check-in (a resposta antiga sobrescreveria o cache).
      if (qc.isMutating({ mutationKey: [...CHAVE_MUTACAO_CHECKIN, slug] }) === 0) {
        void qc.invalidateQueries({ queryKey: chaves.dia(slug, numeroDia) });
      }
      agendar();
    };
    agendar();
    return () => window.clearTimeout(timer);
  }, [processando, numeroDia, qc, slug]);
}
