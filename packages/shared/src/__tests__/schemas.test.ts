import { describe, expect, it } from 'vitest';
import {
  atualizarPerfilSchema,
  conferenciaSchema,
  criarContaSchema,
  entrarSchema,
  sessaoSchema,
  cadastroSchema,
  checkinSchema,
  invalidacaoSchema,
  loginSchema,
  uploadUrlSchema,
} from '../schemas';

describe('cadastroSchema', () => {
  const valido = { nome: 'Maria', email: '  MARIA@Exemplo.com ', senha: '12345678', aceitouTermos: true };

  it('normaliza o e-mail (trim + lowercase)', () => {
    expect(cadastroSchema.parse(valido).email).toBe('maria@exemplo.com');
  });
  it('exige aceite dos termos', () => {
    expect(cadastroSchema.safeParse({ ...valido, aceitouTermos: false }).success).toBe(false);
    const { aceitouTermos: _omitido, ...semAceite } = valido;
    expect(cadastroSchema.safeParse(semAceite).success).toBe(false);
  });
  it('limites de nome e senha', () => {
    expect(cadastroSchema.safeParse({ ...valido, nome: 'A' }).success).toBe(false);
    expect(cadastroSchema.safeParse({ ...valido, nome: 'A'.repeat(81) }).success).toBe(false);
    expect(cadastroSchema.safeParse({ ...valido, senha: '1234567' }).success).toBe(false);
    expect(cadastroSchema.safeParse({ ...valido, senha: 'x'.repeat(72) }).success).toBe(true);
    expect(cadastroSchema.safeParse({ ...valido, senha: 'x'.repeat(73) }).success).toBe(false);
  });
  it('e-mail inválido', () => {
    expect(cadastroSchema.safeParse({ ...valido, email: 'nao-e-email' }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('aceita e normaliza', () => {
    expect(loginSchema.parse({ email: 'A@B.com', senha: 'x' })).toEqual({ email: 'a@b.com', senha: 'x' });
  });
  it('senha vazia falha', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', senha: '' }).success).toBe(false);
  });
});

describe('checkinSchema', () => {
  const valido = { aguaMl: 3000, exercicio: true, paginasLidas: 10, storyPostado: false };
  it('aceita valores válidos e descarta "concluido" vindo do cliente', () => {
    const r = checkinSchema.parse({ ...valido, concluido: true });
    expect(r).toEqual(valido);
    expect('concluido' in r).toBe(false);
  });
  it('limites', () => {
    expect(checkinSchema.safeParse({ ...valido, aguaMl: -1 }).success).toBe(false);
    expect(checkinSchema.safeParse({ ...valido, aguaMl: 20001 }).success).toBe(false);
    expect(checkinSchema.safeParse({ ...valido, aguaMl: 10.5 }).success).toBe(false);
    expect(checkinSchema.safeParse({ ...valido, paginasLidas: 2001 }).success).toBe(false);
  });
});

describe('uploadUrlSchema', () => {
  it('aceita jpeg até 5 MB', () => {
    expect(
      uploadUrlSchema.safeParse({ tipo: 'AGUA', mimeType: 'image/jpeg', tamanhoBytes: 5 * 1024 * 1024 }).success,
    ).toBe(true);
  });
  it('recusa acima de 5 MB, tipo errado e mime errado', () => {
    expect(
      uploadUrlSchema.safeParse({ tipo: 'AGUA', mimeType: 'image/jpeg', tamanhoBytes: 5 * 1024 * 1024 + 1 }).success,
    ).toBe(false);
    expect(uploadUrlSchema.safeParse({ tipo: 'SELFIE', mimeType: 'image/jpeg', tamanhoBytes: 10 }).success).toBe(false);
    expect(uploadUrlSchema.safeParse({ tipo: 'AGUA', mimeType: 'image/gif', tamanhoBytes: 10 }).success).toBe(false);
  });
});

describe('invalidacaoSchema', () => {
  it('invalidar exige motivo', () => {
    expect(invalidacaoSchema.safeParse({ invalidado: true }).success).toBe(false);
    expect(invalidacaoSchema.safeParse({ invalidado: true, motivo: '  ' }).success).toBe(false);
    expect(invalidacaoSchema.safeParse({ invalidado: true, motivo: 'Foto repetida' }).success).toBe(true);
  });
  it('revalidar não exige motivo', () => {
    expect(invalidacaoSchema.safeParse({ invalidado: false }).success).toBe(true);
  });
});

describe('schemas do Frontend v2', () => {
  it('sessaoSchema exige token até 4096 caracteres', () => {
    expect(sessaoSchema.safeParse({ idToken: 'abc' }).success).toBe(true);
    expect(sessaoSchema.safeParse({ idToken: '' }).success).toBe(false);
    expect(sessaoSchema.safeParse({ idToken: 'x'.repeat(4097) }).success).toBe(false);
  });

  it('atualizarPerfilSchema exige o aceite', () => {
    const sem = atualizarPerfilSchema.safeParse({ aceitouTermos: false });
    expect(sem.success).toBe(false);
    expect(sem.error?.issues.find((i) => i.path[0] === 'aceitouTermos')?.message).toBe(
      'Aceite a política de privacidade para continuar.',
    );
  });

  it('entrarSchema e criarContaSchema: senha de 8 a 72', () => {
    expect(entrarSchema.safeParse({ email: 'A@B.COM', senha: '1234567' }).success).toBe(false);
    expect(entrarSchema.safeParse({ email: 'A@B.COM', senha: '12345678' }).data?.email).toBe('a@b.com');
    expect(
      criarContaSchema.safeParse({ nome: 'Ana', email: 'a@b.com', senha: '12345678', aceitouTermos: true }).success,
    ).toBe(true);
  });

  it('conferenciaSchema exige booleano', () => {
    expect(conferenciaSchema.safeParse({ conferido: true }).success).toBe(true);
    expect(conferenciaSchema.safeParse({ conferido: 'sim' }).success).toBe(false);
  });
});
