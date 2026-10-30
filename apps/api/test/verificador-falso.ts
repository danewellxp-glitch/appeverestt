import { ErroApp } from '../src/common/erros';
import type { DadosToken, VerificadorFirebase } from '../src/modules/auth/verificador-firebase';

/**
 * Verificador dos testes. Aceita tokens no formato
 * `teste:<uid>:<email>:<verificado>[:<segundos desde o login>[:<nome>]]`.
 */
export class VerificadorFalso implements VerificadorFirebase {
  readonly excluidos: string[] = [];

  verificar(idToken: string): Promise<DadosToken> {
    const [prefixo, uid, email, verificado, segundosAtras, ...nome] = idToken.split(':');
    if (prefixo !== 'teste' || !uid || email === undefined || (verificado !== 'true' && verificado !== 'false')) {
      return Promise.reject(new ErroApp('NAO_AUTENTICADO', 'Sua sessão expirou. Entre de novo.'));
    }
    const atras = segundosAtras ? Number(segundosAtras) : 0;
    return Promise.resolve({
      uid,
      email: email ? email.toLowerCase() : null,
      emailVerificado: verificado === 'true',
      nome: nome.length > 0 ? nome.join(':') : null,
      foto: null,
      provedor: 'password',
      authTime: Math.floor(Date.now() / 1000) - atras,
    });
  }

  excluir(uid: string): Promise<void> {
    this.excluidos.push(uid);
    return Promise.resolve();
  }
}

export function tokenTeste(
  uid: string,
  email: string,
  opcoes: { verificado?: boolean; segundosAtras?: number; nome?: string } = {},
): string {
  const partes = ['teste', uid, email, String(opcoes.verificado ?? true), String(opcoes.segundosAtras ?? 0)];
  if (opcoes.nome) partes.push(opcoes.nome);
  return partes.join(':');
}
