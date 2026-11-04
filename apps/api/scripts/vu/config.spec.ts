import { emailDoVu, ehEmailVu, lerConfig, numeroDoEmail, slugPermitido } from './config';

describe('e-mails dos VUs', () => {
  it('ida e volta entre número e e-mail', () => {
    expect(emailDoVu(7)).toBe('vu-07@vu.everestt.app.br');
    expect(emailDoVu(123)).toBe('vu-123@vu.everestt.app.br');
    for (let n = 1; n <= 200; n++) expect(numeroDoEmail(emailDoVu(n))).toBe(n);
  });

  it('só reconhece e-mails exatamente no formato de VU', () => {
    expect(ehEmailVu('vu-01@vu.everestt.app.br')).toBe(true);
    expect(ehEmailVu('VU-01@VU.everestt.app.br')).toBe(true);
    for (const e of [
      'anderson@everestt.app.br',
      'vu-01@everestt.app.br',
      'vu-01@vu.everestt.app.br.evil.com',
      'x.vu-01@vu.everestt.app.br',
      'vu-ab@vu.everestt.app.br',
      'vu-1@vu.everestt.app.br',
      'maria@vu.everestt.app.br',
    ]) {
      expect(ehEmailVu(e)).toBe(false);
    }
  });
});

describe('segurança', () => {
  it('só desafios cujo slug começa com "teste" (ou com --forcar)', () => {
    expect(slugPermitido('teste-vu', false)).toBe(true);
    expect(slugPermitido('desafio-30-everest', false)).toBe(false);
    expect(slugPermitido('desafio-30-everest', true)).toBe(true);
  });
});

describe('lerConfig', () => {
  it('usa os padrões e tira a barra final', () => {
    expect(lerConfig({})).toEqual({
      baseUrl: 'https://everestt.app.br',
      apiKey: null,
      maxRpm: 40,
      emulador: null,
    });
    const c = lerConfig({
      VU_BASE_URL: 'http://api:3000/',
      VU_FIREBASE_API_KEY: ' AIza ',
      VU_MAX_RPM: '500',
    });
    expect(c.baseUrl).toBe('http://api:3000');
    expect(c.apiKey).toBe('AIza');
    expect(c.maxRpm).toBe(90);
  });

  it('recusa URL inválida', () => {
    expect(() => lerConfig({ VU_BASE_URL: 'everestt.app.br' })).toThrow('VU_BASE_URL');
  });
});
