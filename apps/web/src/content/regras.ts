// Textos de /regras (docs/FRONTEND.md §9.8, protótipo #regras). Números vêm de METAS (shared);
// handle, hashtag, vagas e dias vêm do desafio atual (API).
import { METAS } from '@everest/shared';

const numero = new Intl.NumberFormat('pt-BR');
const litros = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

export type IdRegra = 'AGUA' | 'EXERCICIO' | 'LEITURA' | 'FOTOS' | 'STORY' | 'VAGAS' | 'PREMIO' | 'DESEMPATE' | 'CONFERENCIA';

export interface Regra {
  id: IdRegra;
  titulo: string;
  texto: string;
}

/** "Todos os dias": os 5 requisitos. `instagram` e `hashtag` já formatados (ou texto provisório). */
export function regrasDiarias(instagram: string, hashtag: string): Regra[] {
  return [
    {
      id: 'AGUA',
      titulo: 'Água',
      texto: `${litros.format(METAS.aguaMl / 1000)} litros no dia. Marque no app conforme for bebendo.`,
    },
    { id: 'EXERCICIO', titulo: 'Exercício', texto: 'Uma atividade física, qualquer treino.' },
    {
      id: 'LEITURA',
      titulo: 'Leitura',
      texto: `${numero.format(METAS.paginas)} páginas. Informe a quantidade no app.`,
    },
    {
      id: 'FOTOS',
      titulo: 'Prova do dia',
      texto: `${numero.format(METAS.fotos)} fotos: uma da água, uma do treino e uma da leitura.`,
    },
    { id: 'STORY', titulo: 'Story', texto: `Um story marcando ${instagram} e usando ${hashtag}.` },
  ];
}

/** "Vagas e prêmio". */
export function regrasVagasEPremio(totalVagas: number | null, totalDias: number): Regra[] {
  return [
    {
      id: 'VAGAS',
      titulo: totalVagas === null ? 'Vagas limitadas' : `${numero.format(totalVagas)} vagas`,
      texto:
        'Inscrição única por pessoa, por ordem de chegada. O embaixador ocupa uma das vagas e a vaga não volta para a fila.',
    },
    {
      id: 'PREMIO',
      titulo: 'Prêmio',
      texto: `Camiseta de treino, whey e creatina para quem terminar os ${numero.format(totalDias)} dias em 1º no ranking.`,
    },
    {
      id: 'DESEMPATE',
      titulo: 'Desempate',
      texto: 'Melhor sequência, depois sequência atual, depois inscrição mais antiga.',
    },
    {
      id: 'CONFERENCIA',
      titulo: 'Conferência',
      texto: 'O embaixador confere as fotos. Prova falsa, repetida ou de outro dia invalida o dia.',
    },
  ];
}

export const textosRegras = {
  eyebrow: 'Desafio 30 dias Everest',
  titulo: 'Regras',
  notaDiaria:
    'O dia só conta quando os 5 requisitos estão cumpridos. Só o dia de hoje pode ser editado, até 23:59 no horário de Brasília.',
  rodape: 'Foco em evolução de hábito, sem promessa de resultado físico.',
} as const;
