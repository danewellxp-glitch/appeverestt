import { cadastroSchema, crc16Pix, gerarPixEstatico } from '@everest/shared';
import { validarEnv } from '../config/env';
import { montarPix } from '../modules/pagamento/pix.service';
import { chaveOriginal, chavesProcessadas } from '../modules/fotos/fotos.constantes';
import { opcoesRedis } from '../redis/conexao';
import { ErroApp } from './erros';
import { ZodValidationPipe } from './pipes/zod-validation.pipe';

const ENV_OK = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'x'.repeat(32),
  WEB_ORIGIN: 'http://localhost:5173, https://app.exemplo.com/',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_BUCKET: 'b',
  S3_ACCESS_KEY_ID: 'k',
  S3_SECRET_ACCESS_KEY: 's',
  FIREBASE_PROJECT_ID: 'demo-everest',
};

/** Payload de demonstração (nunca os dados reais do embaixador). */
const PIX_DEMO = gerarPixEstatico({
  chave: 'pix@exemplo.dev',
  nome: 'EVEREST DEMO',
  cidade: 'SAO PAULO',
  valor: 50,
  txid: 'EVERESTDEMO',
  descricao: 'DESAFIO 30 DIAS',
});

describe('validarEnv', () => {
  it('aceita env completo e aplica defaults', () => {
    const env = validarEnv(ENV_OK);
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.WEB_ORIGIN).toEqual(['http://localhost:5173', 'https://app.exemplo.com']);
    expect(env.PERMITIR_EDITAR_DIAS_ANTERIORES).toBe(false);
    expect(env.S3_FORCE_PATH_STYLE).toBe(false);
    expect(env.AUTH_SENHA_LEGADO).toBe(false);
    expect(env.FIREBASE_AUTH_EMULATOR_HOST).toBeUndefined();
  });

  it('produção exige a conta de serviço do Firebase e recusa o emulador', () => {
    const prod = { ...ENV_OK, NODE_ENV: 'production' };
    expect(() => validarEnv(prod)).toThrow(/FIREBASE_SERVICE_ACCOUNT_BASE64/);
    expect(() =>
      validarEnv({ ...prod, FIREBASE_SERVICE_ACCOUNT_BASE64: 'e30=', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' }),
    ).toThrow(/FIREBASE_AUTH_EMULATOR_HOST/);
    expect(
      validarEnv({ ...prod, FIREBASE_SERVICE_ACCOUNT_BASE64: 'e30=', PIX_COPIA_E_COLA: PIX_DEMO }).NODE_ENV,
    ).toBe('production');
  });

  it('PIX_COPIA_E_COLA: obrigatório em produção, opcional em dev, validado (CRC e valor) quando presente', () => {
    const prod = { ...ENV_OK, NODE_ENV: 'production', FIREBASE_SERVICE_ACCOUNT_BASE64: 'e30=' };
    expect(() => validarEnv(prod)).toThrow(/PIX_COPIA_E_COLA/);
    expect(validarEnv(ENV_OK).PIX_COPIA_E_COLA).toBeUndefined();
    expect(validarEnv({ ...ENV_OK, PIX_COPIA_E_COLA: '  ' }).PIX_COPIA_E_COLA).toBeUndefined();
    expect(validarEnv({ ...ENV_OK, PIX_COPIA_E_COLA: PIX_DEMO }).PIX_COPIA_E_COLA).toBe(PIX_DEMO);

    const crcErrado = PIX_DEMO.slice(0, -4) + (PIX_DEMO.endsWith('0000') ? '1111' : '0000');
    expect(() => validarEnv({ ...ENV_OK, PIX_COPIA_E_COLA: crcErrado })).toThrow(/PIX_COPIA_E_COLA.*CRC/);
    expect(() => validarEnv({ ...ENV_OK, PIX_COPIA_E_COLA: 'nao-e-pix' })).toThrow(/PIX_COPIA_E_COLA/);

    // Sem a tag 54 (valor): BR Code válido, mas a inscrição precisa de valor.
    const semValorCorpo = PIX_DEMO.slice(0, -4).replace('540550.00', '');
    const semValor = semValorCorpo + crc16Pix(semValorCorpo);
    expect(() => validarEnv({ ...ENV_OK, PIX_COPIA_E_COLA: semValor })).toThrow(/PIX_COPIA_E_COLA.*valor/);
  });

  it('falha rápido se faltar variável ou o segredo for curto', () => {
    const { DATABASE_URL: _semBanco, ...semBanco } = ENV_OK;
    expect(() => validarEnv(semBanco)).toThrow(/DATABASE_URL/);
    expect(() => validarEnv({ ...ENV_OK, JWT_SECRET: 'curto' })).toThrow(/JWT_SECRET/);
    const { FIREBASE_PROJECT_ID: _semProjeto, ...semProjeto } = ENV_OK;
    expect(() => validarEnv(semProjeto)).toThrow(/FIREBASE_PROJECT_ID/);
  });
});

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(cadastroSchema);

  it('devolve o valor normalizado', () => {
    const r = pipe.transform({ nome: ' Ana ', email: 'A@B.COM', senha: '12345678', aceitouTermos: true });
    expect(r).toEqual({ nome: 'Ana', email: 'a@b.com', senha: '12345678', aceitouTermos: true });
  });

  it('lança VALIDACAO com erros por campo', () => {
    try {
      pipe.transform({ nome: 'A', email: 'x', senha: '1', aceitouTermos: false });
      throw new Error('deveria falhar');
    } catch (e) {
      expect(e).toBeInstanceOf(ErroApp);
      const corpo = (e as ErroApp).getResponse() as { codigo: string; campos: Record<string, string> };
      expect(corpo.codigo).toBe('VALIDACAO');
      expect(Object.keys(corpo.campos).sort()).toEqual(['aceitouTermos', 'email', 'nome', 'senha']);
    }
  });
});

describe('chaves de foto', () => {
  it('segue provas/{desafio}/{participante}/{dia}/{tipo}-{id}.{ext}', () => {
    const k = chaveOriginal({
      desafioId: 'd1',
      participanteId: 'p1',
      numeroDia: 4,
      tipo: 'AGUA',
      fotoId: 'f1',
      mimeType: 'image/jpeg',
    });
    expect(k).toBe('provas/d1/p1/4/AGUA-f1.jpg');
    expect(chavesProcessadas(k)).toEqual({
      cheia: 'provas/d1/p1/4/AGUA-f1.full.webp',
      thumb: 'provas/d1/p1/4/AGUA-f1.thumb.webp',
    });
    // original webp nunca colide com a versão processada
    expect(chavesProcessadas('a/AGUA-x.webp').cheia).toBe('a/AGUA-x.full.webp');
  });
});

describe('opcoesRedis', () => {
  it('interpreta URL com senha, db e TLS', () => {
    expect(opcoesRedis('rediss://default:s%40nha@host.com:6380/2')).toEqual({
      host: 'host.com',
      port: 6380,
      username: 'default',
      password: 's@nha',
      db: 2,
      tls: {},
    });
    expect(opcoesRedis('redis://localhost:6379')).toMatchObject({ host: 'localhost', port: 6379, db: 0 });
  });
});

describe('opcoesRedis family', () => {
  it('respeita ?family=0', () => {
    expect(opcoesRedis('redis://h:6379?family=0')).toMatchObject({ family: 0 });
  });
});

describe('montarPix', () => {
  it('lê o payload demo (R$ 50,00) e devolve null sem env ou com payload inválido', () => {
    expect(montarPix(PIX_DEMO)).toEqual({
      copiaECola: PIX_DEMO,
      chave: 'pix@exemplo.dev',
      nomeRecebedor: 'EVEREST DEMO',
      valorCentavos: 5000,
    });
    expect(montarPix(` ${PIX_DEMO} `)?.copiaECola).toBe(PIX_DEMO);
    expect(montarPix(undefined)).toBeNull();
    expect(montarPix('000201qualquer-coisa')).toBeNull();
  });
});
