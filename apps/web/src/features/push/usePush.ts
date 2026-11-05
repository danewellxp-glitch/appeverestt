import type { PushChavePublica, PushEstado } from '@everest/shared';
import { useSyncExternalStore } from 'react';
import { api } from '../../lib/api';
import { rodandoStandalone } from '../pwa/standalone';
import { ehIOS } from '../pwa/useInstallPrompt';

/**
 * Lembretes no celular (Web Push, R22): estado de módulo + `useSyncExternalStore`, como o
 * `useInstallPrompt`. A inscrição mora no navegador (PushManager) e no servidor (`/push/inscricao`);
 * `sincronizarPush` alinha as duas no login, `desligarPush` encerra no logout.
 */

/**
 * - `ok`: o navegador recebe push.
 * - `ios-sem-app`: iPhone/iPad no Safari; o push só existe com o app instalado na tela de início.
 * - `sem-suporte`: navegador sem Push API (ou sem service worker).
 */
export type SuportePush = 'ok' | 'sem-suporte' | 'ios-sem-app';
export type PermissaoPush = NotificationPermission | 'indisponivel';

export interface EstadoPush {
  suporte: SuportePush;
  permissao: PermissaoPush;
  /** Este aparelho está inscrito (no navegador e no servidor). */
  inscrito: boolean;
  /** Ativando, desligando ou conferindo a inscrição. */
  ocupado: boolean;
}

export type ResultadoAtivar = 'ativado' | 'recusado' | 'bloqueado' | 'indisponivel';

/** Espera o SW ficar pronto (no `vite dev` não há SW: não pendura a tela). */
const ESPERA_SW_MS = 10_000;

export function detectarSuporte(): SuportePush {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'sem-suporte';
  const temApis = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (temApis) return 'ok';
  // iOS 16.4+ tem push, mas só no app instalado (standalone).
  if (ehIOS() && !rodandoStandalone()) return 'ios-sem-app';
  return 'sem-suporte';
}

function lerPermissao(): PermissaoPush {
  return typeof Notification === 'undefined' ? 'indisponivel' : Notification.permission;
}

function estadoInicial(): EstadoPush {
  const suporte = detectarSuporte();
  return { suporte, permissao: suporte === 'ok' ? lerPermissao() : 'indisponivel', inscrito: false, ocupado: false };
}

let estado: EstadoPush = estadoInicial();
const ouvintes = new Set<() => void>();

function definir(parcial: Partial<EstadoPush>): void {
  estado = { ...estado, ...parcial };
  ouvintes.forEach((cb) => cb());
}

/** Só testes: recomeça do zero (o estado é de módulo). */
export function reiniciarPushParaTestes(): void {
  estado = estadoInicial();
  ouvintes.clear();
}

export function lerEstadoPush(): EstadoPush {
  return estado;
}

/** Chave VAPID pública (base64url) → bytes para o `applicationServerKey`. */
export function chaveParaBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const preenchido = base64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base64url.length / 4) * 4, '=');
  const binario = atob(preenchido);
  const bytes = new Uint8Array(new ArrayBuffer(binario.length));
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

function mesmosBytes(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a) return false;
  const x = new Uint8Array(a);
  return x.length === b.length && x.every((v, i) => v === b[i]);
}

async function registroDoSw(): Promise<ServiceWorkerRegistration | null> {
  const atual = await navigator.serviceWorker.getRegistration();
  if (atual) return atual;
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolver) => setTimeout(() => resolver(null), ESPERA_SW_MS)),
  ]);
}

async function inscricaoAtual(): Promise<PushSubscription | null> {
  const registro = await navigator.serviceWorker.getRegistration();
  return (await registro?.pushManager.getSubscription()) ?? null;
}

/**
 * Confere a inscrição deste aparelho (chamado quando a sessão muda). Sem sessão, só zera o estado.
 * Erros de rede não derrubam nada: fica como "não inscrito".
 */
export async function sincronizarPush(logado: boolean): Promise<void> {
  if (estado.suporte !== 'ok') return;
  definir({ permissao: lerPermissao() });
  if (!logado) {
    definir({ inscrito: false });
    return;
  }
  try {
    const inscricao = await inscricaoAtual();
    if (!inscricao || lerPermissao() !== 'granted') {
      definir({ inscrito: false });
      return;
    }
    const r = await api<PushEstado>(`/push/inscricao?endpoint=${encodeURIComponent(inscricao.endpoint)}`);
    definir({ inscrito: r.inscrito });
  } catch {
    definir({ inscrito: false });
  }
}

/**
 * Pede a permissão, inscreve no PushManager com a chave do servidor e salva no servidor.
 * Erros da API (ex.: PUSH_NAO_CONFIGURADO) sobem como ApiError para a tela mostrar.
 */
export async function ativarPush(): Promise<ResultadoAtivar> {
  if (estado.suporte !== 'ok') return 'indisponivel';
  if (lerPermissao() === 'denied') {
    definir({ permissao: 'denied' });
    return 'bloqueado';
  }
  definir({ ocupado: true });
  try {
    const permissao = await Notification.requestPermission();
    definir({ permissao });
    if (permissao !== 'granted') return permissao === 'denied' ? 'bloqueado' : 'recusado';

    const registro = await registroDoSw();
    if (!registro) return 'indisponivel';
    const { chave } = await api<PushChavePublica>('/push/chave-publica');
    const chaveBytes = chaveParaBytes(chave);

    let inscricao = await registro.pushManager.getSubscription();
    // Chave VAPID trocada no servidor: a inscrição antiga não recebe mais nada.
    if (inscricao && !mesmosBytes(inscricao.options.applicationServerKey, chaveBytes)) {
      await inscricao.unsubscribe();
      inscricao = null;
    }
    inscricao ??= await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveBytes });

    const json = inscricao.toJSON();
    await api<PushEstado>('/push/inscricao', {
      method: 'PUT',
      body: {
        endpoint: inscricao.endpoint,
        chaves: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
        userAgent: navigator.userAgent.slice(0, 512),
      },
    });
    definir({ inscrito: true });
    return 'ativado';
  } finally {
    definir({ ocupado: false });
  }
}

/**
 * Desliga neste aparelho: apaga no servidor (com a sessão ainda válida) e cancela no navegador.
 * Falha do servidor não impede cancelar no navegador (a API limpa a inscrição vencida no próximo envio).
 */
export async function desligarPush(): Promise<void> {
  if (estado.suporte !== 'ok') return;
  definir({ ocupado: true });
  try {
    const inscricao = await inscricaoAtual();
    if (inscricao) {
      try {
        await api<null>('/push/inscricao', { method: 'DELETE', body: { endpoint: inscricao.endpoint }, silenciar401: true });
      } finally {
        await inscricao.unsubscribe().catch(() => false);
      }
    }
    definir({ inscrito: false });
  } finally {
    definir({ ocupado: false });
  }
}

/** Antes do logout: desliga sem atrasar a saída por mais de 3 s nem falhar por causa do push. */
export async function desligarPushAoSair(): Promise<void> {
  if (estado.suporte !== 'ok') return;
  await Promise.race([desligarPush().catch(() => undefined), new Promise((r) => setTimeout(r, 3000))]);
}

function assinar(cb: () => void): () => void {
  ouvintes.add(cb);
  return () => ouvintes.delete(cb);
}

const ESTADO_SERVIDOR: EstadoPush = { suporte: 'sem-suporte', permissao: 'indisponivel', inscrito: false, ocupado: false };

export interface Push extends EstadoPush {
  ativar: () => Promise<ResultadoAtivar>;
  desligar: () => Promise<void>;
}

export function usePush(): Push {
  const atual = useSyncExternalStore(assinar, lerEstadoPush, () => ESTADO_SERVIDOR);
  return { ...atual, ativar: ativarPush, desligar: desligarPush };
}
