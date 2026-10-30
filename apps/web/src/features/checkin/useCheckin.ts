import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checkinSchema, requisitosPendentes, type CheckinInput, type DiaDetalhe } from '@everest/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ehApiError } from '../../lib/api';
import { chaves } from '../../lib/queries';
import { tiposFotosValidas } from '../fotos/fotosValidas';

export const CHAVE_MUTACAO_CHECKIN = ['checkin'] as const;
const DEBOUNCE_MS = 800;

export type EstadoSalvamento = 'ocioso' | 'pendente' | 'salvando' | 'salvo' | 'erro';

export interface ErroSalvamento {
  mensagem: string;
  /** false quando tentar de novo não adianta (ex.: o dia virou e não é mais editável). */
  podeTentar: boolean;
}

interface VarsSalvar {
  slug: string;
  numeroDia: number;
  valores: CheckinInput;
  /** Número da edição local que gerou este envio (respostas antigas não sobrescrevem as novas). */
  seq: number;
}

interface Rascunho {
  slug: string;
  numeroDia: number;
  valores: CheckinInput;
  seq: number;
}

export function valoresDoDia(d: DiaDetalhe): CheckinInput {
  return { aguaMl: d.aguaMl, exercicio: d.exercicio, paginasLidas: d.paginasLidas, storyPostado: d.storyPostado };
}

/**
 * Estado do check-in de um dia com salvamento automático.
 *
 * - As alterações ficam num rascunho local (a tela usa o rascunho, então refetches
 *   do dia — polling de fotos, foco da janela — não "desfazem" o que a pessoa digitou).
 * - 800 ms depois da última alteração, faz o PUT por uma mutation com update otimista
 *   do cache do dia. Envios do mesmo desafio rodam em série (`scope`).
 * - Ao trocar de dia, sair da tela ou esconder a aba, o envio pendente é feito na hora.
 * - Nunca envia `concluido`: o servidor recalcula.
 */
export function useCheckin(slug: string, dia: DiaDetalhe | undefined, podeEditar: boolean) {
  const qc = useQueryClient();
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  // Status do salvamento, amarrado ao dia a que se refere (não vaza para outro dia selecionado).
  const [status, setStatus] = useState<{ numeroDia: number; estado: EstadoSalvamento; erro: ErroSalvamento | null } | null>(
    null,
  );
  const seqRef = useRef(0);
  const pendenteRef = useRef<VarsSalvar | null>(null);
  const timerRef = useRef<number | null>(null);

  // Callbacks nas opções do useMutation (não no mutate) para rodarem mesmo após desmontar.
  const mutacao = useMutation({
    mutationKey: [...CHAVE_MUTACAO_CHECKIN, slug],
    scope: { id: `checkin:${slug}` },
    mutationFn: ({ slug: s, numeroDia, valores }: VarsSalvar) =>
      api<DiaDetalhe>(`/desafios/${s}/dias/${numeroDia}`, { method: 'PUT', body: checkinSchema.parse(valores) }),
    onMutate: async ({ slug: s, numeroDia, valores }) => {
      const chave = chaves.dia(s, numeroDia);
      await qc.cancelQueries({ queryKey: chave });
      const anterior = qc.getQueryData<DiaDetalhe>(chave);
      if (anterior) {
        qc.setQueryData<DiaDetalhe>(chave, {
          ...anterior,
          ...valores,
          requisitosPendentes: requisitosPendentes({
            ...valores,
            fotosValidas: tiposFotosValidas(anterior.fotos),
            invalidado: anterior.invalidado,
          }),
          // `concluido` continua o do servidor até a resposta chegar.
        });
      }
      return { anterior };
    },
    onError: (e, vars, contexto) => {
      const ultimo = vars.seq === seqRef.current;
      if (ultimo && contexto?.anterior) qc.setQueryData(chaves.dia(vars.slug, vars.numeroDia), contexto.anterior);
      if (!ultimo) return;
      if (ehApiError(e, 'DIA_NAO_EDITAVEL') || ehApiError(e, 'DESAFIO_ENCERRADO')) {
        // O dia fechou (virada da meia-noite): descarta o rascunho e recarrega.
        setRascunho(null);
        setStatus({ numeroDia: vars.numeroDia, estado: 'erro', erro: { mensagem: e.message, podeTentar: false } });
        void qc.invalidateQueries({ queryKey: chaves.dia(vars.slug, vars.numeroDia) });
        void qc.invalidateQueries({ queryKey: chaves.progresso(vars.slug) });
        return;
      }
      setStatus({
        numeroDia: vars.numeroDia,
        estado: 'erro',
        erro: { mensagem: ehApiError(e) ? e.message : 'Não foi possível salvar. Tente de novo.', podeTentar: true },
      });
    },
    onSuccess: (servidor, vars) => {
      void qc.invalidateQueries({ queryKey: chaves.progresso(vars.slug) });
      void qc.invalidateQueries({ queryKey: chaves.ranking(vars.slug) });
      void qc.invalidateQueries({ queryKey: chaves.feed(vars.slug) });
      // Se já existe edição mais nova, esta resposta está desatualizada: não regride o cache.
      if (vars.seq !== seqRef.current) return;
      qc.setQueryData(chaves.dia(vars.slug, vars.numeroDia), servidor);
      setRascunho((r) => (r && r.seq === vars.seq ? null : r));
      setStatus({ numeroDia: vars.numeroDia, estado: 'salvo', erro: null });
    },
  });

  const mutateRef = useRef(mutacao.mutate);
  useEffect(() => {
    mutateRef.current = mutacao.mutate;
  }, [mutacao.mutate]);

  const enviar = useCallback((vars: VarsSalvar) => {
    setStatus({ numeroDia: vars.numeroDia, estado: 'salvando', erro: null });
    mutateRef.current(vars);
  }, []);

  /** Envia agora o que estiver aguardando o debounce. */
  const descarregar = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const vars = pendenteRef.current;
    pendenteRef.current = null;
    if (vars) enviar(vars);
  }, [enviar]);

  const numeroDia = dia?.numeroDia ?? null;

  // Troca de dia ou saída da tela: salva o pendente imediatamente.
  useEffect(() => () => descarregar(), [slug, numeroDia, descarregar]);

  // App indo para o fundo (PWA no celular): salva antes que o sistema congele a aba.
  useEffect(() => {
    const aoEsconder = () => {
      if (document.visibilityState === 'hidden') descarregar();
    };
    document.addEventListener('visibilitychange', aoEsconder);
    window.addEventListener('pagehide', descarregar);
    return () => {
      document.removeEventListener('visibilitychange', aoEsconder);
      window.removeEventListener('pagehide', descarregar);
    };
  }, [descarregar]);

  const rascunhoAtual =
    rascunho && dia && rascunho.slug === slug && rascunho.numeroDia === dia.numeroDia ? rascunho : null;
  const valores: CheckinInput | null = rascunhoAtual?.valores ?? (dia ? valoresDoDia(dia) : null);

  /**
   * `imediato`: toques únicos (ex.: "Marcar como postado" na home) salvam na hora, sem debounce,
   * para o update otimista refletir já nos outros cards.
   */
  const alterar = (fn: (v: CheckinInput) => CheckinInput, opcoes: { imediato?: boolean } = {}) => {
    if (!podeEditar || !dia || !valores) return;
    // Encadeia com a última alteração ainda não renderizada (cliques muito rápidos).
    const pendente = pendenteRef.current;
    const base = pendente && pendente.slug === slug && pendente.numeroDia === dia.numeroDia ? pendente.valores : valores;
    const novos = fn(base);
    seqRef.current += 1;
    const vars: VarsSalvar = { slug, numeroDia: dia.numeroDia, valores: novos, seq: seqRef.current };
    pendenteRef.current = vars;
    setRascunho({ slug, numeroDia: dia.numeroDia, valores: novos, seq: vars.seq });
    setStatus({ numeroDia: dia.numeroDia, estado: 'pendente', erro: null });
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    if (opcoes.imediato) descarregar();
    else timerRef.current = window.setTimeout(descarregar, DEBOUNCE_MS);
  };

  const tentarDeNovo = () => {
    if (!rascunhoAtual) return;
    enviar({
      slug: rascunhoAtual.slug,
      numeroDia: rascunhoAtual.numeroDia,
      valores: rascunhoAtual.valores,
      seq: rascunhoAtual.seq,
    });
  };

  const statusAtual = status && dia && status.numeroDia === dia.numeroDia ? status : null;

  return {
    valores,
    alterar,
    estado: statusAtual?.estado ?? 'ocioso',
    erro: statusAtual?.erro ?? null,
    tentarDeNovo,
    /** Há alterações locais ainda não confirmadas pelo servidor. */
    temRascunho: rascunhoAtual !== null,
    /** Salvamento pausado esperando a conexão voltar (TanStack pausa mutations offline). */
    aguardandoConexao: mutacao.isPaused,
  };
}
