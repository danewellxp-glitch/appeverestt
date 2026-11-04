// HTTP do simulador: ritmo (todos os VUs saem do mesmo IP), timeout em todo fetch e retry com
// backoff em 429/5xx/falha de rede. As chamadas da API do app são idempotentes (o PUT do dia leva
// valores absolutos; inscrição, aviso de pagamento e confirmação de foto também), então repetir é seguro.

export const dormir = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Espaça as chamadas: no máximo uma a cada `intervaloMs` (o processo faz uma chamada por vez). */
export class Ritmo {
  private proximo = 0;

  constructor(readonly intervaloMs: number) {}

  static porMinuto(n: number): Ritmo {
    return new Ritmo(Math.ceil(60_000 / Math.max(1, n)));
  }

  async vez(): Promise<void> {
    const agora = Date.now();
    const espera = Math.max(0, this.proximo - agora);
    this.proximo = Math.max(agora, this.proximo) + this.intervaloMs;
    if (espera > 0) await dormir(espera);
  }
}

export class ErroHttp extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string | null,
    readonly detalhe: string,
    readonly rota: string,
  ) {
    super(
      `${rota} → ${status || 'rede'}${codigo ? ` ${codigo}` : ''}${detalhe ? `: ${detalhe}` : ''}`,
    );
    this.name = 'ErroHttp';
  }
}

/** Erros de domínio da API (ex.: PAGAMENTO_INDISPONIVEL é 503) não melhoram tentando de novo. */
const CODIGOS_TRANSITORIOS = new Set(['ERRO_INTERNO', 'MUITAS_REQUISICOES']);

export function deveRepetir(status: number, codigo: string | null): boolean {
  if (status !== 429 && status < 500) return false;
  return codigo === null || CODIGOS_TRANSITORIOS.has(codigo);
}

/** Retry-After em segundos ou data HTTP → ms (null se ausente/ inválido). Teto de 2 min. */
export function lerRetryAfter(valor: string | null, agora = Date.now()): number | null {
  if (!valor) return null;
  const s = Number(valor);
  const ms = Number.isFinite(s) ? s * 1000 : Date.parse(valor) - agora;
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.min(ms, 120_000);
}

/** 2s, 4s, 8s, 16s… (teto de 60s) + até 1s de variação. */
export function backoffMs(tentativa: number, variacao = Math.random()): number {
  return Math.min(60_000, 2_000 * 2 ** Math.max(0, tentativa - 1)) + Math.floor(variacao * 1_000);
}

/** Valor do cookie `nome` nos Set-Cookie da resposta. */
export function cookieDaResposta(setCookies: readonly string[], nome: string): string | null {
  for (const linha of setCookies) {
    const [par] = linha.split(';');
    const i = par?.indexOf('=') ?? -1;
    if (i > 0 && par!.slice(0, i).trim() === nome) {
      const valor = par!.slice(i + 1).trim();
      return valor.length > 0 ? valor : null;
    }
  }
  return null;
}

/** Expiração (ms desde 1970) de um JWT, lida sem verificar a assinatura. */
export function expiracaoJwt(token: string): number | null {
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(partes[1]!, 'base64url').toString('utf8')) as {
      exp?: unknown;
    };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export interface Requisicao {
  metodo: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  /** Rótulo curto para logs (ex.: "PUT dias/2"). */
  rota: string;
  headers?: Record<string, string>;
  corpo?: string | Buffer;
  ritmos?: readonly Ritmo[];
  timeoutMs?: number;
  tentativas?: number;
}

export interface Resposta {
  status: number;
  headers: Headers;
  texto: string;
}

export interface Contador {
  requisicoes: number;
  repeticoes: number;
}

function codigoDoCorpo(texto: string): string | null {
  try {
    const o = JSON.parse(texto) as { codigo?: unknown };
    return typeof o.codigo === 'string' ? o.codigo : null;
  } catch {
    return null;
  }
}

function mensagemDoCorpo(texto: string): string {
  try {
    const o = JSON.parse(texto) as { mensagem?: unknown };
    if (typeof o.mensagem === 'string') return o.mensagem;
  } catch {
    // não é JSON (ex.: página de erro do proxy)
  }
  return texto.replace(/\s+/g, ' ').trim().slice(0, 140);
}

/**
 * fetch com ritmo, timeout e retry. Devolve a resposta final (2xx ou erro não transitório);
 * lança ErroHttp só quando as tentativas acabam em erro transitório ou falha de rede.
 */
export async function requisitar(
  r: Requisicao,
  contador?: Contador,
  esperar: (ms: number) => Promise<void> = dormir,
): Promise<Resposta> {
  const tentativas = r.tentativas ?? 4;
  for (let tentativa = 1; ; tentativa++) {
    for (const ritmo of r.ritmos ?? []) await ritmo.vez();
    if (contador) {
      contador.requisicoes++;
      if (tentativa > 1) contador.repeticoes++;
    }
    let status: number;
    let headers: Headers;
    let texto: string;
    try {
      const res = await fetch(r.url, {
        method: r.metodo,
        headers: r.headers,
        body: r.corpo,
        redirect: 'manual',
        signal: AbortSignal.timeout(r.timeoutMs ?? 20_000),
      });
      status = res.status;
      headers = res.headers;
      texto = await res.text();
    } catch (e) {
      const motivo =
        e instanceof Error ? (e.name === 'TimeoutError' ? 'tempo esgotado' : e.message) : String(e);
      if (tentativa >= tentativas) throw new ErroHttp(0, null, motivo, r.rota);
      await esperar(backoffMs(tentativa));
      continue;
    }
    const codigo = codigoDoCorpo(texto);
    if (deveRepetir(status, codigo)) {
      if (tentativa >= tentativas)
        throw new ErroHttp(status, codigo, mensagemDoCorpo(texto), r.rota);
      const espera = Math.max(lerRetryAfter(headers.get('retry-after')) ?? 0, backoffMs(tentativa));
      await esperar(espera);
      continue;
    }
    return { status, headers, texto };
  }
}

/** Converte uma resposta não-2xx em ErroHttp (com o `codigo` da API quando houver). */
export function erroDaResposta(res: Resposta, rota: string): ErroHttp {
  return new ErroHttp(res.status, codigoDoCorpo(res.texto), mensagemDoCorpo(res.texto), rota);
}

export function ok(res: Resposta): boolean {
  return res.status >= 200 && res.status < 300;
}
