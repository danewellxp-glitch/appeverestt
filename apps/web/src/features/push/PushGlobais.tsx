import { useEffect } from 'react';
import { useMe } from '../../lib/queries';
import { sincronizarPush } from './usePush';

/**
 * Confere a inscrição do push sempre que a sessão muda (login, troca de conta, logout).
 * Montado em main.tsx, ao lado do PwaGlobais.
 */
export function PushGlobais() {
  const { data: me, isPending } = useMe();
  const usuarioId = me?.usuario.id ?? null;

  useEffect(() => {
    if (isPending) return;
    void sincronizarPush(usuarioId !== null);
  }, [isPending, usuarioId]);

  return null;
}
