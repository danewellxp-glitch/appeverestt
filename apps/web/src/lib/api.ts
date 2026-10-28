import { CODIGOS_ERRO, type CodigoErro } from '@everest/shared';
import { mensagemDoErro } from './erros';

/** Erro vindo da API (sempre { codigo, mensagem }) ou de rede. */
export class ApiError extends Error {
  readonly codigo: CodigoErro | 'REDE';
  readonly status: number;
  readonly campos: Record<string, string>;

  constructor(codigo: CodigoErro | 'REDE', mensagem: string, status: number, campos: Record<string, string> = {}) {
    super(mensagem);
    this.name = 'ApiError';
    this.codigo = codigo;
    this.status = status;
    this.campos = campos;
  }
}

export function ehApiError(e: unknown, codigo?: CodigoErro | 'REDE'): e is ApiError {
  return e instanceof ApiError && (codigo === undefined || e.codigo === codigo);
}

type OuvinteNaoAutenticado = () => void;
let aoNaoAutenticado: OuvinteNaoAutenticado | null = null;

/** Chamado em qualquer 401 (exceto /auth/me e login), para limpar o estado de auth. */
export function definirAoNaoAutenticado(fn: OuvinteNaoAutenticado): void {
  aoNaoAutenticado = fn;
}

function lerCorpoErro(corpo: unknown): { codigo: CodigoErro; mensagem: string; campos: Record<string, string> } | null {
  if (typeof corpo !== 'object' || corpo === null) return null;
  const o = corpo as Record<string, unknown>;
  if (typeof o.codigo !== 'string' || !(CODIGOS_ERRO as readonly string[]).includes(o.codigo)) return null;
  const codigo = o.codigo as CodigoErro;
  const campos: Record<string, string> = {};
  if (typeof o.campos === 'object' && o.campos !== null) {
    for (const [k, v] of Object.entries(o.campos as Record<string, unknown>)) {
      if (typeof v === 'string') campos[k] = v;
    }
  }
  return { codigo, mensagem: typeof o.mensagem === 'string' ? o.mensagem : mensagemDoErro(codigo), campos };
}

export interface OpcoesApi {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  /** Não disparar o "deslogar" global num 401 (ex.: /auth/me, /auth/login). */
  silenciar401?: boolean;
}

/** Cliente HTTP: base `/api`, cookies incluídos, erros como ApiError. */
export async function api<T>(caminho: string, opcoes: OpcoesApi = {}): Promise<T> {
  const { method = 'GET', body, signal, silenciar401 = false } = opcoes;
  let res: Response;
  try {
    res = await fetch(`/api${caminho}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? { Accept: 'application/json' } : { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new ApiError('REDE', 'Sem conexão com o servidor. Verifique sua internet.', 0);
  }

  const texto = await res.text();
  let corpo: unknown = null;
  if (texto) {
    try {
      corpo = JSON.parse(texto) as unknown;
    } catch {
      corpo = null;
    }
  }

  if (!res.ok) {
    const erro = lerCorpoErro(corpo);
    const codigo: CodigoErro = erro?.codigo ?? (res.status === 401 ? 'NAO_AUTENTICADO' : 'ERRO_INTERNO');
    if (res.status === 401 && !silenciar401) aoNaoAutenticado?.();
    throw new ApiError(codigo, erro ? mensagemDoErro(codigo, erro.mensagem) : mensagemDoErro(codigo), res.status, erro?.campos);
  }
  return corpo as T;
}
