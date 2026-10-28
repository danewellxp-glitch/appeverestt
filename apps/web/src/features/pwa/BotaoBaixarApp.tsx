import { Download } from 'lucide-react';
import { useState } from 'react';
import { Botao } from '../../components/ui/Botao';
import { ModalInstrucoesIOS } from './ModalInstrucoesIOS';
import { useInstallPrompt } from './useInstallPrompt';

function ehLocal(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch {
    return false;
  }
}

/**
 * Link público do app. TODO_DECISAO(Q2): VITE_APP_URL ainda não definido para produção.
 * Se o env apontar para localhost mas o app estiver publicado, usa a origem atual.
 */
function urlDoApp(): string {
  const origem = window.location.origin;
  const doEnv = import.meta.env.VITE_APP_URL?.trim();
  if (!doEnv) return origem;
  if (ehLocal(doEnv) && !ehLocal(origem)) return origem;
  return doEnv;
}

/**
 * "Baixar o app": prompt nativo (Chrome/Android/desktop), passo a passo no iOS
 * ou, sem suporte, copia o link do app. Some quando o app já está instalado.
 */
export function BotaoBaixarApp({ className = '' }: { className?: string }) {
  const { instalado, ios, podeInstalar, instalar } = useInstallPrompt();
  const [modalAberto, setModalAberto] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [linkManual, setLinkManual] = useState<string | null>(null);

  if (instalado) return null;

  async function aoClicar() {
    setMensagem('');
    setLinkManual(null);

    if (podeInstalar) {
      const resultado = await instalar();
      if (resultado === 'aceito') setMensagem('Instalando o Everest…');
      if (resultado !== 'indisponivel') return;
    }

    if (ios) {
      setModalAberto(true);
      return;
    }

    const url = urlDoApp();
    try {
      await navigator.clipboard.writeText(url);
      setMensagem('Link copiado! Abra no navegador do celular.');
    } catch {
      // Sem permissão de clipboard: mostra o link para copiar/abrir manualmente.
      setLinkManual(url);
      setMensagem('Abra este link no navegador do celular:');
    }
  }

  return (
    <div className={className}>
      <Botao
        variante="secundario"
        larguraTotal
        icone={<Download className="size-4" aria-hidden />}
        onClick={() => void aoClicar()}
        aria-haspopup={ios && !podeInstalar ? 'dialog' : undefined}
      >
        Baixar o app
      </Botao>
      <p role="status" aria-live="polite" className="mt-2 text-center text-sm text-texto-2 empty:mt-0">
        {mensagem}
        {linkManual && (
          <>
            {' '}
            <a href={linkManual} className="break-all text-texto underline underline-offset-2">
              {linkManual}
            </a>
          </>
        )}
      </p>
      <ModalInstrucoesIOS aberto={modalAberto} onFechar={() => setModalAberto(false)} />
    </div>
  );
}
