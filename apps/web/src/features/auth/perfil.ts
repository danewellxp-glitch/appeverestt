import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AtualizarPerfilInput, MeResposta } from '@everest/shared';
import { api } from '../../lib/api';
import { chaves } from '../../lib/queries';

const CHAVE_ACEITE = 'everest-aceite-pendente';

/** /criar-conta: a pessoa marcou o aceite; a /bem-vindo já abre com ele marcado. */
export function marcarAceitePendente(): void {
  try {
    sessionStorage.setItem(CHAVE_ACEITE, '1');
  } catch {
    // armazenamento bloqueado: a pessoa marca de novo na /bem-vindo
  }
}

/** O aceite foi marcado em /criar-conta? (só lê: o StrictMode chama inicializadores duas vezes) */
export function lerAceitePendente(): boolean {
  try {
    return sessionStorage.getItem(CHAVE_ACEITE) === '1';
  } catch {
    return false;
  }
}

/** Apaga a marcação depois que o PATCH /me deu certo. */
export function limparAceitePendente(): void {
  try {
    sessionStorage.removeItem(CHAVE_ACEITE);
  } catch {
    // nada a fazer
  }
}

/** PATCH /me: dados de cadastro, aceite e consentimento de marketing (docs/FRONTEND.md §4.4). */
export function useAtualizarPerfil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: AtualizarPerfilInput) => api<MeResposta>('/me', { method: 'PATCH', body: dados }),
    onSuccess: (me) => {
      qc.setQueryData(chaves.me, me);
    },
  });
}

/** "11987654321" → "(11) 98765-4321", formatando enquanto a pessoa digita. */
export function mascararTelefone(valor: string): string {
  let d = valor.replace(/\D/g, '');
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  const corte = resto.length > 8 ? 5 : 4;
  if (resto.length <= corte) return `(${ddd}) ${resto}`;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}
