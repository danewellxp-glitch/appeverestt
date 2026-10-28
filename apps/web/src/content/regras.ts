// Textos de /regras. Números vêm de METAS/TIPOS_FOTO (shared); handle, hashtag,
// vagas e datas vêm do desafio atual (API).
import { METAS, TIPOS_FOTO, type TipoFoto } from '@everest/shared';

const numero = new Intl.NumberFormat('pt-BR');
const litros = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

export const NOME_FOTO: Record<TipoFoto, string> = {
  AGUA: 'água',
  EXERCICIO: 'exercício',
  LEITURA: 'leitura',
};

function listaNatural(itens: readonly string[]): string {
  if (itens.length <= 1) return itens.join('');
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1] ?? ''}`;
}

export interface RequisitoDiario {
  id: 'AGUA' | 'EXERCICIO' | 'LEITURA' | 'FOTOS' | 'STORY';
  nome: string;
  meta: string;
  detalhe: string;
}

/** Tabela dos requisitos diários. `instagram` e `hashtag` já formatados (ou texto provisório). */
export function requisitosDiarios(instagram: string, hashtag: string): RequisitoDiario[] {
  return [
    {
      id: 'AGUA',
      nome: 'Água',
      meta: `≥ ${litros.format(METAS.aguaMl / 1000)} L`,
      detalhe: `Pelo menos ${numero.format(METAS.aguaMl)} ml no dia.`,
    },
    {
      id: 'EXERCICIO',
      nome: 'Exercício físico',
      meta: 'Sim',
      detalhe: 'Qualquer atividade física feita no dia.',
    },
    {
      id: 'LEITURA',
      nome: 'Leitura',
      meta: `≥ ${numero.format(METAS.paginas)} páginas`,
      detalhe: `Pelo menos ${numero.format(METAS.paginas)} páginas lidas no dia.`,
    },
    {
      id: 'FOTOS',
      nome: 'Fotos de prova',
      meta: `${numero.format(METAS.fotos)} fotos`,
      detalhe: `Uma de cada: ${listaNatural(TIPOS_FOTO.map((t) => NOME_FOTO[t]))}.`,
    },
    {
      id: 'STORY',
      nome: 'Story no Instagram',
      meta: 'Postado',
      detalhe: `Marcando ${instagram} e ${hashtag}.`,
    },
  ];
}

export const regras = {
  titulo: 'Regras do desafio',
  introducao:
    'Durante o desafio, cada dia só conta como concluído quando você cumpre todos os requisitos abaixo e registra tudo no app.',
  diaConcluido: 'O dia fecha automaticamente quando todos os requisitos são cumpridos.',
  edicao: {
    titulo: 'Só o dia de hoje',
    itens: [
      'Você só pode registrar e editar o dia de hoje. Dias anteriores ficam só para leitura e dias futuros ficam bloqueados.',
      'O "hoje" segue o horário de Brasília (fuso de São Paulo): o dia vira à meia-noite, mesmo que você esteja em outro fuso.',
    ],
  },
  vagas: {
    titulo: 'Vagas',
    texto: (totalVagas: number | null) =>
      `${totalVagas === null ? 'As vagas são limitadas e' : `São ${numero.format(totalVagas)} vagas,`} preenchidas por ordem de inscrição. O embaixador do desafio também participa e ocupa uma das vagas.`,
    itens: [
      'A vaga é sua até o fim do desafio: não existe desistência que libere a vaga para outra pessoa.',
      'As inscrições ficam abertas enquanto houver vagas e o embaixador mantiver as inscrições liberadas.',
    ],
  },
  premiacao: {
    titulo: 'Premiação',
    texto: (totalDias: string) =>
      `Vence quem tiver mais dias concluídos (e não invalidados) ao fim dos ${totalDias} dias. O prêmio vai para o 1º colocado do ranking final.`,
  },
  desempate: {
    titulo: 'Desempate',
    introducao: 'Se houver empate em dias concluídos, vale, nesta ordem:',
    criterios: [
      'Maior melhor sequência (mais dias concluídos seguidos).',
      'Maior sequência atual.',
      'Inscrição mais antiga.',
    ],
  },
  conferencia: {
    titulo: 'Conferência pelo embaixador',
    texto:
      'O embaixador confere as fotos de prova. Se uma prova estiver irregular (foto repetida, de outro dia ou que não mostra o requisito), ele pode invalidar o dia, que deixa de contar no ranking.',
  },
  datas: {
    titulo: 'Datas',
  },
} as const;
