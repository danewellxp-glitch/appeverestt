import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { DiaDetalhe, FotoDia } from '@everest/shared';
import { Users } from 'lucide-react';
import { Interruptor } from '../../components/ui/Interruptor';
import { useToast } from '../../components/ui/Toast';
import { api, ehApiError } from '../../lib/api';
import { chaves } from '../../lib/queries';
import { useOnline } from '../../lib/useOnline';
import { fotoEhValida } from './fotosValidas';

function comVisibilidade(dia: DiaDetalhe | undefined, visivel: boolean): DiaDetalhe | undefined {
  if (!dia) return dia;
  return {
    ...dia,
    fotos: dia.fotos.map((f) => (f.tipo === 'EXERCICIO' ? { ...f, visivelTurma: visivel } : f)),
  };
}

/** PATCH da visibilidade da foto do treino, otimista no cache do dia (volta atrás se falhar). */
export function useVisibilidadeTreino(slug: string, numeroDia: number) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const chave = chaves.dia(slug, numeroDia);
  return useMutation({
    mutationFn: (visivel: boolean) =>
      api<{ visivelTurma: boolean }>(`/desafios/${encodeURIComponent(slug)}/dias/${numeroDia}/fotos/EXERCICIO/visibilidade`, {
        method: 'PATCH',
        body: { visivel },
      }),
    onMutate: async (visivel) => {
      await qc.cancelQueries({ queryKey: chave });
      const antes = qc.getQueryData<DiaDetalhe>(chave);
      qc.setQueryData<DiaDetalhe>(chave, (d) => comVisibilidade(d, visivel));
      return { antes };
    },
    onSuccess: (r, visivel) => {
      // O servidor devolve o estado final: é ele que fica no cache.
      qc.setQueryData<DiaDetalhe>(chave, (d) => comVisibilidade(d, r.visivelTurma));
      toast(visivel ? 'A foto do treino voltou a aparecer para a turma.' : 'Foto do treino escondida da turma.');
    },
    onError: (e, _visivel, ctx) => {
      if (ctx?.antes) qc.setQueryData(chave, ctx.antes);
      toast(ehApiError(e) ? e.message : 'Não foi possível mudar a visibilidade. Tente de novo.');
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['turma', 'treinos', slug] });
    },
  });
}

/**
 * Aviso de que a foto do treino aparece na aba Treinos da turma e, com a foto enviada, o
 * interruptor "Esconder da turma" (vale também para dias passados: dá para se esconder depois).
 */
export function VisibilidadeTreino({ slug, numeroDia, foto }: { slug: string; numeroDia: number; foto: FotoDia | undefined }) {
  const online = useOnline();
  const mudar = useVisibilidadeTreino(slug, numeroDia);
  const temFoto = fotoEhValida(foto);
  const escondida = temFoto && foto.visivelTurma === false;

  return (
    <div className="grid gap-2">
      <p className="flex items-start gap-2 text-[13px] text-texto-2">
        <Users className="mt-0.5 size-4 shrink-0" aria-hidden />
        {escondida
          ? 'A foto do treino está escondida: só você e o embaixador veem.'
          : 'A foto do treino fica visível para a turma, na aba Treinos. Água e leitura ficam privadas.'}
      </p>
      {temFoto && (
        <Interruptor
          ligado={escondida}
          rotulo="Esconder da turma"
          disabled={!online || mudar.isPending}
          aoAlternar={(esconder) => mudar.mutate(!esconder)}
        />
      )}
    </div>
  );
}
