import type { PayloadPush } from '../tipos';
import type { AcaoRapida } from './acaoRapida';

/**
 * Lembretes automáticos (R22), em horas cheias no fuso do desafio. Só enquanto o desafio está
 * EM_ANDAMENTO e só para quem ativou o push.
 */
export const LEMBRETES_PUSH: readonly { acao: AcaoRapida; horas: readonly number[] }[] = [
  { acao: 'agua', horas: [10, 14, 17] },
  { acao: 'treino', horas: [18] },
  { acao: 'leitura', horas: [21] },
];

/** Padrão cron (minuto hora * * *) de um lembrete. */
export function cronDoLembrete(hora: number): string {
  return `0 ${hora} * * *`;
}

export const MODELOS_AVISO_PUSH = ['agua', 'treino', 'leitura', 'livre'] as const;
export type ModeloAvisoPush = (typeof MODELOS_AVISO_PUSH)[number];

/** Título, texto e rótulo do botão de ação de cada lembrete/aviso pronto. */
export const MODELOS_AVISO: Record<AcaoRapida, { titulo: string; corpo: string; botao: string }> = {
  agua: {
    titulo: 'Hora da água 💧',
    corpo: 'Bebe um copo agora e registra. A meta do dia é 3 litros.',
    botao: '+250 ml',
  },
  treino: {
    titulo: 'Bora treinar 💪',
    corpo: 'O treino de hoje já foi? Marca aqui quando terminar.',
    botao: 'Treino feito',
  },
  leitura: {
    titulo: '10 páginas antes de dormir 📖',
    corpo: 'Fecha o dia com a leitura e marca no desafio.',
    botao: 'Leitura feita',
  },
};

export const LIMITES_AVISO_PUSH = { tituloMax: 60, corpoMax: 160 } as const;

/**
 * Cutucada (R23): push para quem ainda não fechou o dia. Cutucadas do mesmo remetente se
 * substituem (tag); de remetentes diferentes empilham.
 */
export function modeloCutucada(nomeRemetente: string, dia: number, remetenteId: string): PayloadPush {
  const nome = nomeRemetente.trim().slice(0, LIMITES_AVISO_PUSH.tituloMax - ' te cutucou 👋'.length) || 'Alguém';
  return {
    titulo: `${nome} te cutucou 👋`,
    corpo: `Bora fechar o dia ${dia}!`,
    url: '/hoje',
    tag: `cutucada-${remetenteId}`,
  };
}
