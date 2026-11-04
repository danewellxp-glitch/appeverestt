import {
  ErroHttp,
  Ritmo,
  backoffMs,
  cookieDaResposta,
  deveRepetir,
  expiracaoJwt,
  lerRetryAfter,
  requisitar,
} from './http';

const semEspera = (): Promise<void> => Promise.resolve();

function resposta(status: number, corpo: unknown, headers: Record<string, string> = {}): Response {
  return new Response(typeof corpo === 'string' ? corpo : JSON.stringify(corpo), {
    status,
    headers,
  });
}

describe('http do simulador', () => {
  afterEach(() => jest.restoreAllMocks());

  it('lê o cookie de sessão do Set-Cookie', () => {
    const linhas = [
      'outro=1; Path=/',
      'everest_sessao=abc.def.ghi; Path=/; HttpOnly; SameSite=Lax; Secure',
    ];
    expect(cookieDaResposta(linhas, 'everest_sessao')).toBe('abc.def.ghi');
    expect(cookieDaResposta(['everest_sessao=; Max-Age=0'], 'everest_sessao')).toBeNull();
    expect(cookieDaResposta([], 'everest_sessao')).toBeNull();
  });

  it('lê a expiração do JWT sem verificar a assinatura', () => {
    const payload = Buffer.from(JSON.stringify({ sub: 'u1', exp: 1_900_000_000 })).toString(
      'base64url',
    );
    expect(expiracaoJwt(`xx.${payload}.yy`)).toBe(1_900_000_000_000);
    expect(expiracaoJwt('lixo')).toBeNull();
  });

  it('só repete 429/5xx transitórios (erro de domínio não melhora tentando de novo)', () => {
    expect(deveRepetir(429, 'MUITAS_REQUISICOES')).toBe(true);
    expect(deveRepetir(502, null)).toBe(true);
    expect(deveRepetir(500, 'ERRO_INTERNO')).toBe(true);
    expect(deveRepetir(503, 'PAGAMENTO_INDISPONIVEL')).toBe(false);
    expect(deveRepetir(409, 'DIA_NAO_EDITAVEL')).toBe(false);
    expect(deveRepetir(401, null)).toBe(false);
  });

  it('Retry-After e backoff', () => {
    expect(lerRetryAfter('7')).toBe(7_000);
    expect(lerRetryAfter('9999')).toBe(120_000);
    expect(lerRetryAfter(null)).toBeNull();
    expect(
      lerRetryAfter('Wed, 21 Oct 2015 07:28:10 GMT', Date.parse('Wed, 21 Oct 2015 07:28:00 GMT')),
    ).toBe(10_000);
    expect(backoffMs(1, 0)).toBe(2_000);
    expect(backoffMs(3, 0)).toBe(8_000);
    expect(backoffMs(20, 0)).toBe(60_000);
  });

  it('Ritmo espaça as chamadas', async () => {
    const r = new Ritmo(40);
    const inicio = Date.now();
    await r.vez();
    await r.vez();
    await r.vez();
    expect(Date.now() - inicio).toBeGreaterThanOrEqual(75);
  });

  it('repete em 503 e devolve a resposta boa', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(resposta(503, '<html>bad gateway</html>'))
      .mockResolvedValueOnce(
        resposta(429, { codigo: 'MUITAS_REQUISICOES', mensagem: 'calma' }, { 'retry-after': '1' }),
      )
      .mockResolvedValueOnce(resposta(200, { ok: true }));
    const contador = { requisicoes: 0, repeticoes: 0 };
    const r = await requisitar(
      { metodo: 'GET', url: 'http://x/api/a', rota: 'GET a' },
      contador,
      semEspera,
    );
    expect(r.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(contador).toEqual({ requisicoes: 3, repeticoes: 2 });
  });

  it('não repete erro de domínio e desiste depois das tentativas', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(resposta(409, { codigo: 'DIA_NAO_EDITAVEL', mensagem: 'não' }));
    const r = await requisitar(
      { metodo: 'PUT', url: 'http://x/api/b', rota: 'PUT b' },
      undefined,
      semEspera,
    );
    expect(r.status).toBe(409);

    jest.restoreAllMocks();
    const falha = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'));
    await expect(
      requisitar(
        { metodo: 'GET', url: 'http://x/api/c', rota: 'GET c', tentativas: 3 },
        undefined,
        semEspera,
      ),
    ).rejects.toBeInstanceOf(ErroHttp);
    expect(falha).toHaveBeenCalledTimes(3);
  });
});
