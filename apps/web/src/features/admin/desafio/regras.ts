import { diferencaEmDias, hojeNoFuso, type AdminDesafioConfig } from '@everest/shared';

/**
 * Identificador sugerido a partir do nome: sem acento, minúsculo, palavras ligadas por hífen
 * (ex.: "Desafio 30 Dias — Verão" → "desafio-30-dias-verao"). Até 60 caracteres, sem hífen sobrando.
 */
export function sugerirSlug(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

/** Dias de calendário de hoje (no fuso do desafio) até a data de início; null se a data for inválida. */
export function diasAteOInicio(
  dataInicio: string,
  timezone: string,
  agora: Date = new Date(),
): number | null {
  try {
    return diferencaEmDias(hojeNoFuso(agora, timezone), dataInicio);
  } catch {
    return null;
  }
}

/** Rótulo curto do status: "Começa em 3 dias", "Dia 5 de 30", "Encerrado". */
export function rotuloStatus(
  d: Pick<AdminDesafioConfig, 'status' | 'diaAtual' | 'totalDias' | 'dataInicio' | 'timezone'>,
  agora: Date = new Date(),
): string {
  if (d.status === 'EM_ANDAMENTO') return `Dia ${d.diaAtual ?? '?'} de ${d.totalDias}`;
  if (d.status === 'ENCERRADO') return 'Encerrado';
  const faltam = diasAteOInicio(d.dataInicio, d.timezone, agora);
  if (faltam === null || faltam < 1) return 'Não iniciado';
  return faltam === 1 ? 'Começa amanhã' : `Começa em ${faltam} dias`;
}

/** Só dígitos com DDD → link do WhatsApp (com mensagem opcional já escrita). */
export function linkWhatsappComTexto(numero: string, texto?: string): string {
  const base = `https://wa.me/55${numero.replace(/\D/g, '')}`;
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
}

/** Primeiro nome para mensagens ("Ana Maria Souza" → "Ana"). */
export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}
