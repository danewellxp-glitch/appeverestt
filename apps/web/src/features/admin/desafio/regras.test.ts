import { slugDesafioSchema } from '@everest/shared';
import { describe, expect, it } from 'vitest';
import { linkWhatsappComTexto, primeiroNome, rotuloStatus, sugerirSlug } from './regras';

describe('sugerirSlug', () => {
  it('tira acentos e símbolos e liga as palavras com hífen', () => {
    expect(sugerirSlug('Desafio 30 Dias — Verão')).toBe('desafio-30-dias-verao');
    expect(sugerirSlug('  Everest: Edição #2!  ')).toBe('everest-edicao-2');
    expect(sugerirSlug('Ação & Reação')).toBe('acao-reacao');
  });

  it('a sugestão passa no schema do identificador', () => {
    for (const nome of ['Desafio Janeiro/2027', 'TT — Turma Ç', 'a b c d']) {
      const slug = sugerirSlug(nome);
      expect(slugDesafioSchema.safeParse(slug).success, slug).toBe(true);
    }
  });

  it('corta em 60 caracteres sem deixar hífen no fim', () => {
    const slug = sugerirSlug(`${'a'.repeat(59)} bbb`);
    expect(slug).toBe('a'.repeat(59));
    expect(sugerirSlug('!!!')).toBe('');
  });
});

describe('rotuloStatus', () => {
  const base = {
    totalDias: 30,
    dataInicio: '2026-11-03',
    timezone: 'America/Sao_Paulo',
    diaAtual: null,
  };
  const agora = new Date('2026-10-31T15:00:00Z');

  it('antes do início conta os dias', () => {
    expect(rotuloStatus({ ...base, status: 'NAO_INICIADO' }, agora)).toBe('Começa em 3 dias');
    expect(rotuloStatus({ ...base, dataInicio: '2026-11-01', status: 'NAO_INICIADO' }, agora)).toBe(
      'Começa amanhã',
    );
  });

  it('em andamento e encerrado', () => {
    expect(rotuloStatus({ ...base, status: 'EM_ANDAMENTO', diaAtual: 2 }, agora)).toBe(
      'Dia 2 de 30',
    );
    expect(rotuloStatus({ ...base, status: 'ENCERRADO' }, agora)).toBe('Encerrado');
  });
});

describe('WhatsApp', () => {
  it('monta o link com +55 e a mensagem codificada', () => {
    expect(linkWhatsappComTexto('(11) 98765-4321')).toBe('https://wa.me/5511987654321');
    expect(linkWhatsappComTexto('11987654321', 'Oi, Ana! Bora?')).toBe(
      'https://wa.me/5511987654321?text=Oi%2C%20Ana!%20Bora%3F',
    );
  });

  it('primeiro nome', () => {
    expect(primeiroNome('  Ana Maria Souza ')).toBe('Ana');
  });
});
