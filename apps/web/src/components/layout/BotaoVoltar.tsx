import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { marcarDirecao } from '../../lib/transicoes';

/**
 * Botão circular de 44 px. Volta no histórico quando a pessoa chegou por dentro do app;
 * se abriu a página direto (link, recarga), vai para a rota pai.
 */
export function BotaoVoltar({ para, className = '' }: { para: string; className?: string }) {
  const navegar = useNavigate();
  const { key } = useLocation();
  return (
    <button
      type="button"
      aria-label="Voltar"
      onClick={() => {
        marcarDirecao('voltar');
        // O react-router dá a key 'default' à primeira entrada do histórico.
        if (key !== 'default') void navegar(-1);
        else void navegar(para, { viewTransition: true });
      }}
      className={`press grid size-11 shrink-0 place-items-center rounded-full bg-superficie shadow-[inset_0_0_0_1px_var(--borda)] ${className}`}
    >
      <ArrowLeft className="size-5" aria-hidden />
    </button>
  );
}
