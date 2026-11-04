import { ACOES_RAPIDAS, MODELOS_AVISO, urlDaAcaoRapida, type PayloadPush } from '@everest/shared';
import { describe, expect, it } from 'vitest';
import {
  ACOES_DO_SW,
  ICONE_NOTIFICACAO,
  PAYLOAD_PADRAO,
  URL_CONFIRMACAO,
  URL_PADRAO,
  caminhoSeguro,
  destinoDoClique,
  lerPayload,
  mensagemDaResposta,
  opcoesDaConfirmacao,
  opcoesDaNotificacao,
  urlDaAcaoNoSw,
} from './mensagens';

const AGUA: PayloadPush = {
  titulo: MODELOS_AVISO.agua.titulo,
  corpo: MODELOS_AVISO.agua.corpo,
  url: '/hoje?acao=agua',
  acao: 'agua',
  botao: MODELOS_AVISO.agua.botao,
  tag: 'lembrete-agua',
};

describe('espelhos do shared (o sw.js não importa valores do @everest/shared)', () => {
  it('as ações e as URLs são as mesmas do shared', () => {
    expect([...ACOES_DO_SW]).toEqual([...ACOES_RAPIDAS]);
    for (const acao of ACOES_RAPIDAS) expect(urlDaAcaoNoSw(acao)).toBe(urlDaAcaoRapida(acao));
  });
});

describe('lerPayload', () => {
  it('aceita o payload da API como veio', () => {
    expect(lerPayload(AGUA)).toEqual(AGUA);
  });

  it('dados ilegíveis viram o aviso genérico (o Chrome exige mostrar algo)', () => {
    expect(lerPayload(null)).toBe(PAYLOAD_PADRAO);
    expect(lerPayload('texto')).toBe(PAYLOAD_PADRAO);
    expect(lerPayload({ titulo: '', corpo: 'x' })).toBe(PAYLOAD_PADRAO);
  });

  it('descarta ação desconhecida, URL externa e botão sem ação', () => {
    const p = lerPayload({ titulo: 'Oi', corpo: 'Tudo bem?', url: 'https://golpe.example', acao: 'pix', botao: 'Pagar', tag: 't' });
    expect(p).toEqual({ titulo: 'Oi', corpo: 'Tudo bem?', url: URL_PADRAO, tag: 't' });
  });
});

describe('caminhoSeguro', () => {
  it('só aceita caminhos internos', () => {
    expect(caminhoSeguro('/ranking')).toBe('/ranking');
    expect(caminhoSeguro('//evil.example/x')).toBe(URL_PADRAO);
    expect(caminhoSeguro('/\\evil.example')).toBe(URL_PADRAO);
    expect(caminhoSeguro('javascript:alert(1)')).toBe(URL_PADRAO);
    expect(caminhoSeguro(undefined)).toBe(URL_PADRAO);
  });
});

describe('opcoesDaNotificacao', () => {
  it('com ação: um botão com o rótulo do modelo, tag e renotify', () => {
    const o = opcoesDaNotificacao(AGUA);
    expect(o.actions).toEqual([{ action: 'agua', title: '+250 ml' }]);
    expect(o).toMatchObject({ body: AGUA.corpo, icon: ICONE_NOTIFICACAO, tag: 'lembrete-agua', renotify: true });
    expect(o.badge).toMatch(/^\/.+\.png$/);
    expect(o.data).toEqual({ url: '/hoje?acao=agua', acao: 'agua' });
  });

  it('sem ação (aviso livre): sem botão', () => {
    const o = opcoesDaNotificacao({ titulo: 'Amanhã começa!', corpo: 'Durma cedo.', url: '/desafio', tag: 'aviso' });
    expect(o.actions).toBeUndefined();
    expect(o.data).toEqual({ url: '/desafio' });
  });

  it('a confirmação substitui o lembrete (mesma tag), sem botão e sem vibrar de novo', () => {
    const o = opcoesDaConfirmacao('+250 ml registrados. Total: 750 ml.', 'lembrete-agua');
    expect(o).toMatchObject({ body: '+250 ml registrados. Total: 750 ml.', tag: 'lembrete-agua', renotify: false });
    expect(o.actions).toBeUndefined();
    expect(o.data.url).toBe(URL_CONFIRMACAO);
  });
});

describe('destinoDoClique', () => {
  it('botão de ação: registra pela API e, se falhar, abre /hoje?acao=', () => {
    expect(destinoDoClique({ action: 'agua', data: { url: '/hoje?acao=agua', acao: 'agua' } })).toEqual({
      tipo: 'acao',
      acao: 'agua',
      seFalhar: '/hoje?acao=agua',
    });
  });

  it('toque no corpo (iPhone ou Android): abre a URL da notificação', () => {
    expect(destinoDoClique({ action: '', data: { url: '/hoje?acao=treino', acao: 'treino' } })).toEqual({
      tipo: 'abrir',
      url: '/hoje?acao=treino',
    });
    expect(destinoDoClique({ action: '', data: null })).toEqual({ tipo: 'abrir', url: URL_PADRAO });
  });

  it('ação desconhecida conta como toque no corpo', () => {
    expect(destinoDoClique({ action: 'excluir', data: { url: '/ranking' } })).toEqual({ tipo: 'abrir', url: '/ranking' });
  });
});

describe('mensagemDaResposta', () => {
  it('usa a mensagem do servidor e recusa respostas estranhas', () => {
    expect(mensagemDaResposta({ mensagem: 'Treino de hoje marcado como feito.', mudou: true })).toBe(
      'Treino de hoje marcado como feito.',
    );
    expect(mensagemDaResposta({ mensagem: '  ' })).toBeNull();
    expect(mensagemDaResposta(null)).toBeNull();
  });
});
