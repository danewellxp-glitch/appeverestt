import type { PayloadPush } from '@everest/shared';
import type { PushSubscription, SendResult } from 'web-push';
import type { ClienteWebPush } from '../src/modules/push/push.constantes';

/** web-push falso: guarda o que seria enviado e responde o status configurado por endpoint. */
export class WebPushFalso implements ClienteWebPush {
  envios: { endpoint: string; payload: PayloadPush }[] = [];
  status = new Map<string, number>();

  sendNotification(inscricao: PushSubscription, payload: string): Promise<SendResult> {
    this.envios.push({ endpoint: inscricao.endpoint, payload: JSON.parse(payload) as PayloadPush });
    const status = this.status.get(inscricao.endpoint) ?? 201;
    if (status >= 400) return Promise.reject(Object.assign(new Error(`push ${status}`), { statusCode: status }));
    return Promise.resolve({ statusCode: status, body: '', headers: {} });
  }

  limpar(): void {
    this.envios = [];
    this.status.clear();
  }
}

let contadorEndpoint = 0;
/** Corpo válido do PUT /push/inscricao (endpoint único a cada chamada). */
export function inscricao(extra: { endpoint?: string } = {}) {
  contadorEndpoint += 1;
  return {
    endpoint: extra.endpoint ?? `https://fcm.googleapis.com/fcm/send/teste-${Date.now()}-${contadorEndpoint}`,
    chaves: { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', auth: 'tBHItJI5svbpez7KI4CCXg' },
    userAgent: 'Mozilla/5.0 (Linux; Android 14) teste',
  };
}
