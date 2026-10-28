import { useId, useState } from 'react';
import { Botao } from '../../components/ui/Botao';
import { Card } from '../../components/ui/basicos';
import { useAtualizarInscricoes } from './consultas';

/** Toggle "Inscrições abertas" com confirmação inline antes do PATCH. */
export function ToggleInscricoes({ slug, abertas }: { slug: string; abertas: boolean }) {
  const idRotulo = useId();
  const idDescricao = useId();
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
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p id={idRotulo} className="font-bold">
            Inscrições abertas
          </p>
          <p id={idDescricao} className="text-sm text-texto-2">
            {abertas
              ? 'Novas pessoas podem entrar enquanto houver vaga.'
              : 'Ninguém novo pode entrar agora.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={abertas}
          aria-labelledby={idRotulo}
          aria-describedby={idDescricao}
          disabled={mutacao.isPending}
          onClick={() => {
            setAviso('');
            mutacao.reset();
            setConfirmando((c) => !c);
          }}
          className="flex min-h-11 min-w-16 shrink-0 items-center justify-center"
        >
          <span
            aria-hidden
            className={`relative h-7 w-12 rounded-full border transition-colors ${
              abertas ? 'border-green-600 bg-green-700' : 'border-borda bg-superficie-2'
            }`}
          >
            <span
              className={`absolute top-0.5 size-5.5 rounded-full bg-white transition-[left] ${
                abertas ? 'left-[calc(100%-1.5rem)]' : 'left-0.5'
              }`}
            />
          </span>
        </button>
      </div>

      {confirmando && (
        <div className="flex flex-col gap-3 rounded-xl border border-borda bg-superficie-2 p-3">
          <p className="text-sm">
            {proximo
              ? 'Abrir as inscrições? Novas pessoas poderão entrar no desafio enquanto houver vagas.'
              : 'Fechar as inscrições? Ninguém novo poderá entrar até você abrir de novo.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Botao autoFocus carregando={mutacao.isPending} onClick={confirmar}>
              {proximo ? 'Abrir inscrições' : 'Fechar inscrições'}
            </Botao>
            <Botao
              variante="secundario"
              disabled={mutacao.isPending}
              onClick={() => setConfirmando(false)}
            >
              Cancelar
            </Botao>
          </div>
        </div>
      )}

      <p
        aria-live="polite"
        className={`text-sm ${mutacao.isError ? 'text-vermelho-texto' : 'text-texto-2'}`}
      >
        {aviso}
      </p>
    </Card>
  );
}
