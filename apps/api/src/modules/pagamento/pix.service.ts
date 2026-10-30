import { Injectable } from '@nestjs/common';
import { lerPix, valorEmCentavos, type InscricaoInfo, type PixPagamento } from '@everest/shared';
import { AppConfig } from '../../config/app-config.service';

/** Monta o Pix da inscrição a partir do BR Code. null se ausente, inválido ou sem valor. */
export function montarPix(payload: string | undefined): PixPagamento | null {
  if (!payload) return null;
  const copiaECola = payload.trim();
  const dados = lerPix(copiaECola);
  if (!dados || dados.valor === null) return null;
  return {
    copiaECola,
    chave: dados.chave,
    nomeRecebedor: dados.nome,
    valorCentavos: valorEmCentavos(dados.valor),
  };
}

/**
 * Pix fixo da inscrição (X12). O payload vem de PIX_COPIA_E_COLA (já validado no boot pelo `env.ts`)
 * e é lido uma vez só. Fora de produção pode faltar: aí `pix` e `inscricao` são null.
 */
@Injectable()
export class PixService {
  readonly pix: PixPagamento | null;

  constructor(config: AppConfig) {
    this.pix = montarPix(config.get('PIX_COPIA_E_COLA'));
  }

  /** Preço público (capa e regras); null esconde o preço. */
  get inscricao(): InscricaoInfo | null {
    return this.pix ? { valorCentavos: this.pix.valorCentavos } : null;
  }
}
