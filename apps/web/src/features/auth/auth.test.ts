import { describe, expect, it } from 'vitest';
import { ApiError } from '../../lib/api';
import { traduzirErroAuth } from './errosFirebase';
import { mascararTelefone } from './perfil';
import { destinoDaParticipacao, destinoSeguro } from './sessao';

describe('mascararTelefone', () => {
  it('formata enquanto digita (celular e fixo)', () => {
    expect(mascararTelefone('1')).toBe('(1');
    expect(mascararTelefone('119')).toBe('(11) 9');
    expect(mascararTelefone('1198765')).toBe('(11) 9876-5');
    expect(mascararTelefone('11987654321')).toBe('(11) 98765-4321');
    expect(mascararTelefone('4133334444')).toBe('(41) 3333-4444');
  });

  it('ignora o +55 e o que passar de 11 dígitos', () => {
    expect(mascararTelefone('+55 11 98765-4321')).toBe('(11) 98765-4321');
    expect(mascararTelefone('119876543219999')).toBe('(11) 98765-4321');
    expect(mascararTelefone('')).toBe('');
  });
});

describe('traduzirErroAuth', () => {
  const erroFirebase = (code: string) => Object.assign(new Error(code), { code });

  it('credenciais e e-mail em uso viram mensagens da seção 5.3', () => {
    expect(traduzirErroAuth(erroFirebase('auth/invalid-credential'))).toEqual({ mensagem: 'E-mail ou senha incorretos.' });
    expect(traduzirErroAuth(erroFirebase('auth/email-already-in-use'))).toMatchObject({ campo: 'email', linkEntrar: true });
    expect(traduzirErroAuth(erroFirebase('auth/weak-password'))).toMatchObject({ campo: 'senha' });
  });

  it('popup fechado é silencioso; código desconhecido tem mensagem genérica', () => {
    expect(traduzirErroAuth(erroFirebase('auth/popup-closed-by-user')).mensagem).toBeNull();
    expect(traduzirErroAuth(erroFirebase('auth/qualquer-coisa')).mensagem).toBe('Algo deu errado. Tente novamente.');
  });

  it('EMAIL_EM_USO da API (e-mail não verificado) aponta para o campo e-mail', () => {
    expect(traduzirErroAuth(new ApiError('EMAIL_EM_USO', 'x', 409))).toMatchObject({ campo: 'email', linkEntrar: true });
  });
});

describe('destinoSeguro', () => {
  it('recusa as telas de auth e caminhos externos', () => {
    expect(destinoSeguro('/ranking')).toBe('/ranking');
    expect(destinoSeguro('/entrar')).toBeNull();
    expect(destinoSeguro('/bem-vindo?x=1')).toBeNull();
    expect(destinoSeguro('//evil.com')).toBeNull();
  });

  it('aceita a /pagamento como destino', () => {
    expect(destinoSeguro('/pagamento')).toBe('/pagamento');
  });
});

describe('destinoDaParticipacao', () => {
  it('sem vaga vai para a capa', () => {
    expect(destinoDaParticipacao(null)).toBe('/');
    expect(destinoDaParticipacao(undefined)).toBe('/');
  });

  it('pagamento pendente ou informado vai para a /pagamento', () => {
    expect(destinoDaParticipacao({ pagamentoStatus: 'PENDENTE' })).toBe('/pagamento');
    expect(destinoDaParticipacao({ pagamentoStatus: 'INFORMADO' })).toBe('/pagamento');
  });

  it('pagamento confirmado vai para o desafio', () => {
    expect(destinoDaParticipacao({ pagamentoStatus: 'CONFIRMADO' })).toBe('/desafio');
  });
});
