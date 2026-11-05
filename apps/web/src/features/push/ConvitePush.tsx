import { BellRing } from 'lucide-react';
import { useState } from 'react';
import { Botao } from '../../components/ui/Botao';
import { useToast } from '../../components/ui/Toast';
import { mensagemGeral } from '../auth/formulario';
import { mensagemDoAtivar } from './LinhaLembretes';
import { usePush } from './usePush';

/** "Agora não" vale para sempre neste navegador (o Perfil continua com o interruptor). */
export const CHAVE_CONVITE_PUSH = 'everest-push-convite';

function dispensado(): boolean {
  try {
    return localStorage.getItem(CHAVE_CONVITE_PUSH) !== null;
  } catch {
    return false;
  }
}

function lembrarDispensa(): void {
  try {
    localStorage.setItem(CHAVE_CONVITE_PUSH, 'dispensado');
  } catch {
    // Sem storage (aba anônima, bloqueado): o convite some só nesta visita.
  }
}

/**
 * Convite para os lembretes no celular (R22) na home do inscrito confirmado: só quando o navegador
 * recebe push, a pessoa ainda não ativou, não bloqueou e não dispensou.
 */
export function ConvitePush() {
  const push = usePush();
  const { toast } = useToast();
  const [oculto, setOculto] = useState(dispensado);

  if (oculto || push.suporte !== 'ok' || push.inscrito || push.permissao === 'denied') return null;

  function agoraNao() {
    lembrarDispensa();
    setOculto(true);
  }

  async function ativar() {
    try {
      const r = await push.ativar();
      const msg = mensagemDoAtivar(r);
      if (msg) toast(r === 'recusado' ? 'Sem permissão, sem lembretes. Dá para ativar depois no Perfil.' : msg);
      if (r !== 'ativado') agoraNao();
    } catch (e) {
      toast(mensagemGeral(e));
    }
  }

  return (
    <section aria-labelledby="convite-push-titulo" className="grid gap-3 rounded-[28px] bg-pop p-[18px] text-pop-texto">
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid size-[42px] shrink-0 place-items-center rounded-full bg-vermelho text-sobre-vermelho">
          <BellRing className="size-5" />
        </span>
        <div className="grid gap-1">
          <h2 id="convite-push-titulo" className="text-[17px] font-bold">
            Lembretes no celular
          </h2>
          <p className="text-sm text-pop-texto-2">
            Um toque na hora da água, do treino e da leitura. No Android, dá para registrar direto na notificação.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Botao tamanho="sm" carregando={push.ocupado} onClick={() => void ativar()} className="flex-1">
          Ativar
        </Botao>
        <button
          type="button"
          disabled={push.ocupado}
          onClick={agoraNao}
          className="press inline-flex h-[42px] min-h-11 flex-1 items-center justify-center rounded-full px-3.5 text-sm font-semibold text-pop-texto hover:bg-pop-trilho disabled:opacity-50"
        >
          Agora não
        </button>
      </div>
    </section>
  );
}
