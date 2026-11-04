import { describe, expect, it } from 'vitest';
import { fechamento, fiqueLigado, passosComoFunciona, perguntasFrequentes } from '../../content/landing';
import { etapasDoInformado } from '../pagamento/EtapasInscricao';
import { finalDoWhatsapp, linkExterno, linkInstagram, semPrefixo } from './contato';
import { numerosDoDesafio } from './numeros';
import { fotoLarga } from './SecaoFotos';

describe('contato', () => {
  it('finalDoWhatsapp mostra só os 4 últimos dígitos', () => {
    expect(finalDoWhatsapp('11987654321')).toBe('4321');
    expect(finalDoWhatsapp('(11) 98765-4321')).toBe('4321');
    expect(finalDoWhatsapp('123')).toBeNull();
    expect(finalDoWhatsapp(null)).toBeNull();
  });

  it('linkExterno só aceita https', () => {
    expect(linkExterno(' https://chat.whatsapp.com/AbC123 ')).toBe('https://chat.whatsapp.com/AbC123');
    expect(linkExterno('')).toBeNull();
    expect(linkExterno('http://chat.whatsapp.com/x')).toBeNull();
    expect(linkExterno('javascript:alert(1)')).toBeNull();
    expect(linkExterno('chat.whatsapp.com/x')).toBeNull();
  });

  it('linkInstagram aceita o @ com ou sem arroba e recusa o inválido', () => {
    expect(linkInstagram('@everest.desafio')).toBe('https://instagram.com/everest.desafio');
    expect(linkInstagram('everest_desafio')).toBe('https://instagram.com/everest_desafio');
    expect(linkInstagram('')).toBeNull();
    expect(linkInstagram('evil.com/x?y')).toBeNull();
    expect(semPrefixo('##everest', '#')).toBe('everest');
  });
});

describe('numerosDoDesafio', () => {
  it('usa os padrões sem desafio e o valor formatado com Pix configurado', () => {
    expect(numerosDoDesafio(undefined)).toEqual({ totalDias: 30, totalVagas: 50, valor: null });
    const n = numerosDoDesafio({ totalDias: 21, totalVagas: 40, inscricao: { valorCentavos: 5000 } } as never);
    expect(n.totalDias).toBe(21);
    expect(n.totalVagas).toBe(40);
    expect(n.valor).toMatch(/^R\$\s*50,00$/);
  });
});

describe('textos da landing', () => {
  it('os passos vão da conta ao check-in, com o valor e as vagas do desafio', () => {
    const passos = passosComoFunciona({ valor: 'R$ 50,00', totalVagas: 50, totalDias: 30, apelido: 'TT' });
    expect(passos.map((p) => p.titulo)).toEqual([
      'Crie sua conta',
      'Vaga reservada',
      'Faça o Pix de R$ 50,00',
      'O TT confirma o pagamento',
      'Fiquem ligados',
      '30 dias de check-in',
    ]);
    expect(passos[1]?.texto).toContain('50 desafiados');
    expect(passosComoFunciona({ valor: null, totalVagas: 50, totalDias: 30, apelido: 'TT' })[2]?.titulo).toBe(
      'Faça o Pix da inscrição',
    );
  });

  it('o FAQ cita o valor só quando o Pix está configurado', () => {
    expect(perguntasFrequentes({ valor: 'R$ 50,00', totalVagas: 50, apelido: 'TT' })[0]?.resposta).toContain('R$ 50,00');
    expect(perguntasFrequentes({ valor: null, totalVagas: 50, apelido: 'TT' })[0]?.resposta).not.toContain('R$');
  });

  it('fechamento: singular, plural e turma completa', () => {
    expect(fechamento.titulo(1)).toBe('Resta 1 vaga');
    expect(fechamento.titulo(37)).toBe('Restam 37 vagas');
    expect(fechamento.tituloBloqueado(true)).toBe('Turma completa');
  });

  it('"Fiquem ligados": contagem até o início', () => {
    expect(fiqueLigado.faltam(5)).toBe('faltam 5 dias');
    expect(fiqueLigado.faltam(1)).toBe('começa amanhã');
    expect(fiqueLigado.faltam(0)).toBe('começa hoje');
    expect(fiqueLigado.eyebrow(12)).toBe('Vaga nº 12 · inscrição confirmada');
    expect(fiqueLigado.eyebrow(null)).toBe('Inscrição confirmada');
  });
});

describe('fotoLarga (galeria)', () => {
  it('a 1ª é larga; uma foto que sobrar no fim também', () => {
    expect([0, 1, 2].map((i) => fotoLarga(i, 3))).toEqual([true, false, false]);
    expect([0, 1, 2, 3].map((i) => fotoLarga(i, 4))).toEqual([true, false, false, true]);
    expect(fotoLarga(0, 1)).toBe(true);
  });
});

describe('etapasDoInformado (pagamento em análise)', () => {
  it('vaga e Pix feitos, conferência do TT em andamento, acesso a seguir', () => {
    const etapas = etapasDoInformado({
      vagaNumero: 12,
      totalVagas: 50,
      informadoEm: '2026-10-31T11:55:00Z',
      apelido: 'TT',
      agora: Date.parse('2026-10-31T12:00:00Z'),
    });
    expect(etapas.map((e) => e.situacao)).toEqual(['feita', 'feita', 'atual', 'proxima']);
    expect(etapas[0]?.texto).toBe('Nº 12 de 50');
    expect(etapas[1]?.texto).toBe('Aviso enviado há 5 minutos');
    expect(etapas[2]?.titulo).toBe('Conferência do TT');
  });
});
