import { lerFaixaVus, lerInteiro, numerosDaFaixa } from './args';
import { emailDoVu, numeroDoEmail } from './config';

describe('lerInteiro', () => {
  it('usa o padrão quando ausente e aceita inteiros na faixa', () => {
    expect(lerInteiro(undefined, 'vus', 5, 5, 200)).toBe(5);
    expect(lerInteiro('12', 'vus', 5, 5, 200)).toBe(12);
  });

  it('recusa fora da faixa, fração, texto e vazio', () => {
    for (const v of ['4', '201', '7.5', 'abc', '', 'true']) {
      expect(() => lerInteiro(v, 'vus', 5, 5, 200)).toThrow(
        '--vus deve ser um inteiro entre 5 e 200.',
      );
    }
  });
});

describe('lerFaixaVus (preparar --inicio/--quantidade)', () => {
  it('padrão: VUs 1..30', () => {
    const f = lerFaixaVus({});
    expect(f).toEqual({ inicio: 1, quantidade: 30 });
    expect(numerosDaFaixa(f)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it('--inicio 101 --quantidade 5 → vu-101..vu-105', () => {
    const f = lerFaixaVus({ inicio: '101', quantidade: '5' });
    expect(numerosDaFaixa(f)).toEqual([101, 102, 103, 104, 105]);
    const emails = numerosDaFaixa(f).map(emailDoVu);
    expect(emails[0]).toBe('vu-101@vu.everestt.app.br');
    expect(emails.map(numeroDoEmail)).toEqual([101, 102, 103, 104, 105]);
  });

  it('números de 4 dígitos continuam sendo VUs (até 9999)', () => {
    const f = lerFaixaVus({ inicio: '9995', quantidade: '5' });
    expect(numerosDaFaixa(f).map((n) => numeroDoEmail(emailDoVu(n)))).toEqual([
      9995, 9996, 9997, 9998, 9999,
    ]);
  });

  it('recusa faixa que passa de vu-9999 e valores inválidos', () => {
    expect(() => lerFaixaVus({ inicio: '9999', quantidade: '2' })).toThrow('passaria de vu-9999');
    expect(() => lerFaixaVus({ inicio: '0' })).toThrow('--inicio');
    expect(() => lerFaixaVus({ quantidade: '201' })).toThrow('--quantidade');
    expect(() => lerFaixaVus({ inicio: 'true' })).toThrow('--inicio');
  });
});
