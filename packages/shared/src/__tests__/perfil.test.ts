import { describe, expect, it } from 'vitest';
import {
  ehDataValida,
  ehInstagramValido,
  ehNomeCompleto,
  idadeEm,
  normalizarInstagram,
  normalizarTelefone,
} from '../regras/perfil';
import { hojeNoFuso, somarDias } from '../regras/diaAtual';
import { atualizarPerfilSchema } from '../schemas';

describe('regras de perfil', () => {
  it('idadeEm conta o aniversário no próprio dia', () => {
    expect(idadeEm('2008-10-30', '2026-10-30')).toBe(18);
    expect(idadeEm('2008-10-31', '2026-10-30')).toBe(17);
    expect(idadeEm('2000-02-29', '2026-02-28')).toBe(25);
  });

  it('ehDataValida rejeita datas que não existem', () => {
    expect(ehDataValida('2000-02-29')).toBe(true);
    expect(ehDataValida('2001-02-29')).toBe(false);
    expect(ehDataValida('30/10/2000')).toBe(false);
  });

  it('instagram: tira o @, minúsculas e valida o formato', () => {
    expect(normalizarInstagram('  @@Maria.Souza ')).toBe('maria.souza');
    expect(ehInstagramValido('maria.souza_1')).toBe(true);
    expect(ehInstagramValido('.maria')).toBe(false);
    expect(ehInstagramValido('maria..souza')).toBe(false);
    expect(ehInstagramValido('maria souza')).toBe(false);
    expect(ehInstagramValido('a'.repeat(31))).toBe(false);
  });

  it('telefone: só dígitos com DDD, sem +55; celular com 11 dígitos começa com 9', () => {
    expect(normalizarTelefone('+55 (11) 98765-4321')).toBe('11987654321');
    expect(normalizarTelefone('(41) 3333-4444')).toBe('4133334444');
    expect(normalizarTelefone('11 88765-4321')).toBeNull();
    expect(normalizarTelefone('(01) 98765-4321')).toBeNull();
    expect(normalizarTelefone('98765-4321')).toBeNull();
  });

  it('nome completo exige sobrenome', () => {
    expect(ehNomeCompleto('Maria Souza')).toBe(true);
    expect(ehNomeCompleto('  Maria  ')).toBe(false);
  });
});

describe('atualizarPerfilSchema', () => {
  const hoje = hojeNoFuso(new Date(), 'America/Sao_Paulo');
  const nascimento18 = `${Number(hoje.slice(0, 4)) - 18}${hoje.slice(4)}`;
  const valido = {
    nome: 'Maria Souza',
    instagram: '@Maria.Souza',
    dataNascimento: '1995-04-12',
    whatsapp: '(11) 98765-4321',
    bairro: 'Pinheiros',
    cidade: 'São Paulo',
    uf: 'sp',
    aceitouTermos: true,
  };

  it('normaliza e aplica o padrão do marketing (false)', () => {
    expect(atualizarPerfilSchema.parse(valido)).toEqual({
      ...valido,
      instagram: 'maria.souza',
      whatsapp: '11987654321',
      uf: 'SP',
      aceitouMarketing: false,
    });
  });

  it('18 anos hoje passa; 1 dia antes de completar não', () => {
    expect(atualizarPerfilSchema.safeParse({ ...valido, dataNascimento: nascimento18 }).success).toBe(true);
    const r = atualizarPerfilSchema.safeParse({ ...valido, dataNascimento: somarDias(nascimento18, 1) });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe('O desafio é para maiores de 18 anos.');
  });

  it('erros por campo', () => {
    const r = atualizarPerfilSchema.safeParse({
      ...valido,
      nome: 'Maria',
      instagram: '@',
      whatsapp: '123',
      bairro: '',
      uf: 'XX',
    });
    expect(r.success).toBe(false);
    const campos = new Set(r.error?.issues.map((i) => i.path[0]));
    expect(campos).toEqual(new Set(['nome', 'instagram', 'whatsapp', 'bairro', 'uf']));
  });
});
