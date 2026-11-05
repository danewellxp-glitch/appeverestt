import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LIMITE_POSE, poseDiaSchema, type PoseDiaResposta, type TreinosTurmaResposta } from '@everest/shared';
import { useState } from 'react';
import { AreaTexto } from '../../components/ui/AreaTexto';
import { Alerta } from '../../components/ui/basicos';
import { Botao } from '../../components/ui/Botao';
import { FolhaInferior } from '../../components/ui/FolhaInferior';
import { useToast } from '../../components/ui/Toast';
import { api, ehApiError } from '../../lib/api';

/** "sugerida por Maria L." */
export function textoAutorPose(nome: string): string {
  return `sugerida por ${nome}`;
}

/** POST da pose do dia; atualiza o feed de treinos do dia atual em cache (aba e check-in). */
export function useSugerirPose(slug: string | undefined) {
  const qc = useQueryClient();
  const prefixo = ['turma', 'treinos', slug ?? ''];
  return useMutation({
    mutationFn: (texto: string) =>
      api<PoseDiaResposta>(`/desafios/${encodeURIComponent(slug ?? '')}/turma/pose`, {
        method: 'POST',
        body: { texto },
      }),
    onSuccess: ({ pose }) => {
      qc.setQueriesData<TreinosTurmaResposta>({ queryKey: prefixo }, (d) =>
        d && d.dia === d.diaAtual ? { ...d, pose, possoSugerirPose: false } : d,
      );
    },
    onError: (e) => {
      if (ehApiError(e, 'POSE_JA_DEFINIDA') || ehApiError(e, 'POSE_SEM_TREINO')) {
        void qc.invalidateQueries({ queryKey: prefixo });
      }
    },
  });
}

/** Folha "Sugerir a pose do dia": texto curto (3 a 80 caracteres) validado pelo schema do shared. */
export function FolhaPose({ slug, aberta, aoFechar }: { slug: string | undefined; aberta: boolean; aoFechar: () => void }) {
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | undefined>();
  const sugerir = useSugerirPose(slug);
  const { toast } = useToast();

  function enviar() {
    const r = poseDiaSchema.safeParse({ texto });
    if (!r.success) {
      setErro(r.error.issues[0]?.message ?? 'Confira o texto.');
      return;
    }
    setErro(undefined);
    sugerir.mutate(r.data.texto, {
      onSuccess: () => {
        toast('Pose do dia definida. A turma vai ver no check-in.');
        setTexto('');
        aoFechar();
      },
    });
  }

  return (
    <FolhaInferior aberta={aberta} aoFechar={aoFechar} titulo="Pose do dia">
      <p className="text-sm text-texto-2">
        Sugira uma pose para a turma repetir na foto do treino de hoje. Quem sugerir primeiro define a pose do dia.
      </p>
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
      >
        <AreaTexto
          rotulo="Pose do dia"
          value={texto}
          maxLength={LIMITE_POSE.max}
          rows={2}
          placeholder="Ex.: flexão segurando o livro"
          erro={erro}
          onChange={(e) => {
            setTexto(e.currentTarget.value);
            setErro(undefined);
          }}
        />
        {sugerir.isError && (
          <Alerta tipo="erro">{ehApiError(sugerir.error) ? sugerir.error.message : 'Não foi possível salvar a pose.'}</Alerta>
        )}
        <Botao type="submit" larguraTotal carregando={sugerir.isPending}>
          Definir a pose
        </Botao>
      </form>
    </FolhaInferior>
  );
}
