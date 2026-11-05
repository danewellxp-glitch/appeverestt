// Textos de /regras (docs/FRONTEND.md §9.8, protótipo #regras). Números vêm de METAS (shared);
// handle, hashtag, vagas e dias vêm do desafio atual (API).
import { METAS } from '@everest/shared';
import { formatarReais } from '../lib/moeda';

const numero = new Intl.NumberFormat('pt-BR');
const litros = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

export type IdRegra =
  | 'AGUA'
  | 'EXERCICIO'
  | 'LEITURA'
  | 'FOTOS'
  | 'STORY'
  | 'VAGAS'
  | 'PAGAMENTO'
  | 'PREMIO'
  | 'DESEMPATE'
  | 'CONFERENCIA';

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
      texto: `${numero.format(METAS.fotos)} fotos: uma da água, uma do treino e uma da leitura. A do treino aparece para a turma na aba Treinos (dá para esconder); água e leitura ficam só com o embaixador.`,
    },
    { id: 'STORY', titulo: 'Story', texto: `Um story marcando ${instagram} e usando ${hashtag}.` },
  ];
}

/**
 * "Vagas e prêmio". `valorCentavos` null (desafio não carregado ou Pix não configurado neste
 * ambiente) omite a regra do pagamento, como a capa omite o preço.
 */
export function regrasVagasEPremio(totalVagas: number | null, _totalDias: number, valorCentavos: number | null = null): Regra[] {
  const pagamento: Regra[] =
    valorCentavos === null
      ? []
      : [
          {
            id: 'PAGAMENTO',
            titulo: 'Inscrição',
            texto: `Inscrição de ${formatarReais(valorCentavos)} via Pix. O acesso é liberado depois que o pagamento é confirmado pelo embaixador.`,
          },
        ];
  return [
    {
      id: 'VAGAS',
      titulo: totalVagas === null ? 'Vagas limitadas' : `${numero.format(totalVagas)} vagas`,
      texto:
        'Inscrição única por pessoa, por ordem de chegada. O embaixador ocupa uma das vagas. A vaga só volta para a fila se a inscrição não for paga.',
    },
    ...pagamento,
    {
      id: 'PREMIO',
      titulo: 'Prêmio',
      texto: 'Haverá uma premiação.',
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

/**
 * Vídeo do TT explicando o desafio: topo de /regras e seção "O desafio" da landing.
 * url: link do YouTube (vídeo, Shorts ou youtu.be; pode ser "não listado") ou um arquivo de vídeo
 * servido pelo app (ex.: '/video/desafio.mp4' em apps/web/public/video/). Vazio = aviso "Vídeo em
 * breve" em /regras (a landing esconde o bloco).
 * formato: 'vertical' (gravado no celular, 9:16) ou 'horizontal' (16:9).
 * TODO_DECISAO(VIDEO): colar o link do vídeo do TT explicando o desafio quando estiver gravado.
 */
export const videoDesafio: { url: string; formato: 'vertical' | 'horizontal' } = {
  url: '',
  formato: 'vertical',
};

export const textosRegras = {
  eyebrow: 'Desafio 30 dias Everest',
  // Todos os links dizem "Regras" (Perfil, home, landing); "Como funciona" é a seção da landing.
  titulo: 'Regras',
  notaDiaria:
    'O dia só conta com os 3 hábitos feitos e comprovados, com as fotos e o story. Só o dia de hoje pode ser editado, até 23:59 no horário de Brasília.',
  rodape: 'Foco em evolução de hábito, sem promessa de resultado físico.',
} as const;
