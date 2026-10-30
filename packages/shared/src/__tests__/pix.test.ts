import { describe, expect, it } from 'vitest';
import { crc16Pix, gerarPixEstatico, lerPix, valorEmCentavos } from '../regras/pix';

/** Dados de demonstração (nunca os do embaixador real). */
const DEMO = {
  chave: 'pix@exemplo.dev',
  nome: 'Everest Demo',
  cidade: 'São Paulo',
  valor: 50,
  txid: 'EVERESTDEMO',
  descricao: 'DESAFIO 30 DIAS',
} as const;

/** Mesmo literal de apps/api/.env.example, apps/api/test/env-teste.ts e apps/web/e2e/ambiente.ts. */
const PIX_DEMO =
  '00020101021126560014br.gov.bcb.pix0115pix@exemplo.dev0215DESAFIO 30 DIAS520400005303986540550.005802BR5912EVEREST DEMO6009SAO PAULO62150511EVERESTDEMO63048FC9';

describe('Pix (BR Code)', () => {
  it('crc16Pix bate com o valor de referência do CRC-16/CCITT-FALSE', () => {
    expect(crc16Pix('123456789')).toBe('29B1');
  });

  it('gera o payload estático de demonstração (igual ao dos .env de exemplo) e lê de volta', () => {
    const payload = gerarPixEstatico(DEMO);
    expect(payload).toBe(PIX_DEMO);
    expect(lerPix(payload)).toEqual({
      chave: 'pix@exemplo.dev',
      nome: 'EVEREST DEMO',
      cidade: 'SAO PAULO',
      valor: 50,
      txid: 'EVERESTDEMO',
      descricao: 'DESAFIO 30 DIAS',
      estatico: true,
    });
  });

  it('lê payloads de banco sem a tag 01 e com espaço no fim da descrição', () => {
    const corpo =
      '000201' +
      '26460014BR.GOV.BCB.PIX0110a@b.com.br0210TESTE PIX ' +
      '52040000530398654040.015802BR5905TESTE6006ITAJAI62070503ABC6304';
    const r = lerPix(corpo + crc16Pix(corpo));
    expect(r).toMatchObject({ chave: 'a@b.com.br', valor: 0.01, txid: 'ABC', descricao: 'TESTE PIX', estatico: true });
  });

  it('rejeita CRC errado, payload truncado e Pix de outro arranjo', () => {
    const bom = gerarPixEstatico(DEMO);
    expect(lerPix(bom.slice(0, -4) + '0000')).toBeNull();
    expect(lerPix(bom.slice(0, 40))).toBeNull();
    expect(lerPix('')).toBeNull();
    const outro = bom.replace('br.gov.bcb.pix', 'br.gov.bcb.xyz').slice(0, -4);
    expect(lerPix(outro + crc16Pix(outro))).toBeNull();
  });

  it('valorEmCentavos evita erro de ponto flutuante', () => {
    expect(valorEmCentavos(50)).toBe(5000);
    expect(valorEmCentavos(0.1 + 0.2)).toBe(30);
  });
});
