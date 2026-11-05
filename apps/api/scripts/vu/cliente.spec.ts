import type { Redis } from 'ioredis';
import { ClienteVu, type RecursosCliente, estadoDoDetalhe } from './cliente';
import { lerConfig } from './config';
import type { FirebaseVu } from './firebase';
import { Ritmo } from './http';

function jwt(expS: number): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: 'u1', papel: 'USUARIO', v: 0, exp: expS }),
  ).toString('base64url');
  return `cab.${payload}.ass`;
}

interface Chamada {
  metodo: string;
  url: string;
  headers: Record<string, string>;
  corpo: unknown;
}

function resposta(status: number, corpo: unknown, setCookie?: string): Response {
  const headers = new Headers();
  if (setCookie) headers.append('set-cookie', setCookie);
  const texto = corpo === undefined ? '' : JSON.stringify(corpo);
  return { status, headers, text: () => Promise.resolve(texto) } as unknown as Response;
}

const DIA = {
  numeroDia: 1,
  data: '2026-10-30',
  aguaMl: 500,
  exercicio: false,
  paginasLidas: 0,
  storyPostado: false,
  concluido: false,
  invalidado: false,
  motivoInvalidacao: null,
  editavel: true,
  requisitosPendentes: [],
  fotos: [
    { id: 'a', tipo: 'AGUA', status: 'CONFIRMADA', thumbUrl: null, url: null, visivelTurma: true },
    { id: 'b', tipo: 'LEITURA', status: 'PENDENTE', thumbUrl: null, url: null, visivelTurma: true },
  ],
};

function montar(rotas: (c: Chamada) => Response) {
  const redisDados = new Map<string, string>();
  const redis = {
    get: (k: string) => Promise.resolve(redisDados.get(k) ?? null),
    set: (k: string, v: string) => {
      redisDados.set(k, v);
      return Promise.resolve('OK');
    },
    del: (k: string) => Promise.resolve(redisDados.delete(k) ? 1 : 0),
  } as unknown as Redis;
  const firebase = {
    uidDoEmail: jest.fn().mockResolvedValue('uid-07'),
    garantirUsuario: jest.fn(),
    idTokenNovo: jest.fn().mockResolvedValue('id-token-novo'),
  } as unknown as FirebaseVu;
  const chamadas: Chamada[] = [];
  jest.spyOn(globalThis, 'fetch').mockImplementation((url, init) => {
    const c: Chamada = {
      metodo: init?.method ?? 'GET',
      url: String(url),
      headers: (init?.headers ?? {}) as Record<string, string>,
      corpo: typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body,
    };
    chamadas.push(c);
    return Promise.resolve(rotas(c));
  });
  const recursos: RecursosCliente = {
    config: lerConfig({ VU_BASE_URL: 'https://app.teste', VU_FIREBASE_API_KEY: 'chave' }),
    redis,
    firebase,
    ritmoApi: new Ritmo(0),
    ritmoSessao: new Ritmo(0),
    ritmoUpload: new Ritmo(0),
    contador: { requisicoes: 0, repeticoes: 0, logins: 0 },
  };
  const cliente = new ClienteVu(recursos, {
    numero: 7,
    email: 'vu-07@vu.everestt.app.br',
    nome: 'VU 07 Ana Souza',
  });
  return { cliente, chamadas, redisDados, recursos };
}

describe('ClienteVu', () => {
  afterEach(() => jest.restoreAllMocks());
  const daquiA30Dias = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;

  it('loga pelo /api/auth/sessao, guarda o cookie no Redis e o reaproveita', async () => {
    const token = jwt(daquiA30Dias);
    const { cliente, chamadas, redisDados, recursos } = montar((c) => {
      if (c.url.endsWith('/api/auth/sessao')) {
        return resposta(
          200,
          { usuario: { id: 'u1' } },
          `everest_sessao=${token}; Path=/; HttpOnly`,
        );
      }
      return resposta(200, DIA);
    });
    await cliente.dia('teste-vu', 1);
    expect(chamadas.map((c) => `${c.metodo} ${c.url}`)).toEqual([
      'POST https://app.teste/api/auth/sessao',
      'GET https://app.teste/api/desafios/teste-vu/dias/1',
    ]);
    expect(chamadas[0]!.corpo).toEqual({ idToken: 'id-token-novo' });
    expect(chamadas[1]!.headers.Cookie).toBe(`everest_sessao=${token}`);
    expect(chamadas[1]!.headers.Origin).toBeUndefined();
    expect(redisDados.get('everest-vu:sessao:vu-07@vu.everestt.app.br')).toBe(token);
    expect(recursos.contador.logins).toBe(1);

    // Outro processo (outra rodada) reaproveita a sessão guardada, sem novo login.
    const outro = new ClienteVu(recursos, cliente.vu);
    await outro.dia('teste-vu', 1);
    expect(chamadas.filter((c) => c.url.endsWith('/auth/sessao'))).toHaveLength(1);
  });

  it('em 401 faz login de novo e repete a chamada uma vez', async () => {
    const velho = jwt(daquiA30Dias);
    const novo = jwt(daquiA30Dias + 10);
    const { cliente, chamadas, redisDados } = montar((c) => {
      if (c.url.endsWith('/api/auth/sessao'))
        return resposta(200, {}, `everest_sessao=${novo}; Path=/`);
      return c.headers.Cookie === `everest_sessao=${velho}`
        ? resposta(401, { codigo: 'NAO_AUTENTICADO', mensagem: 'Sua sessão expirou.' })
        : resposta(200, DIA);
    });
    redisDados.set('everest-vu:sessao:vu-07@vu.everestt.app.br', velho);
    const d = await cliente.dia('teste-vu', 1);
    expect(d.numeroDia).toBe(1);
    expect(chamadas.map((c) => c.metodo)).toEqual(['GET', 'POST', 'GET']);
    expect(redisDados.get('everest-vu:sessao:vu-07@vu.everestt.app.br')).toBe(novo);
  });

  it('envia a foto pelo fluxo real: upload-url → PUT no storage → confirmar', async () => {
    const token = jwt(daquiA30Dias);
    const { cliente, chamadas, redisDados } = montar((c) => {
      if (c.url.endsWith('/fotos/upload-url')) {
        return resposta(200, {
          fotoId: 'f1',
          uploadUrl: 'https://arquivos.teste/everest-provas/x.jpg?X-Amz-Signature=abc',
          headers: { 'Content-Type': 'image/jpeg' },
        });
      }
      if (c.url.startsWith('https://arquivos.teste/')) return resposta(200, undefined);
      if (c.url.endsWith('/fotos/f1/confirmar'))
        return resposta(200, { fotoId: 'f1', status: 'ENVIADA' });
      return resposta(404, { codigo: 'NAO_ENCONTRADO', mensagem: '?' });
    });
    redisDados.set('everest-vu:sessao:vu-07@vu.everestt.app.br', token);
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const r = await cliente.enviarFoto('teste-vu', 3, 'AGUA', jpeg);
    expect(r).toEqual({ fotoId: 'f1', status: 'ENVIADA' });
    expect(chamadas.map((c) => `${c.metodo} ${c.url.split('?')[0]}`)).toEqual([
      'POST https://app.teste/api/desafios/teste-vu/dias/3/fotos/upload-url',
      'PUT https://arquivos.teste/everest-provas/x.jpg',
      'POST https://app.teste/api/desafios/teste-vu/dias/3/fotos/f1/confirmar',
    ]);
    expect(chamadas[0]!.corpo).toEqual({ tipo: 'AGUA', mimeType: 'image/jpeg', tamanhoBytes: 4 });
    expect(chamadas[1]!.headers['Content-Type']).toBe('image/jpeg');
    expect(chamadas[1]!.headers.Cookie).toBeUndefined();
    expect(chamadas[1]!.corpo).toBe(jpeg);
  });

  it('erro da API vira ErroHttp com o código', async () => {
    const token = jwt(daquiA30Dias);
    const { cliente, redisDados } = montar(() =>
      resposta(409, { codigo: 'DIA_NAO_EDITAVEL', mensagem: 'Só o dia de hoje pode ser editado.' }),
    );
    redisDados.set('everest-vu:sessao:vu-07@vu.everestt.app.br', token);
    await expect(
      cliente.salvarDia('teste-vu', 2, {
        aguaMl: 0,
        exercicio: true,
        paginasLidas: 0,
        storyPostado: false,
      }),
    ).rejects.toMatchObject({ status: 409, codigo: 'DIA_NAO_EDITAVEL' });
  });

  it('estado do dia: só fotos ENVIADA/CONFIRMADA contam como enviadas', () => {
    expect(estadoDoDetalhe(DIA as Parameters<typeof estadoDoDetalhe>[0])).toEqual({
      aguaMl: 500,
      exercicio: false,
      paginasLidas: 0,
      storyPostado: false,
      fotosEnviadas: ['AGUA'],
    });
  });
});
