import {
  LEMBRETES_PUSH,
  TIMEZONE_PADRAO,
  cronDoLembrete,
  type AcaoRapida,
} from '@everest/shared';
import type { PushSubscription, RequestOptions, SendResult } from 'web-push';

export const FILA_PUSH = 'push';
export const JOB_LEMBRETE = 'lembrete';
/** Prefixo dos ids dos agendamentos de lembrete na fila (ex.: `lembrete-agua-10`). */
export const PREFIXO_LEMBRETE = 'lembrete-';

/** Token do cliente web-push: nos testes entra um falso (nada sai para a internet). */
export const WEB_PUSH = Symbol('WEB_PUSH');

/** O pedaço da lib `web-push` que a API usa. */
export interface ClienteWebPush {
  sendNotification(inscricao: PushSubscription, payload: string, opcoes: RequestOptions): Promise<SendResult>;
}

export interface DadosLembrete {
  acao: AcaoRapida;
}

/** Envios ao mesmo tempo num disparo. */
export const CONCORRENCIA_ENVIO = 10;
/** Se o aparelho estiver desligado, o serviço de push guarda a notificação por até 1 hora. */
export const TTL_PUSH_S = 60 * 60;
/** Erros seguidos (fora 404/410) até a inscrição ser apagada. */
export const MAX_FALHAS_PUSH = 5;

export interface AgendamentoLembrete {
  /** Id estável do agendamento na fila (upsert). */
  id: string;
  acao: AcaoRapida;
  pattern: string;
  tz: string;
}

/** Um agendamento por horário de LEMBRETES_PUSH, no fuso do desafio ativo (ou o padrão). */
export function agendamentosDosLembretes(timezone: string | null | undefined): AgendamentoLembrete[] {
  const tz = timezone || TIMEZONE_PADRAO;
  return LEMBRETES_PUSH.flatMap(({ acao, horas }) =>
    horas.map((hora) => ({ id: `${PREFIXO_LEMBRETE}${acao}-${hora}`, acao, pattern: cronDoLembrete(hora), tz })),
  );
}
