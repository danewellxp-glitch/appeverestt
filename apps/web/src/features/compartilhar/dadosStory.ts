import { ALTITUDE_CUME, METAS, altitudeSimbolica, type MeuProgresso } from '@everest/shared';

/** Tudo o que os modelos de story desenham. Montado só com dados que o app já tem. */
export interface DadosStory {
  numeroDia: number;
  totalDias: number;
  diasConcluidos: number;
  altitude: number;
  altitudeCume: number;
  /** 0 a 1: quanto da subida já foi feito. */
  fracao: number;
  sequenciaAtual: number;
  melhorSequencia: number;
  posicao: number | null;
  aguaMl: number;
  exercicio: boolean;
  paginasLidas: number;
  aguaOk: boolean;
  leituraOk: boolean;
  /** Os 3 hábitos do dia batidos. */
  habitosOk: number;
  /** Um item por dia do desafio: true = dia concluído. */
  trilha: boolean[];
  instagramHandle: string | null;
  hashtag: string | null;
}

export interface EntradaStory {
  progresso: Pick<
    MeuProgresso,
    'totalDias' | 'diasConcluidos' | 'sequenciaAtual' | 'melhorSequencia'
  > & {
    dias?: readonly { numeroDia: number; concluido: boolean }[];
  };
  dia: { numeroDia: number; aguaMl: number; exercicio: boolean; paginasLidas: number };
  posicao?: number | null;
  instagramHandle?: string | null;
  hashtag?: string | null;
}

export function montarDadosStory({
  progresso,
  dia,
  posicao,
  instagramHandle,
  hashtag,
}: EntradaStory): DadosStory {
  const totalDias = Math.max(1, progresso.totalDias);
  const diasConcluidos = Math.max(0, Math.min(progresso.diasConcluidos, totalDias));
  const aguaOk = dia.aguaMl >= METAS.aguaMl;
  const leituraOk = dia.paginasLidas >= METAS.paginas;
  const trilha = Array.from({ length: totalDias }, () => false);
  for (const d of progresso.dias ?? [])
    if (d.concluido && d.numeroDia >= 1 && d.numeroDia <= totalDias) trilha[d.numeroDia - 1] = true;
  return {
    numeroDia: dia.numeroDia,
    totalDias,
    diasConcluidos,
    altitude: altitudeSimbolica(diasConcluidos, totalDias),
    altitudeCume: ALTITUDE_CUME,
    fracao: diasConcluidos / totalDias,
    sequenciaAtual: Math.max(0, progresso.sequenciaAtual),
    melhorSequencia: Math.max(0, progresso.melhorSequencia),
    posicao: posicao ?? null,
    aguaMl: Math.max(0, dia.aguaMl),
    exercicio: dia.exercicio,
    paginasLidas: Math.max(0, dia.paginasLidas),
    aguaOk,
    leituraOk,
    habitosOk: Number(aguaOk) + Number(dia.exercicio) + Number(leituraOk),
    trilha,
    instagramHandle: instagramHandle?.replace(/^@/, '') || null,
    hashtag: hashtag?.replace(/^#/, '') || null,
  };
}

/** Texto do rodapé e do botão copiar: "@handle #hashtag". */
export function textoMarcacao(d: Pick<DadosStory, 'instagramHandle' | 'hashtag'>): string | null {
  const partes = [
    d.instagramHandle && `@${d.instagramHandle}`,
    d.hashtag && `#${d.hashtag}`,
  ].filter(Boolean);
  return partes.length ? partes.join(' ') : null;
}

export function nomeArquivoStory(d: Pick<DadosStory, 'numeroDia'>, modelo: string): string {
  return `everest-dia-${d.numeroDia}-${modelo}.png`;
}
