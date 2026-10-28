import { AtSign, Copy } from 'lucide-react';
import { useId, useState } from 'react';
import { Botao } from '../../components/ui/Botao';
import { CardRequisito } from './CardRequisito';
import { Interruptor } from './Interruptor';

type ResultadoCopia = 'copiado' | 'falhou' | null;

export function CardStory({
  storyPostado,
  editavel,
  aoAlterar,
  instagramHandle,
  hashtag,
}: {
  storyPostado: boolean;
  editavel: boolean;
  aoAlterar: (postado: boolean) => void;
  instagramHandle: string | undefined;
  hashtag: string | undefined;
}) {
  const [copia, setCopia] = useState<ResultadoCopia>(null);
  const idTexto = useId();
  const texto = instagramHandle && hashtag ? `@${instagramHandle} #${hashtag}` : null;

  const copiar = async () => {
    if (!texto) return;
    try {
      // navigator.clipboard só existe em contexto seguro (https/localhost).
      if (typeof navigator.clipboard?.writeText !== 'function') throw new Error('Área de transferência indisponível');
      await navigator.clipboard.writeText(texto);
      setCopia('copiado');
    } catch {
      setCopia('falhou');
    }
  };

  return (
    <CardRequisito titulo="Story" icone={<AtSign className="size-5" />} cumprido={storyPostado}>
      <p className="text-sm text-texto-2">
        Poste um story no Instagram marcando{' '}
        {texto ? <strong className="text-texto">{texto}</strong> : 'o perfil e a hashtag do desafio'}.
      </p>
      <Botao
        variante="secundario"
        larguraTotal
        disabled={!texto}
        onClick={() => void copiar()}
        icone={<Copy className="size-4" aria-hidden />}
        className="normal-case tracking-normal"
      >
        {texto ? `Copiar ${texto}` : 'Copiar @ e hashtag'}
      </Botao>
      <div aria-live="polite" className="text-sm">
        {copia === 'copiado' && <p className="text-sucesso">Copiado! Agora é só colar no seu story.</p>}
        {copia === 'falhou' && texto && (
          <div className="flex flex-col gap-1">
            <label htmlFor={idTexto} className="text-texto-2">
              Não deu para copiar automaticamente. Toque no texto abaixo e copie:
            </label>
            <input
              id={idTexto}
              readOnly
              value={texto}
              onFocus={(e) => e.currentTarget.select()}
              className="min-h-11 rounded-xl border border-borda bg-superficie-2 px-3 text-base text-texto"
            />
          </div>
        )}
      </div>
      <Interruptor ligado={storyPostado} rotulo="Postei o story" disabled={!editavel} aoAlternar={aoAlterar} />
    </CardRequisito>
  );
}
