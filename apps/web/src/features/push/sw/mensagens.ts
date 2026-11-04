import type { AcaoRapida, PayloadPush } from '@everest/shared';

/**
 * Regras puras do service worker do push (R22): o que mostrar quando chega um push e o que fazer
 * no toque. Sem APIs de worker aqui, para testar no Vitest; `src/sw.ts` só liga os eventos.
 *
 * Só TIPOS de `@everest/shared`: o bundle do shared é um arquivo único e importar qualquer valor
 * dele arrasta o zod para dentro do sw.js (~110 kB). As duas regras abaixo espelham
 * `ACOES_RAPIDAS`/`urlDaAcaoRapida`; o mensagens.test.ts confere que continuam iguais.
 */

/** Espelho de `ACOES_RAPIDAS` (o `satisfies` + o teste pegam qualquer divergência). */
export const ACOES_DO_SW = ['agua', 'treino', 'leitura'] as const satisfies readonly AcaoRapida[];

function ehAcaoRapida(valor: string): valor is AcaoRapida {
  return (ACOES_DO_SW as readonly string[]).includes(valor);
}

/** Espelho de `urlDaAcaoRapida`. */
export function urlDaAcaoNoSw(acao: AcaoRapida): string {
  return `/hoje?acao=${acao}`;
}

export const ICONE_NOTIFICACAO = '/pwa-192x192.png';
/**
 * Selo da barra de status do Android: ele usa só o canal alfa, então precisa ser uma silhueta
 * transparente (os ícones do PWA têm fundo opaco e virariam um quadrado branco).
 */
export const SELO_NOTIFICACAO = '/marca/icone.png';
/** Para onde vai um toque sem destino válido. */
export const URL_PADRAO = '/desafio';
/** Depois de registrar pelo botão, o toque na confirmação abre o dia de hoje. */
export const URL_CONFIRMACAO = '/hoje';

/** O que guardamos em `notification.data` (volta no `notificationclick`). */
export interface DadosNotificacao {
  url: string;
  acao?: AcaoRapida;
}

/** `NotificationOptions` com os campos que o lib.dom ainda não tipa (actions, renotify). */
export interface OpcoesNotificacao {
  body: string;
  icon: string;
  badge: string;
  tag: string;
  renotify: boolean;
  data: DadosNotificacao;
  lang: string;
  actions?: { action: string; title: string }[];
}

/** Só caminhos internos ("/algo"), nunca "//host" ou "/\host" (o navegador trataria como outro domínio). */
export function caminhoSeguro(url: unknown): string {
  if (typeof url !== 'string' || !url.startsWith('/')) return URL_PADRAO;
  if (url.startsWith('//') || url.startsWith('/\\')) return URL_PADRAO;
  return url;
}

function texto(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

/** Push sem dados legíveis: o Chrome exige mostrar algo (`userVisibleOnly`), então vai um aviso genérico. */
export const PAYLOAD_PADRAO: PayloadPush = {
  titulo: 'Everest Desafio',
  corpo: 'Tem novidade no seu desafio.',
  url: URL_PADRAO,
  tag: 'everest',
};

/** Lê o JSON do push (`event.data.json()`) com tolerância: campos ruins viram o padrão. */
export function lerPayload(dados: unknown): PayloadPush {
  if (typeof dados !== 'object' || dados === null) return PAYLOAD_PADRAO;
  const o = dados as Record<string, unknown>;
  const titulo = texto(o.titulo, 120);
  const corpo = texto(o.corpo, 300);
  if (!titulo || !corpo) return PAYLOAD_PADRAO;
  const acao = typeof o.acao === 'string' && ehAcaoRapida(o.acao) ? o.acao : undefined;
  const botao = texto(o.botao, 40) ?? undefined;
  return {
    titulo,
    corpo,
    url: caminhoSeguro(o.url),
    tag: texto(o.tag, 64) ?? PAYLOAD_PADRAO.tag,
    ...(acao ? { acao } : {}),
    ...(acao && botao ? { botao } : {}),
  };
}

/**
 * Opções do `showNotification`. Com `acao` (e rótulo), o Android mostra um botão que registra o
 * hábito sem abrir o app; o iPhone ignora `actions` e o toque abre a `url`.
 * `renotify`: um lembrete novo com a mesma tag vibra de novo em vez de trocar em silêncio.
 */
export function opcoesDaNotificacao(payload: PayloadPush): OpcoesNotificacao {
  const data: DadosNotificacao = { url: caminhoSeguro(payload.url), ...(payload.acao ? { acao: payload.acao } : {}) };
  return {
    body: payload.corpo,
    icon: ICONE_NOTIFICACAO,
    badge: SELO_NOTIFICACAO,
    tag: payload.tag,
    renotify: true,
    lang: 'pt-BR',
    data,
    ...(payload.acao && payload.botao ? { actions: [{ action: payload.acao, title: payload.botao }] } : {}),
  };
}

/** Confirmação depois do botão de ação: mesma tag (substitui o lembrete), sem botão. */
export function opcoesDaConfirmacao(mensagem: string, tag: string): OpcoesNotificacao {
  return {
    body: mensagem,
    icon: ICONE_NOTIFICACAO,
    badge: SELO_NOTIFICACAO,
    tag,
    renotify: false,
    lang: 'pt-BR',
    data: { url: URL_CONFIRMACAO },
  };
}

export const TITULO_CONFIRMACAO = 'Registrado ✅';

export type DestinoClique =
  /** Botão de ação: `POST /api/acoes-rapidas`; se falhar (ou sem sessão), abre `seFalhar`. */
  | { tipo: 'acao'; acao: AcaoRapida; seFalhar: string }
  /** Toque no corpo: foca uma janela do app e navega, ou abre uma nova. */
  | { tipo: 'abrir'; url: string };

/** O que fazer no `notificationclick` (`event.action` vazio = toque no corpo). */
export function destinoDoClique(evento: { action?: string; data?: unknown }): DestinoClique {
  const dados = typeof evento.data === 'object' && evento.data !== null ? (evento.data as Record<string, unknown>) : {};
  const url = caminhoSeguro(dados.url);
  if (evento.action && ehAcaoRapida(evento.action)) {
    return { tipo: 'acao', acao: evento.action, seFalhar: urlDaAcaoNoSw(evento.action) };
  }
  return { tipo: 'abrir', url };
}

/** Texto da confirmação a partir da resposta do `POST /acoes-rapidas` (null = resposta inesperada). */
export function mensagemDaResposta(corpo: unknown): string | null {
  if (typeof corpo !== 'object' || corpo === null) return null;
  const m = (corpo as Record<string, unknown>).mensagem;
  return typeof m === 'string' && m.trim() ? m : null;
}
