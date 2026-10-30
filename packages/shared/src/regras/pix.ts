// BR Code do Pix (padrão EMV do Banco Central): leitura e montagem do QR estático.
// O app usa um QR fixo (o "copia e cola" do banco do embaixador); estas funções validam o
// payload no boot da API e geram payloads de demonstração para dev e testes.
import { LIMITES } from '../constantes';

export interface DadosPix {
  chave: string;
  nome: string;
  cidade: string;
  /** Em reais; null se o payload não traz valor (tag 54). */
  valor: number | null;
  txid: string | null;
  descricao: string | null;
  /** Tag 01 = "11" (estático) ou ausente. */
  estatico: boolean;
}

export interface EntradaPixEstatico {
  chave: string;
  /** Até 25 caracteres. */
  nome: string;
  /** Até 15 caracteres. */
  cidade: string;
  /** Em reais; gravado com 2 casas. */
  valor: number;
  /** [A-Za-z0-9]{1,25}; padrão "***". */
  txid?: string;
  descricao?: string;
}

const GUI_PIX = 'br.gov.bcb.pix';

/** CRC-16/CCITT-FALSE (polinômio 0x1021, início 0xFFFF) em 4 hex maiúsculas. */
export function crc16Pix(texto: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(texto)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Lê uma sequência TLV (id de 2 dígitos + tamanho de 2 dígitos + valor). null se malformada. */
function lerTlv(texto: string): Map<string, string> | null {
  const campos = new Map<string, string>();
  let i = 0;
  while (i < texto.length) {
    const id = texto.slice(i, i + 2);
    const tamanhoTexto = texto.slice(i + 2, i + 4);
    if (!/^\d{2}$/.test(id) || !/^\d{2}$/.test(tamanhoTexto)) return null;
    const tamanho = Number(tamanhoTexto);
    const valor = texto.slice(i + 4, i + 4 + tamanho);
    if (valor.length !== tamanho) return null;
    campos.set(id, valor);
    i += 4 + tamanho;
  }
  return campos;
}

/**
 * Lê o BR Code. Devolve null se estiver malformado, sem a GUI "br.gov.bcb.pix",
 * sem chave, sem nome/cidade, ou com CRC (tag 63) que não confere.
 */
export function lerPix(payload: string): DadosPix | null {
  const texto = payload.trim();
  if (texto.length < 30 || !texto.startsWith('000201')) return null;
  const semCrc = texto.slice(0, -4);
  if (!semCrc.endsWith('6304')) return null;
  if (crc16Pix(semCrc) !== texto.slice(-4).toUpperCase()) return null;
  const campos = lerTlv(texto);
  if (!campos) return null;
  const conta = campos.get('26');
  const dadosConta = conta ? lerTlv(conta) : null;
  if (!dadosConta || dadosConta.get('00')?.toLowerCase() !== GUI_PIX) return null;
  const chave = dadosConta.get('01');
  const nome = campos.get('59');
  const cidade = campos.get('60');
  if (!chave || !nome || !cidade) return null;
  const valorTexto = campos.get('54');
  const valor = valorTexto === undefined ? null : Number(valorTexto);
  if (valor !== null && (!Number.isFinite(valor) || valor <= 0)) return null;
  const adicionais = campos.get('62');
  const txid = adicionais ? (lerTlv(adicionais)?.get('05') ?? null) : null;
  const tipo = campos.get('01');
  return {
    chave,
    nome,
    cidade,
    valor,
    txid,
    descricao: dadosConta.get('02')?.trim() || null,
    estatico: tipo === undefined || tipo === '11',
  };
}

function tlv(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, '0')}${valor}`;
}

/** Remove acentos e caracteres fora do conjunto aceito pelos bancos (nome e cidade em maiúsculas). */
function textoPix(valor: string, max: number): string {
  return valor
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^A-Za-z0-9 .\-@_]/g, '')
    .toUpperCase()
    .trim()
    .slice(0, max);
}

/** Monta o BR Code estático (00, 01=11, 26, 52, 53=986, 54, 58=BR, 59, 60, 62/05, 63). */
export function gerarPixEstatico(entrada: EntradaPixEstatico): string {
  const txid = (entrada.txid ?? '***').replace(/[^A-Za-z0-9*]/g, '').slice(0, LIMITES.pixTxidMax) || '***';
  const conta =
    tlv('00', GUI_PIX) + tlv('01', entrada.chave.trim()) + (entrada.descricao ? tlv('02', entrada.descricao) : '');
  const corpo =
    tlv('00', '01') +
    tlv('01', '11') +
    tlv('26', conta) +
    tlv('52', '0000') +
    tlv('53', '986') +
    tlv('54', entrada.valor.toFixed(2)) +
    tlv('58', 'BR') +
    tlv('59', textoPix(entrada.nome, LIMITES.pixNomeMax)) +
    tlv('60', textoPix(entrada.cidade, LIMITES.pixCidadeMax)) +
    tlv('62', tlv('05', txid)) +
    '6304';
  return corpo + crc16Pix(corpo);
}

/** Reais → centavos sem erro de ponto flutuante (50 → 5000). */
export function valorEmCentavos(valor: number): number {
  return Math.round(valor * 100);
}
