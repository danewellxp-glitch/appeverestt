import { useState } from 'react';
import { Botao } from '../../components/ui/Botao';
import { Interruptor } from '../../components/ui/Interruptor';
import { useAtualizarInscricoes } from './consultas';

/** Switch "Inscrições abertas" (toggle-row) com confirmação inline antes do PATCH. */
export function ToggleInscricoes({ slug, abertas }: { slug: string; abertas: boolean }) {
  const [confirmando, setConfirmando] = useState(false);
  const [aviso, setAviso] = useState('');
  const mutacao = useAtualizarInscricoes(slug);
  const proximo = !abertas;

  function confirmar() {
    setAviso('Salvando…');
    mutacao.mutate(
      { inscricoesAbertas: proximo },
      {
        onSuccess: (d) => {
          setConfirmando(false);
          setAviso(d.inscricoesAbertas ? 'Inscrições abertas.' : 'Inscrições fechadas.');
        },
        onError: (e) => setAviso(`Não foi possível salvar: ${e.message}`),
      },
    );
  }

  return (
    <section aria-label="Inscrições" className="grid gap-2">
      <Interruptor
        ligado={abertas}
        rotulo="Inscrições abertas"
        disabled={mutacao.isPending}
        aoAlternar={() => {
          setAviso('');
          mutacao.reset();
          setConfirmando((c) => !c);
        }}
      />
      {confirmando && (
        <div className="grid gap-3 rounded-2xl bg-superficie p-3.5 shadow-[inset_0_0_0_1px_var(--borda)]">
          <p className="text-sm">
            {proximo
              ? 'Abrir as inscrições? Novas pessoas poderão entrar no desafio enquanto houver vagas.'
              : 'Fechar as inscrições? Ninguém novo poderá entrar até você abrir de novo.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Botao tamanho="sm" autoFocus carregando={mutacao.isPending} onClick={confirmar}>
              {proximo ? 'Abrir inscrições' : 'Fechar inscrições'}
            </Botao>
            <Botao tamanho="sm" variante="secundario" disabled={mutacao.isPending} onClick={() => setConfirmando(false)}>
              Cancelar
            </Botao>
          </div>
        </div>
      )}
      <p aria-live="polite" className={`px-1 text-xs ${mutacao.isError ? 'text-vermelho-texto' : 'text-texto-2'}`}>
        {aviso || (abertas ? 'Novas pessoas podem entrar enquanto houver vaga.' : 'Ninguém novo pode entrar agora.')}
      </p>
    </section>
  );
}
