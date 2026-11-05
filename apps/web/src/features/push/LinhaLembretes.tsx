import { LEMBRETES_PUSH, type AcaoRapida } from '@everest/shared';
import type { ReactNode } from 'react';
import { Interruptor } from '../../components/ui/Interruptor';
import { useToast } from '../../components/ui/Toast';
import { mensagemGeral } from '../auth/formulario';
import { usePush, type ResultadoAtivar } from './usePush';

const NOMES: Record<AcaoRapida, string> = { agua: 'água', treino: 'treino', leitura: 'leitura' };

function horas(lista: readonly number[]): string {
  const h = lista.map((n) => `${n}h`);
  return h.length > 1 ? `${h.slice(0, -1).join(', ')} e ${h.at(-1) ?? ''}` : (h[0] ?? '');
}

/** "Água às 10h, 14h e 17h, treino às 18h e leitura às 21h." (a partir de LEMBRETES_PUSH). */
export function textoDosHorarios(): string {
  const partes = LEMBRETES_PUSH.map((l) => `${NOMES[l.acao]} às ${horas(l.horas)}`);
  const frase = partes.length > 1 ? `${partes.slice(0, -1).join(', ')} e ${partes.at(-1) ?? ''}` : (partes[0] ?? '');
  return `${frase.charAt(0).toUpperCase()}${frase.slice(1)}.`;
}

/** Toast de cada resultado do `ativar()` (null = nada a dizer). */
export function mensagemDoAtivar(r: ResultadoAtivar): string | null {
  switch (r) {
    case 'ativado':
      return 'Lembretes ativados neste celular.';
    case 'recusado':
      return 'Sem permissão, sem lembretes. Dá para ativar depois.';
    case 'bloqueado':
      return 'As notificações estão bloqueadas nas configurações do navegador.';
    case 'indisponivel':
      return 'Este navegador não recebe notificações agora. Tente pelo app instalado.';
  }
}

/** Perfil → Comunicação: "Lembretes no celular" (R22), com o estado em texto abaixo. */
export function LinhaLembretes({ aoInstalar }: { aoInstalar: () => void }) {
  const push = usePush();
  const { toast } = useToast();
  const bloqueado = push.suporte === 'ok' && push.permissao === 'denied' && !push.inscrito;

  async function alternar(ligar: boolean) {
    try {
      if (ligar) {
        const msg = mensagemDoAtivar(await push.ativar());
        if (msg) toast(msg);
      } else {
        await push.desligar();
        toast('Lembretes desligados neste celular.');
      }
    } catch (e) {
      toast(mensagemGeral(e));
    }
  }

  let estado: ReactNode;
  if (push.suporte === 'ios-sem-app') {
    estado = (
      <>
        No iPhone, instale o app antes.{' '}
        <button
          type="button"
          onClick={aoInstalar}
          aria-haspopup="dialog"
          className="inline-flex min-h-11 items-center font-semibold text-texto underline decoration-vermelho underline-offset-4"
        >
          Como instalar
        </button>
      </>
    );
  } else if (push.suporte === 'sem-suporte') {
    estado = 'Este navegador não recebe notificações.';
  } else if (bloqueado) {
    estado = 'Bloqueado nas configurações do navegador. Libere as notificações deste site para ativar.';
  } else if (push.inscrito) {
    estado = `Ativo neste celular. ${textoDosHorarios()}`;
  } else {
    estado = `${textoDosHorarios()} No Android, dá para registrar direto na notificação.`;
  }

  return (
    <>
      <Interruptor
        ligado={push.inscrito}
        rotulo="Lembretes no celular"
        disabled={push.ocupado || push.suporte !== 'ok' || bloqueado}
        aoAlternar={(ligar) => void alternar(ligar)}
      />
      <p className="px-1 text-xs text-texto-2" aria-live="polite">
        {estado}
      </p>
    </>
  );
}
