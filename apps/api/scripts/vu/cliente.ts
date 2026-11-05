// Cliente da API PÚBLICA do app, do ponto de vista de um VU (o mesmo caminho do navegador:
// cookie de sessão, rotas /api/..., upload direto no storage com URL assinada).
import type {
  AtualizarPerfilInput,
  ConfirmarFotoResposta,
  DiaDetalhe,
  InscricaoResposta,
  MeResposta,
  PagamentoResposta,
  TipoFoto,
  UploadUrlResposta,
} from '@everest/shared';
import type { Redis } from 'ioredis';
import { COOKIE_SESSAO } from '../../src/modules/auth/sessao';
import { type ConfigVu, chaveSessao, rotuloVu } from './config';
import type { FirebaseVu } from './firebase';
import {
  type Contador,
  type ErroHttp,
  type Requisicao,
  type Ritmo,
  cookieDaResposta,
  erroDaResposta,
  expiracaoJwt,
  ok,
  requisitar,
} from './http';
import type { EstadoDia } from './personas';

const DIA_MS = 24 * 60 * 60 * 1000;
const USER_AGENT = 'everest-vu/1.0 (simulador de testes do Everest)';

export interface ContadorVu extends Contador {
  logins: number;
}

/** O que o cliente precisa do contexto (Redis guarda as sessões entre processos). */
export interface RecursosCliente {
  config: ConfigVu;
  redis: Redis;
  firebase: FirebaseVu;
  /** Teto geral de req/min à API. */
  ritmoApi: Ritmo;
  /** POST /auth/sessao: a API aceita 10/min por IP. */
  ritmoSessao: Ritmo;
  /** POST .../upload-url: a API aceita 30/min por IP. */
  ritmoUpload: Ritmo;
  contador: ContadorVu;
}

export interface IdentidadeVu {
  numero: number;
  email: string;
  nome: string;
}

export type Navegacao = 'meu-progresso' | 'ranking' | 'feed';

/** Uma resposta final da API (depois dos retries), para medir latência. */
export interface Medicao {
  rota: string;
  status: number;
  ms: number;
}

/** Resultado de `chamar`: `dados` só em 2xx; `erro` (com o `codigo` da API) nos demais. */
export interface RespostaApi<T> {
  status: number;
  codigo: string | null;
  ms: number;
  dados: T | null;
  erro: ErroHttp | null;
}

/** Converte o GET/PUT do dia no estado usado pelas personas. */
export function estadoDoDetalhe(d: DiaDetalhe): EstadoDia {
  return {
    aguaMl: d.aguaMl,
    exercicio: d.exercicio,
    paginasLidas: d.paginasLidas,
    storyPostado: d.storyPostado,
    fotosEnviadas: d.fotos
      .filter((f) => f.status === 'ENVIADA' || f.status === 'CONFIRMADA')
      .map((f) => f.tipo),
  };
}

export class ClienteVu {
  private cookie: string | null = null;

  constructor(
    private readonly r: RecursosCliente,
    readonly vu: IdentidadeVu,
  ) {}

  get rotulo(): string {
    return `VU ${rotuloVu(this.vu.numero)}`;
  }

  private url(caminho: string): string {
    return `${this.r.config.baseUrl}/api/${caminho}`;
  }

  /**
   * Usa a sessão guardada no Redis enquanto o JWT tiver mais de 1 dia de validade; senão faz login.
   * Devolve o /me quando acabou de logar (null se reaproveitou a sessão).
   */
  async garantirSessao(): Promise<MeResposta | null> {
    if (this.cookie) return null;
    const salvo = await this.r.redis.get(chaveSessao(this.vu.email)).catch(() => null);
    if (salvo && (expiracaoJwt(salvo) ?? 0) > Date.now() + DIA_MS) {
      this.cookie = salvo;
      return null;
    }
    return this.login();
  }

  private async esquecerSessao(): Promise<void> {
    this.cookie = null;
    await this.r.redis.del(chaveSessao(this.vu.email)).catch(() => undefined);
  }

  /** Login como no app: Firebase (idToken recente) → POST /api/auth/sessao → cookie httpOnly. */
  async login(): Promise<MeResposta> {
    const fb = this.r.firebase;
    const uid =
      (await fb.uidDoEmail(this.vu.email)) ??
      (await fb.garantirUsuario(this.vu.email, this.vu.nome));
    const idToken = await fb.idTokenNovo(uid);
    const rota = 'POST auth/sessao';
    const res = await requisitar(
      {
        metodo: 'POST',
        url: this.url('auth/sessao'),
        rota,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': USER_AGENT,
        },
        corpo: JSON.stringify({ idToken }),
        ritmos: [this.r.ritmoSessao, this.r.ritmoApi],
      },
      this.r.contador,
    );
    if (!ok(res)) throw erroDaResposta(res, rota);
    const token = cookieDaResposta(res.headers.getSetCookie(), COOKIE_SESSAO);
    if (!token) throw new Error(`${rota}: a API não devolveu o cookie ${COOKIE_SESSAO}.`);
    this.cookie = token;
    this.r.contador.logins++;
    const exp = expiracaoJwt(token);
    const ttlS = exp ? Math.floor((exp - Date.now() - DIA_MS) / 1000) : 7 * 24 * 60 * 60;
    if (ttlS > 60)
      await this.r.redis.set(chaveSessao(this.vu.email), token, 'EX', ttlS).catch(() => undefined);
    return JSON.parse(res.texto) as MeResposta;
  }

  /** Quem quiser medir as chamadas (ex.: o smoke da turma) recebe cada resposta final aqui. */
  observar: ((m: Medicao) => void) | null = null;

  /**
   * Chamada autenticada à API que NÃO lança em resposta não-2xx (devolve status e `codigo`);
   * em 401 refaz o login uma vez. Falha de rede/esgotar as tentativas ainda lança ErroHttp.
   */
  async chamar<T>(
    metodo: Requisicao['metodo'],
    caminho: string,
    rota: string,
    corpo?: unknown,
    ritmosExtras: readonly Ritmo[] = [],
  ): Promise<RespostaApi<T>> {
    await this.garantirSessao();
    for (let tentativa = 0; ; tentativa++) {
      const res = await requisitar(
        {
          metodo,
          url: this.url(caminho),
          rota,
          headers: {
            Accept: 'application/json',
            'User-Agent': USER_AGENT,
            Cookie: `${COOKIE_SESSAO}=${this.cookie ?? ''}`,
            ...(corpo === undefined ? {} : { 'Content-Type': 'application/json' }),
          },
          corpo: corpo === undefined ? undefined : JSON.stringify(corpo),
          ritmos: [...ritmosExtras, this.r.ritmoApi],
        },
        this.r.contador,
      );
      if (res.status === 401 && tentativa === 0) {
        await this.esquecerSessao();
        await this.login();
        continue;
      }
      this.observar?.({ rota, status: res.status, ms: res.ms });
      if (!ok(res)) {
        const erro = erroDaResposta(res, rota);
        return { status: res.status, codigo: erro.codigo, ms: res.ms, dados: null, erro };
      }
      const dados = (res.texto ? JSON.parse(res.texto) : null) as T;
      return { status: res.status, codigo: null, ms: res.ms, dados, erro: null };
    }
  }

  /** Chamada autenticada à API; lança ErroHttp em resposta não-2xx. */
  private async api<T>(
    metodo: Requisicao['metodo'],
    caminho: string,
    rota: string,
    corpo?: unknown,
    ritmosExtras: readonly Ritmo[] = [],
  ): Promise<T> {
    const r = await this.chamar<T>(metodo, caminho, rota, corpo, ritmosExtras);
    if (r.erro) throw r.erro;
    return r.dados as T;
  }

  me(): Promise<MeResposta> {
    return this.api('GET', 'auth/me', 'GET auth/me');
  }

  atualizarPerfil(perfil: AtualizarPerfilInput): Promise<MeResposta> {
    return this.api('PATCH', 'me', 'PATCH me', perfil);
  }

  inscrever(slug: string): Promise<InscricaoResposta> {
    return this.api('POST', `desafios/${slug}/inscricao`, 'POST inscricao');
  }

  informarPagamento(slug: string): Promise<PagamentoResposta> {
    return this.api('POST', `desafios/${slug}/pagamento/informar`, 'POST pagamento/informar');
  }

  dia(slug: string, n: number): Promise<DiaDetalhe> {
    return this.api('GET', `desafios/${slug}/dias/${n}`, `GET dias/${n}`);
  }

  salvarDia(
    slug: string,
    n: number,
    dados: { aguaMl: number; exercicio: boolean; paginasLidas: number; storyPostado: boolean },
  ): Promise<DiaDetalhe> {
    return this.api('PUT', `desafios/${slug}/dias/${n}`, `PUT dias/${n}`, dados);
  }

  navegar(slug: string, onde: Navegacao): Promise<unknown> {
    return this.api('GET', `desafios/${slug}/${onde}`, `GET ${onde}`);
  }

  /** Fluxo real do app: pede a URL assinada → PUT no storage → confirma. */
  async enviarFoto(
    slug: string,
    n: number,
    tipo: TipoFoto,
    jpeg: Buffer,
  ): Promise<ConfirmarFotoResposta> {
    const base = `desafios/${slug}/dias/${n}/fotos`;
    const pedido = await this.api<UploadUrlResposta>(
      'POST',
      `${base}/upload-url`,
      `POST fotos/upload-url (${tipo})`,
      { tipo, mimeType: 'image/jpeg', tamanhoBytes: jpeg.length },
      [this.r.ritmoUpload],
    );
    const rotaPut = `PUT storage (${tipo})`;
    const envio = await requisitar(
      {
        metodo: 'PUT',
        url: pedido.uploadUrl,
        rota: rotaPut,
        headers: { ...pedido.headers, 'User-Agent': USER_AGENT },
        corpo: jpeg,
        timeoutMs: 60_000,
        tentativas: 3,
      },
      this.r.contador,
    );
    if (!ok(envio)) throw erroDaResposta(envio, rotaPut);
    return this.api('POST', `${base}/${pedido.fotoId}/confirmar`, `POST fotos/confirmar (${tipo})`);
  }
}
