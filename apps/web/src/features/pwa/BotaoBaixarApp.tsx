import { Download } from 'lucide-react';
import { useState } from 'react';
import { Botao } from '../../components/ui/Botao';
import { FolhaInstalar } from './FolhaInstalar';
import { useInstallPrompt } from './useInstallPrompt';

/** "Baixar o app": abre a folha de instalação. Some quando o app já roda instalado. */
export function BotaoBaixarApp({ className = '' }: { className?: string }) {
  const { instalado } = useInstallPrompt();
  const [aberta, setAberta] = useState(false);
  if (instalado) return null;
  return (
    <div className={className}>
      <Botao
        variante="secundario"
        larguraTotal
        aria-haspopup="dialog"
        icone={<Download className="size-5" aria-hidden />}
        onClick={() => setAberta(true)}
      >
        Baixar o app
      </Botao>
      <FolhaInstalar aberta={aberta} aoFechar={() => setAberta(false)} />
    </div>
  );
}
