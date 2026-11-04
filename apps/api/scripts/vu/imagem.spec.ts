import sharp from 'sharp';
import {
  caracteres,
  criarQuadro,
  desenharTexto,
  gerarFotoJpeg,
  larguraEmPontos,
  quadroDaFoto,
} from './imagem';

function contarCor(pixels: Buffer, cor: readonly [number, number, number]): number {
  let n = 0;
  for (let i = 0; i < pixels.length; i += 3) {
    if (pixels[i] === cor[0] && pixels[i + 1] === cor[1] && pixels[i + 2] === cor[2]) n++;
  }
  return n;
}

describe('imagem dos VUs', () => {
  it('conhece letras, números e o acento agudo', () => {
    const cs = caracteres('Água 07');
    expect(cs).toHaveLength(7);
    expect(cs[0]!.agudo).toBe(true);
    expect(cs[1]!.agudo).toBe(false);
    expect(caracteres('ç')[0]!.glifo).toEqual(caracteres('C')[0]!.glifo);
    expect(larguraEmPontos('VU 07')).toBe(5 * 6 - 1);
    expect(larguraEmPontos('')).toBe(0);
  });

  it('desenha o texto nos pixels (sem depender de fontes do sistema)', () => {
    const q = criarQuadro(100, 40, [0, 0, 0], [0, 0, 0]);
    desenharTexto(q, 'I', 0, 0, 2, [255, 255, 255]);
    // "I" tem 11 pontos acesos na fonte 5x7 (3 em cima, 5 no meio, 3 embaixo); na escala 2, cada um vira 2x2.
    expect(contarCor(q.pixels, [255, 255, 255])).toBe(11 * 4);
  });

  it('a foto tem texto branco sobre o fundo da cor do requisito', () => {
    const q = quadroDaFoto(
      { rotuloVu: '07', numeroDia: 1, tipo: 'AGUA', rodape: '31/10 14:32' },
      360,
      480,
    );
    expect(q.pixels).toHaveLength(360 * 480 * 3);
    expect(contarCor(q.pixels, [255, 255, 255])).toBeGreaterThan(1_000);
  });

  it('gera um JPEG válido e pequeno', async () => {
    const jpeg = await gerarFotoJpeg({
      rotuloVu: '07',
      numeroDia: 12,
      tipo: 'EXERCICIO',
      rodape: '31/10 14:32',
    });
    expect(jpeg[0]).toBe(0xff);
    expect(jpeg[1]).toBe(0xd8);
    expect(jpeg.length).toBeLessThan(200_000);
    const meta = await sharp(jpeg).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.width).toBe(720);
    expect(meta.height).toBe(960);
  });
});
