import { gerarPixEstatico } from '@everest/shared';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { QrPix } from './QrPix';

afterEach(cleanup);

// Dados de demonstração (nunca os dados reais do recebedor).
const PAYLOAD = gerarPixEstatico({
  chave: 'pix@exemplo.dev',
  nome: 'EVEREST DEMO',
  cidade: 'SAO PAULO',
  valor: 50,
  txid: 'EVEREST',
});

describe('QrPix', () => {
  it('renderiza um role="img" rotulado com o valor e um svg decorativo dentro', () => {
    render(<QrPix payload={PAYLOAD} valorCentavos={5000} />);
    const qr = screen.getByRole('img', { name: /QR code do Pix de R\$\s*50,00/ });
    expect(qr.getAttribute('aria-label')).toContain('use o botão Copiar código Pix');
    const svg = qr.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.querySelectorAll('path, rect').length).toBeGreaterThan(0);
  });

  it('fica em fundo branco literal em qualquer tema', () => {
    render(<QrPix payload={PAYLOAD} valorCentavos={5000} />);
    expect(screen.getByRole('img').className).toContain('bg-white');
  });
});
