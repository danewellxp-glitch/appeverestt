import { type FotoComHash, FotosParecidas } from './fotos-parecidas';

const IGUAL = '0f0f0f0f33333333';
const QUASE = '0f0f0f0f33333330'; // 2 bits de diferença de IGUAL
const LONGE = 'f0f0f0f0cccccccc'; // 64 bits de diferença de IGUAL

function foto(
  id: string,
  hash: string,
  extra: Partial<Omit<FotoComHash, 'id' | 'hash'>> = {},
): FotoComHash {
  return {
    id,
    hash,
    tipo: 'AGUA',
    numeroDia: 1,
    participanteId: 'ana',
    nome: 'Ana Souza',
    paraRevisar: true,
    ...extra,
  };
}

describe('FotosParecidas', () => {
  it('aponta a outra foto parecida (de outra pessoa ou da mesma) e ignora a própria', () => {
    const fotos = [
      foto('a1', IGUAL, { numeroDia: 2, tipo: 'LEITURA' }),
      foto('b1', QUASE, { participanteId: 'bia', nome: 'Bia Lima', numeroDia: 5, tipo: 'AGUA' }),
      foto('a2', LONGE, { numeroDia: 5, tipo: 'EXERCICIO' }),
    ];
    const p = new FotosParecidas(fotos);
    expect(p.daFoto('b1')).toEqual({
      participanteId: 'ana',
      nome: 'Ana Souza',
      numeroDia: 2,
      tipo: 'LEITURA',
      mesmaPessoa: false,
    });
    expect(p.daFoto('a1')).toMatchObject({ participanteId: 'bia', mesmaPessoa: false });
    expect(p.daFoto('a2')).toBeNull();
    expect(p.daFoto('sem-hash')).toBeNull();

    const mesma = new FotosParecidas([foto('x', IGUAL), foto('y', IGUAL, { tipo: 'LEITURA' })]);
    expect(mesma.daFoto('y')).toMatchObject({
      participanteId: 'ana',
      tipo: 'AGUA',
      mesmaPessoa: true,
    });
  });

  it('com duas candidatas na mesma distância, fica a mais antiga (primeira da lista)', () => {
    const p = new FotosParecidas([
      foto('original', IGUAL, { numeroDia: 1 }),
      foto('copia1', IGUAL, { participanteId: 'bia', numeroDia: 3 }),
      foto('copia2', IGUAL, { participanteId: 'caio', numeroDia: 4 }),
    ]);
    expect(p.daFoto('copia2')?.numeroDia).toBe(1);
    expect(p.daFoto('original')?.participanteId).toBe('bia');
  });

  it('dias para revisar com foto parecida: só dias na fila, sem repetir, em ordem', () => {
    const p = new FotosParecidas([
      foto('a3', IGUAL, { numeroDia: 3, tipo: 'AGUA' }),
      foto('a3b', IGUAL, { numeroDia: 3, tipo: 'LEITURA' }),
      foto('a1', QUASE, { numeroDia: 1 }),
      // dia já aprovado: a parecida conta para o outro dia, não para este
      foto('b2', IGUAL, { participanteId: 'bia', numeroDia: 2, paraRevisar: false }),
      foto('b4', LONGE, { participanteId: 'bia', numeroDia: 4 }),
    ]);
    expect(Object.fromEntries(p.diasParaRevisar())).toEqual({ ana: [1, 3] });
  });
});
