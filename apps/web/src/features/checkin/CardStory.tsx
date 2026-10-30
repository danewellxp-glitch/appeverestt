import { AtSign, Copy } from 'lucide-react';
import { Botao } from '../../components/ui/Botao';
import { Interruptor } from '../../components/ui/Interruptor';
import { useToast } from '../../components/ui/Toast';
import { copiarTexto } from '../desafio/navegacao';
import { CardRequisito } from './CardRequisito';

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
  const { toast } = useToast();
  const texto = instagramHandle && hashtag ? `@${instagramHandle} #${hashtag}` : null;

  return (
    <CardRequisito
      titulo="Story no Instagram"
      meta="Marcando o perfil e com a hashtag"
      icone={<AtSign className="size-5" />}
      cumprido={storyPostado}
      falta="Pendente"
    >
      {texto && (
        <div className="flex items-center gap-2 rounded-2xl bg-superficie-2 py-1.5 pr-1.5 pl-3.5 text-sm font-semibold">
          <span className="min-w-0 flex-1 select-all [overflow-wrap:anywhere]">{texto}</span>
          <Botao
            tamanho="sm"
            variante="google"
            icone={<Copy className="size-4" aria-hidden />}
            aria-label={`Copiar ${texto}`}
            onClick={() =>
              void copiarTexto(texto).then((ok) =>
                toast(ok ? 'Copiado! Agora é só colar no story.' : `Copie à mão: ${texto}`, { duracao: ok ? 2400 : 6000 }),
              )
            }
          >
            Copiar
          </Botao>
        </div>
      )}
      <Interruptor ligado={storyPostado} rotulo="Postei o story de hoje" disabled={!editavel} aoAlternar={aoAlterar} />
    </CardRequisito>
  );
}
