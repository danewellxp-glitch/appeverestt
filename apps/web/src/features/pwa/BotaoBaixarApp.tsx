// STUB TEMPORÁRIO — o agente de PWA substitui pela versão com useInstallPrompt.
import { Download } from 'lucide-react';
import { Botao } from '../../components/ui/Botao';

export function BotaoBaixarApp({ className = '' }: { className?: string }) {
  return (
    <Botao variante="secundario" icone={<Download className="size-4" aria-hidden />} className={className}>
      Baixar o app
    </Botao>
  );
}
