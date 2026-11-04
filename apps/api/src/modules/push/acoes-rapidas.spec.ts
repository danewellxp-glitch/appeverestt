import type { DesafioService } from '../desafios/desafio.service';
import type { DiaService } from '../dias/dia.service';
import { AcoesRapidasService } from './acoes-rapidas.service';

const DESAFIO = {
  id: 'd1',
  slug: 'desafio-teste',
  dataInicio: new Date('2026-11-01T00:00:00Z'),
  totalDias: 30,
  timezone: 'America/Sao_Paulo',
};
const PARTICIPANTE = { id: 'p1' };
const AGORA = new Date('2026-11-04T15:00:00Z'); // dia 4

function detalhe(extra: Record<string, unknown> = {}) {
  return {
    diaId: 'x',
    invalidadoEm: null,
    conferidoEm: null,
    numeroDia: 4,
    data: '2026-11-04',
    aguaMl: 1000,
    exercicio: false,
    paginasLidas: 0,
    storyPostado: true,
    concluido: false,
    invalidado: false,
    motivoInvalidacao: null,
    editavel: true,
    requisitosPendentes: [],
    fotos: [],
    ...extra,
  };
}

function montar(antes = detalhe(), depois = detalhe({ aguaMl: 1250 }), desafio: Record<string, unknown> = DESAFIO) {
  const desafios = {
    ativo: jest.fn().mockResolvedValue(desafio),
    exigirParticipante: jest.fn().mockResolvedValue({ desafio, participante: PARTICIPANTE }),
  };
  const dias = {
    exigirEditavel: jest.fn(),
    detalhe: jest.fn().mockResolvedValueOnce(antes).mockResolvedValueOnce(depois),
    salvarCheckin: jest.fn().mockResolvedValue(undefined),
  };
  const s = new AcoesRapidasService(desafios as unknown as DesafioService, dias as unknown as DiaService);
  return { s, desafios, dias };
}

describe('AcoesRapidasService.aplicar', () => {
  it('água: soma 250 ml no dia de hoje do desafio ativo, mantendo o resto', async () => {
    const { s, desafios, dias } = montar();
    const r = await s.aplicar('u1', 'agua', AGORA);
    expect(desafios.exigirParticipante).toHaveBeenCalledWith('desafio-teste', 'u1');
    expect(dias.exigirEditavel).toHaveBeenCalledWith(DESAFIO, 4, AGORA);
    expect(dias.salvarCheckin).toHaveBeenCalledWith(DESAFIO, PARTICIPANTE, 4, {
      aguaMl: 1250,
      exercicio: false,
      paginasLidas: 0,
      storyPostado: true,
    });
    expect(r.mudou).toBe(true);
    expect(r.mensagem).toMatch(/\+250 ml/);
    expect(r.dia.aguaMl).toBe(1250);
    expect(r.dia).not.toHaveProperty('diaId');
    expect(r.dia).not.toHaveProperty('conferidoEm');
  });

  it('treino já marcado: não salva e devolve mudou=false', async () => {
    const { s, dias } = montar(detalhe({ exercicio: true }));
    const r = await s.aplicar('u1', 'treino', AGORA);
    expect(r.mudou).toBe(false);
    expect(dias.salvarCheckin).not.toHaveBeenCalled();
    expect(dias.detalhe).toHaveBeenCalledTimes(1);
  });

  it('antes do início e depois do fim: erros do desafio', async () => {
    const futuro = montar(undefined, undefined, { ...DESAFIO, dataInicio: new Date('2026-12-01T00:00:00Z') });
    await expect(futuro.s.aplicar('u1', 'agua', AGORA)).rejects.toMatchObject({
      response: { codigo: 'DESAFIO_NAO_INICIADO' },
    });
    const passado = montar(undefined, undefined, { ...DESAFIO, dataInicio: new Date('2026-09-01T00:00:00Z') });
    await expect(passado.s.aplicar('u1', 'agua', AGORA)).rejects.toMatchObject({
      response: { codigo: 'DESAFIO_ENCERRADO' },
    });
    expect(passado.dias.salvarCheckin).not.toHaveBeenCalled();
  });
});
