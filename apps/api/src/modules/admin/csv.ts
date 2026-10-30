// Exportação CSV dos participantes para o embaixador (abre direto no Excel em pt-BR).
// Regras: UTF-8 com BOM, separador ";", quebra CRLF, aspas duplicadas dentro de células,
// proteção contra injeção de fórmula ("'" antes de = + - @ TAB CR), datas no fuso do desafio.
import type { StatusPagamento } from '@everest/shared';

export type Celula = string | number | boolean | null | undefined;

const BOM = '﻿';
const SEPARADOR = ';';
const QUEBRA = '\r\n';
const INICIO_DE_FORMULA = /^[=+\-@\t\r]/;

/** Escapa uma célula. Texto que o Excel leria como fórmula ganha um apóstrofo na frente. */
export function celulaCsv(valor: Celula): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'boolean') return valor ? 'sim' : 'não';
  if (typeof valor === 'number') return Number.isFinite(valor) ? String(valor) : '';
  let texto = valor;
  if (INICIO_DE_FORMULA.test(texto)) texto = `'${texto}`;
  if (/[;"\r\n]/.test(texto)) texto = `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

/** Documento CSV completo (BOM + cabeçalho + linhas, CRLF no fim de cada linha). */
export function montarCsv(cabecalho: readonly string[], linhas: readonly (readonly Celula[])[]): string {
  const corpo = [cabecalho, ...linhas].map((l) => l.map(celulaCsv).join(SEPARADOR) + QUEBRA).join('');
  return BOM + corpo;
}

/** '11987654321' → '(11) 98765-4321'; '1187654321' → '(11) 8765-4321'; outro formato fica como está. */
export function formatarWhatsapp(digitos: string | null): string | null {
  if (!digitos) return null;
  const m = /^(\d{2})(\d{4,5})(\d{4})$/.exec(digitos);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : digitos;
}

/** `@db.Date` (meia-noite UTC) → 'dd/mm/aaaa'. */
export function formatarData(d: Date | null): string | null {
  if (!d) return null;
  const [ano, mes, dia] = d.toISOString().slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Instante → 'dd/mm/aaaa HH:mm' no fuso do desafio. */
export function formatarDataHora(d: Date | null, timezone: string): string | null {
  if (!d) return null;
  const partes = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const p = (tipo: Intl.DateTimeFormatPartTypes): string => partes.find((x) => x.type === tipo)?.value ?? '';
  return `${p('day')}/${p('month')}/${p('year')} ${p('hour')}:${p('minute')}`;
}

const ROTULO_PAGAMENTO: Record<StatusPagamento, string> = {
  PENDENTE: 'pendente',
  INFORMADO: 'informado',
  CONFIRMADO: 'confirmado',
};

export const CABECALHO_PARTICIPANTES = [
  'Vaga',
  'Nome',
  'E-mail',
  'Instagram',
  'WhatsApp',
  'Nascimento',
  'Bairro',
  'Cidade',
  'UF',
  'Inscrição',
  'Pagamento',
  'Informado em',
  'Confirmado em',
  'Dias concluídos',
  'Dias invalidados',
  'Marketing',
  'Nota do feedback',
  'Autoriza divulgação',
  'Conta excluída',
] as const;

export interface LinhaParticipanteCsv {
  vagaNumero: number | null;
  nome: string;
  email: string;
  /** Sem "@". */
  instagram: string | null;
  /** Só dígitos com DDD. */
  whatsapp: string | null;
  dataNascimento: Date | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  dataInscricao: Date;
  pagamentoStatus: StatusPagamento;
  pagamentoInformadoEm: Date | null;
  pagamentoConfirmadoEm: Date | null;
  diasConcluidos: number;
  diasInvalidados: number;
  aceitouMarketing: boolean;
  notaFeedback: number | null;
  autorizaDivulgacao: boolean | null;
  contaExcluida: boolean;
}

export function csvParticipantes(linhas: readonly LinhaParticipanteCsv[], timezone: string): string {
  return montarCsv(
    CABECALHO_PARTICIPANTES,
    linhas.map((l) => [
      l.vagaNumero,
      l.nome,
      // Conta excluída: o e-mail foi trocado por um endereço técnico; não vale exportar.
      l.contaExcluida ? null : l.email,
      l.instagram,
      formatarWhatsapp(l.whatsapp),
      formatarData(l.dataNascimento),
      l.bairro,
      l.cidade,
      l.uf,
      formatarDataHora(l.dataInscricao, timezone),
      ROTULO_PAGAMENTO[l.pagamentoStatus],
      formatarDataHora(l.pagamentoInformadoEm, timezone),
      formatarDataHora(l.pagamentoConfirmadoEm, timezone),
      l.diasConcluidos,
      l.diasInvalidados,
      l.aceitouMarketing,
      l.notaFeedback,
      l.autorizaDivulgacao,
      l.contaExcluida,
    ]),
  );
}

/** Nome de arquivo seguro para o Content-Disposition. */
export function nomeArquivoCsv(slug: string): string {
  const limpo = slug.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80) || 'desafio';
  return `participantes-${limpo}.csv`;
}
