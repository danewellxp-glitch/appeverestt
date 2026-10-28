import { WifiOff } from 'lucide-react';
import { useOnline } from '../../lib/useOnline';

export function BannerOffline() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-amber-950 px-4 py-2 text-sm text-amber-100">
      <WifiOff className="size-4" aria-hidden />
      Você está offline. A edição volta quando a conexão voltar.
    </div>
  );
}
