// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Chave VAPID de mentira (65 bytes, base64url). */
const CHAVE = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc';

interface Cenario {
  permissao: NotificationPermission;
  respostaPermissao: NotificationPermission;
  inscricao: PushSubscription | null;
  subscribe: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
  fetch: ReturnType<typeof vi.fn>;
}

function json(corpo: unknown, status = 200): Response {
  return new Response(corpo === null ? null : JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function criarInscricao(c: Cenario, chave: ArrayBuffer | null): PushSubscription {
  return {
    endpoint: ENDPOINT,
    options: { applicationServerKey: chave, userVisibleOnly: true },
    toJSON: () => ({ endpoint: ENDPOINT, keys: { p256dh: 'p256', auth: 'segredo' } }),
    unsubscribe: c.unsubscribe,
  } as unknown as PushSubscription;
}

/** Navegador com Push API (Chrome/Android ou iPhone com o app instalado). */
function montarNavegador(parcial: Partial<Pick<Cenario, 'permissao' | 'respostaPermissao'>> = {}): Cenario {
  const c: Cenario = {
    permissao: parcial.permissao ?? 'default',
    respostaPermissao: parcial.respostaPermissao ?? 'granted',
    inscricao: null,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(() => {
      c.inscricao = null;
      return Promise.resolve(true);
    }),
    fetch: vi.fn(),
  };
  c.subscribe.mockImplementation((op: PushSubscriptionOptionsInit) => {
    c.inscricao = criarInscricao(c, (op.applicationServerKey as Uint8Array).buffer as ArrayBuffer);
    return Promise.resolve(c.inscricao);
  });
  const pushManager = { getSubscription: () => Promise.resolve(c.inscricao), subscribe: c.subscribe };
  const registro = { pushManager };
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistration: () => Promise.resolve(registro), ready: Promise.resolve(registro) },
  });
  class NotificationFalsa {
    static get permission() {
      return c.permissao;
    }
    static requestPermission() {
      c.permissao = c.respostaPermissao;
      return Promise.resolve(c.permissao);
    }
  }
  vi.stubGlobal('Notification', NotificationFalsa);
  vi.stubGlobal('PushManager', class {});
  vi.stubGlobal('fetch', c.fetch);
  return c;
}

async function carregar() {
  vi.resetModules();
  return import('./usePush');
}

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, 'serviceWorker');
});

describe('usePush: suporte', () => {
  beforeEach(() => {
    Reflect.deleteProperty(navigator, 'serviceWorker');
  });

  it('sem Push API num navegador comum: sem-suporte', async () => {
    const { lerEstadoPush } = await carregar();
    expect(lerEstadoPush().suporte).toBe('sem-suporte');
  });

  it('iPhone no Safari (sem o app instalado): ios-sem-app', async () => {
    vi.stubGlobal('navigator', { ...navigator, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' });
    const { lerEstadoPush } = await carregar();
    expect(lerEstadoPush().suporte).toBe('ios-sem-app');
  });

  it('com service worker, PushManager e Notification: ok', async () => {
    montarNavegador();
    const { lerEstadoPush } = await carregar();
    expect(lerEstadoPush()).toMatchObject({ suporte: 'ok', permissao: 'default', inscrito: false });
  });
});

describe('usePush: ativar e desligar', () => {
  it('ativar: pede a permissão, inscreve com a chave do servidor e salva (PUT)', async () => {
    const c = montarNavegador();
    c.fetch.mockResolvedValueOnce(json({ chave: CHAVE })).mockResolvedValueOnce(json({ inscrito: true }));
    const { ativarPush, chaveParaBytes, lerEstadoPush } = await carregar();

    await expect(ativarPush()).resolves.toBe('ativado');

    expect(c.subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(CHAVE) });
    const [url1] = c.fetch.mock.calls[0] as [string];
    expect(url1).toBe('/api/push/chave-publica');
    const [url2, init] = c.fetch.mock.calls[1] as [string, RequestInit];
    expect(url2).toBe('/api/push/inscricao');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toMatchObject({
      endpoint: ENDPOINT,
      chaves: { p256dh: 'p256', auth: 'segredo' },
    });
    expect(lerEstadoPush()).toMatchObject({ inscrito: true, permissao: 'granted', ocupado: false });
  });

  it('permissão recusada: não inscreve nem chama a API', async () => {
    const c = montarNavegador({ respostaPermissao: 'denied' });
    const { ativarPush, lerEstadoPush } = await carregar();
    await expect(ativarPush()).resolves.toBe('bloqueado');
    expect(c.subscribe).not.toHaveBeenCalled();
    expect(c.fetch).not.toHaveBeenCalled();
    expect(lerEstadoPush()).toMatchObject({ inscrito: false, permissao: 'denied' });
  });

  it('já bloqueado nas configurações: nem pede de novo', async () => {
    const c = montarNavegador({ permissao: 'denied' });
    const { ativarPush } = await carregar();
    await expect(ativarPush()).resolves.toBe('bloqueado');
    expect(c.fetch).not.toHaveBeenCalled();
  });

  it('push não configurado no servidor: o erro sobe para a tela', async () => {
    const c = montarNavegador();
    c.fetch.mockResolvedValueOnce(
      json({ codigo: 'PUSH_NAO_CONFIGURADO', mensagem: 'Lembretes indisponíveis.' }, 503),
    );
    const { ativarPush, lerEstadoPush } = await carregar();
    await expect(ativarPush()).rejects.toMatchObject({ codigo: 'PUSH_NAO_CONFIGURADO' });
    expect(c.subscribe).not.toHaveBeenCalled();
    expect(lerEstadoPush()).toMatchObject({ inscrito: false, ocupado: false });
  });

  it('inscrição antiga com outra chave VAPID: cancela e inscreve de novo', async () => {
    const c = montarNavegador({ permissao: 'granted' });
    c.inscricao = criarInscricao(c, new Uint8Array([1, 2, 3]).buffer);
    c.fetch.mockResolvedValueOnce(json({ chave: CHAVE })).mockResolvedValueOnce(json({ inscrito: true }));
    const { ativarPush } = await carregar();
    await expect(ativarPush()).resolves.toBe('ativado');
    expect(c.unsubscribe).toHaveBeenCalledTimes(1);
    expect(c.subscribe).toHaveBeenCalledTimes(1);
  });

  it('desligar: DELETE com o endpoint e cancela no navegador', async () => {
    const c = montarNavegador({ permissao: 'granted' });
    c.inscricao = criarInscricao(c, null);
    c.fetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const { desligarPush, lerEstadoPush } = await carregar();
    await desligarPush();
    const [url, init] = c.fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/push/inscricao');
    expect(init.method).toBe('DELETE');
    expect(JSON.parse(init.body as string)).toEqual({ endpoint: ENDPOINT });
    expect(c.unsubscribe).toHaveBeenCalledTimes(1);
    expect(lerEstadoPush().inscrito).toBe(false);
  });

  it('desligar sem rede: cancela no navegador mesmo assim', async () => {
    const c = montarNavegador({ permissao: 'granted' });
    c.inscricao = criarInscricao(c, null);
    c.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { desligarPushAoSair } = await carregar();
    await desligarPushAoSair();
    expect(c.unsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe('usePush: sincronizar com a sessão', () => {
  it('logado com inscrição no navegador: pergunta ao servidor', async () => {
    const c = montarNavegador({ permissao: 'granted' });
    c.inscricao = criarInscricao(c, null);
    c.fetch.mockResolvedValueOnce(json({ inscrito: true }));
    const { sincronizarPush, lerEstadoPush } = await carregar();
    await sincronizarPush(true);
    const [url] = c.fetch.mock.calls[0] as [string];
    expect(url).toBe(`/api/push/inscricao?endpoint=${encodeURIComponent(ENDPOINT)}`);
    expect(lerEstadoPush().inscrito).toBe(true);

    await sincronizarPush(false);
    expect(lerEstadoPush().inscrito).toBe(false);
  });

  it('sem inscrição no navegador: não chama a API', async () => {
    const c = montarNavegador({ permissao: 'granted' });
    const { sincronizarPush, lerEstadoPush } = await carregar();
    await sincronizarPush(true);
    expect(c.fetch).not.toHaveBeenCalled();
    expect(lerEstadoPush().inscrito).toBe(false);
  });
});
