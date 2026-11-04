// Formatos de resposta da API, compartilhados com o front.
import type { Requisito, TipoFoto } from './constantes';
import type { StatusDesafio } from './regras/diaAtual';
import type { ItemRankingPosicionado } from './regras/ranking';

export type Papel = 'USUARIO' | 'ADMIN';
export type StatusFoto = 'PENDENTE' | 'ENVIADA' | 'CONFIRMADA' | 'REJEITADA';
/**
 * Pagamento da inscrição (Pix manual, X12): PENDENTE = vaga reservada, sem aviso;
 * INFORMADO = tocou em "Já fiz o pagamento"; CONFIRMADO = o embaixador conferiu e liberou.
 */
export type StatusPagamento = 'PENDENTE' | 'INFORMADO' | 'CONFIRMADO';

export interface ParticipacaoResumo {
  participanteId: string;
  desafioId: string;
  desafioSlug: string;
  vagaNumero: number | null;
  ehEmbaixador: boolean;
  dataInscricao: string;
  pagamentoStatus: StatusPagamento;
}

export interface UsuarioMe {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  /** Foto do Google (pode ser null). */
  fotoUrl: string | null;
  /** Aceitou os termos e preencheu todos os dados obrigatórios. Falso = precisa passar pela /bem-vindo. */
  perfilCompleto: boolean;
  /** Dados de cadastro (Q7). null enquanto não preenchidos. */
  instagram: string | null;
  /** 'YYYY-MM-DD' */
  dataNascimento: string | null;
  /** Só dígitos com DDD, sem +55 (ex.: '11987654321'). */
  whatsapp: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  /** Consentimento separado para marketing (X9). */
  aceitouMarketing: boolean;
}

export interface MeResposta {
  usuario: UsuarioMe;
  participacao: ParticipacaoResumo | null;
}

export interface DesafioAtual {
  id: string;
  nome: string;
  slug: string;
  dataInicio: string;
  dataFim: string;
  totalDias: number;
  status: StatusDesafio;
  diaAtual: number | null;
  diasParaInicio: number;
  totalVagas: number;
  vagasDisponiveis: number;
  inscricoesAbertas: boolean;
  instagramHandle: string;
  hashtag: string;
  timezone: string;
  /** Valor da inscrição; null quando o Pix não está configurado neste ambiente. */
  inscricao: InscricaoInfo | null;
}

export interface InscricaoInfo {
  valorCentavos: number;
}

export interface InscricaoResposta {
  participacao: ParticipacaoResumo;
  criada: boolean;
}

/** `AGUARDANDO_CONFERENCIA` só aparece nas respostas de admin (dia concluído ainda não aprovado). */
export type SituacaoDia =
  | 'CONCLUIDO'
  | 'INVALIDADO'
  | 'HOJE'
  | 'NAO_CONCLUIDO'
  | 'FUTURO'
  | 'AGUARDANDO_CONFERENCIA';

export interface DiaResumo {
  numeroDia: number;
  data: string;
  situacao: SituacaoDia;
  concluido: boolean;
  invalidado: boolean;
}

export interface MeuProgresso {
  diaAtual: number | null;
  status: StatusDesafio;
  totalDias: number;
  dias: DiaResumo[];
  diasConcluidos: number;
  evolucao: number;
  melhorSequencia: number;
  sequenciaAtual: number;
}

export interface FotoDia {
  id: string;
  tipo: TipoFoto;
  status: StatusFoto;
  thumbUrl: string | null;
  url: string | null;
}

export interface DiaDetalhe {
  numeroDia: number;
  data: string;
  aguaMl: number;
  exercicio: boolean;
  paginasLidas: number;
  storyPostado: boolean;
  concluido: boolean;
  invalidado: boolean;
  motivoInvalidacao: string | null;
  editavel: boolean;
  requisitosPendentes: Requisito[];
  fotos: FotoDia[];
}

export interface UploadUrlResposta {
  fotoId: string;
  uploadUrl: string;
  headers: Record<string, string>;
}

export interface RankingResposta {
  itens: ItemRankingPosicionado[];
  minhaPosicao: number | null;
}

export interface AdminParticipante {
  participanteId: string;
  usuarioId: string;
  nome: string;
  email: string;
  /** Sem "@". */
  instagram: string | null;
  /** Só dígitos com DDD. */
  whatsapp: string | null;
  vagaNumero: number | null;
  ehEmbaixador: boolean;
  dataInscricao: string;
  pagamentoStatus: StatusPagamento;
  pagamentoInformadoEm: string | null;
  pagamentoConfirmadoEm: string | null;
  contaExcluida: boolean;
  diasConcluidos: number;
  diasInvalidados: number;
  /** Dias concluídos (não invalidados) que o embaixador ainda não aprovou. */
  paraRevisar: number;
  /**
   * Dias para revisar (mesmo critério de `paraRevisar`) com alguma foto parecida com outra do desafio
   * (X20), em ordem crescente. Só sinal para a conferência manual: não muda nada sozinho.
   */
  diasFotoParecida: number[];
  temFeedback: boolean;
}

export interface AdminParticipantesResposta {
  desafio: { slug: string; nome: string; inscricoesAbertas: boolean; totalVagas: number };
  participantes: AdminParticipante[];
  totalParaRevisar: number;
  /** Quantos tocaram em "Já fiz o pagamento" e esperam a conferência. */
  totalPagamentosInformados: number;
}

/** Configuração completa de um desafio (painel do admin: GET/POST/PATCH /admin/desafios). */
export interface AdminDesafioConfig {
  id: string;
  slug: string;
  nome: string;
  /** 'YYYY-MM-DD' no fuso do desafio. */
  dataInicio: string;
  /** 'YYYY-MM-DD': último dia (dataInicio + totalDias - 1). */
  dataFim: string;
  totalDias: number;
  totalVagas: number;
  /** Sem "@". */
  instagramHandle: string;
  /** Sem "#". */
  hashtag: string;
  timezone: string;
  inscricoesAbertas: boolean;
  embaixadorOcupaVaga: boolean;
  /** O desafio que aparece no app (só um por vez). */
  ativo: boolean;
  status: StatusDesafio;
  diaAtual: number | null;
  /** Inscrições que ocupam vaga (vagaNumero preenchido). */
  vagasOcupadas: number;
  totalInscritos: number;
  /** Já existe check-in: data de início e total de dias não podem mais mudar. */
  temCheckins: boolean;
  criadoEm: string;
}

/** GET /admin/desafios: todos os desafios, o ativo primeiro e depois do mais novo ao mais antigo. */
export interface AdminDesafiosResposta {
  desafios: AdminDesafioConfig[];
}

/** Um dia do desafio na série de adesão (dia 1 até o dia atual). */
export interface MetricaDia {
  dia: number;
  /** 'YYYY-MM-DD' no fuso do desafio. */
  data: string;
  /** Participantes com pagamento confirmado (podem fazer check-in). */
  ativos: number;
  /** Abriram o dia (qualquer registro, mesmo parcial). */
  comCheckin: number;
  /** Concluíram os 5 requisitos e não foram invalidados. */
  concluidos: number;
  invalidados: number;
}

/**
 * GET /admin/desafios/:slug/metricas: indicadores do painel ("Power BI" do embaixador).
 * Contagens de participantes consideram só inscrições do desafio; o embaixador entra nos ativos,
 * mas não na receita (não paga a inscrição).
 */
export interface AdminMetricas {
  geradoEm: string;
  desafio: {
    slug: string;
    nome: string;
    dataInicio: string;
    dataFim: string;
    totalDias: number;
    diaAtual: number | null;
    status: StatusDesafio;
    totalVagas: number;
    /** null quando o Pix não está configurado. */
    valorInscricaoCentavos: number | null;
  };
  /** Funil de conversão, do topo para o fundo. */
  funil: {
    /** Contas no app (não excluídas), com ou sem inscrição. */
    contas: number;
    /** Contas com o cadastro completo (dados + termos). */
    cadastrosCompletos: number;
    /** Vaga reservada, qualquer status de pagamento. */
    inscritos: number;
    /** Passaram do aviso de pagamento (INFORMADO + CONFIRMADO, isentos inclusive): o funil nunca sobe. */
    informaram: number;
    /** Pagamento confirmado (inclui o embaixador). */
    confirmados: number;
  };
  vagas: { total: number; ocupadas: number; livres: number };
  receita: {
    /** Confirmados pagantes × valor da inscrição. */
    confirmadaCentavos: number;
    /** INFORMADO × valor: falta o embaixador conferir. */
    aguardandoConferenciaCentavos: number;
    /** PENDENTE × valor: vaga reservada sem aviso de pagamento. */
    pendenteCentavos: number;
  };
  pagamentos: {
    aguardandoConferencia: number;
    /** Média de horas entre "Já fiz o pagamento" e a confirmação (null sem dados). */
    horasMediasAteConfirmar: number | null;
    /** Há quantas horas espera o aviso mais antigo ainda não conferido (null se não há fila). */
    horasEsperaMaisAntiga: number | null;
  };
  /** Por data no fuso do desafio, desde a primeira inscrição até hoje. Valores do dia (não acumulados). */
  inscricoesPorData: { data: string; inscricoes: number; confirmacoes: number }[];
  /** Dia 1 até o dia atual (vazio antes do início). */
  adesaoPorDia: MetricaDia[];
  /** Quantos check-ins (dias abertos, não invalidados) cumpriram cada requisito. */
  requisitos: { requisito: Requisito; cumpridos: number; total: number }[];
  /** "Invictos": quantos ativos concluíram TODOS os dias de 1 até n (n = 1..dia atual). */
  invictosPorDia: { dia: number; participantes: number }[];
  /** Quantos ativos têm 0, 1, 2… dias concluídos (de 0 até o dia atual). */
  distribuicaoDiasConcluidos: { dias: number; participantes: number }[];
  /** Hora (0–23, fuso do desafio) da última atualização de cada check-in. 24 posições. */
  checkinsPorHora: { hora: number; checkins: number }[];
  conferencia: { concluidos: number; conferidos: number; aguardando: number; invalidados: number };
  /**
   * Ativos que não concluíram nenhum dos 2 dias anteriores ao atual (candidatos a um empurrão no
   * WhatsApp). Vazio nos dias 1 e 2. Ordenado por mais dias sem concluir.
   */
  emRisco: {
    participanteId: string;
    nome: string;
    /** Só dígitos com DDD. */
    whatsapp: string | null;
    /** Dias seguidos sem concluir, contando para trás a partir de ontem. */
    diasSemConcluir: number;
    diasConcluidos: number;
    ultimoDiaConcluido: number | null;
  }[];
  perfil: {
    /** Inscritos considerados (ativos + pendentes). */
    total: number;
    /** Faixas: '18–24', '25–34', '35–44', '45–54', '55+', 'Sem data'. */
    faixasEtarias: { faixa: string; participantes: number }[];
    /** Top 10 cidades. */
    cidades: { cidade: string; uf: string | null; participantes: number }[];
    aceitaramMarketing: number;
  };
  /** Somatórios dos dias não invalidados. */
  totais: {
    aguaLitros: number;
    paginasLidas: number;
    treinos: number;
    stories: number;
    fotos: number;
    diasConcluidos: number;
  };
  feedback: {
    respostas: number;
    /** 1 a 5 (null sem respostas). */
    notaMedia: number | null;
    /** Notas 1..5. */
    distribuicao: { nota: number; respostas: number }[];
    autorizamDivulgacao: number;
  };
}

/** Dados de cadastro (Q7) que só o admin vê. */
export interface AdminDadosCadastro {
  email: string;
  instagram: string | null;
  whatsapp: string | null;
  /** 'YYYY-MM-DD' */
  dataNascimento: string | null;
  idade: number | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  aceitouTermosEm: string | null;
  aceitouMarketingEm: string | null;
  criadoEm: string;
  excluidoEm: string | null;
}

export interface AdminPagamento {
  status: StatusPagamento;
  informadoEm: string | null;
  confirmadoEm: string | null;
}

export interface AdminParticipanteDetalhe {
  participante: AdminParticipante;
  dados: AdminDadosCadastro;
  pagamento: AdminPagamento;
  feedback: Feedback | null;
  progresso: MeuProgresso;
  /** Não é do embaixador e não tem check-ins (mesmo com pagamento confirmado): o admin pode remover a inscrição. */
  removivel: boolean;
}

export interface PixPagamento {
  /** BR Code completo ("copia e cola"). */
  copiaECola: string;
  chave: string;
  nomeRecebedor: string;
  valorCentavos: number;
}

export interface PagamentoResposta {
  status: StatusPagamento;
  vagaNumero: number | null;
  informadoEm: string | null;
  confirmadoEm: string | null;
  /** null = pagamento não configurado neste ambiente. */
  pix: PixPagamento | null;
  /** @ do desafio, sem "@" (para dúvidas). */
  contatoInstagram: string;
}

export interface Feedback {
  /** 1..5 */
  nota: number;
  oQueAchou: string;
  oQueMudou: string;
  autorizaDivulgacao: boolean;
  atualizadoEm: string;
}

export interface FeedbackResposta {
  feedback: Feedback | null;
}

export interface AdminFeedback extends Feedback {
  participanteId: string;
  nome: string;
  instagram: string | null;
  vagaNumero: number | null;
}

export interface AdminFeedbacksResposta {
  feedbacks: AdminFeedback[];
  total: number;
  /** Média das notas com 1 casa; null sem feedbacks. */
  media: number | null;
}

export interface ConfirmarFotoResposta {
  fotoId: string;
  status: StatusFoto;
}

export interface InvalidacaoResposta {
  diaId: string;
  invalidado: boolean;
  concluido: boolean;
  motivoInvalidacao: string | null;
}

/** Outra foto do desafio (de qualquer participante) quase igual a esta, pelo hash perceptual (X20). */
export interface FotoParecida {
  participanteId: string;
  /** Nome completo de quem enviou a outra foto. */
  nome: string;
  numeroDia: number;
  tipo: TipoFoto;
  /** A outra foto é do mesmo participante (outro dia ou outro tipo). */
  mesmaPessoa: boolean;
}

/** Foto do dia na tela do embaixador. A rota do participante nunca devolve `parecida`. */
export interface AdminFotoDia extends FotoDia {
  /** A mais parecida (até 5 de 64 bits de diferença) entre as enviadas no desafio, ou null. */
  parecida: FotoParecida | null;
}

export interface AdminDiaDetalhe extends DiaDetalhe {
  diaId: string | null;
  participanteId: string;
  nomeParticipante: string;
  invalidadoEm: string | null;
  conferidoEm: string | null;
  fotos: AdminFotoDia[];
}

export interface ConferenciaResposta {
  diaId: string;
  conferidoEm: string | null;
}

export interface PessoaFeed {
  nomeExibicao: string;
  iniciais: string;
  fotoUrl: string | null;
}

export interface FeedResposta {
  diaAtual: number | null;
  /** Dias concluídos e não invalidados no diaAtual. */
  fecharamHoje: number;
  /** Até 4, mais recentes primeiro. */
  avataresHoje: PessoaFeed[];
  maiorSequenciaAtiva: { nomeExibicao: string; dias: number } | null;
  vagasOcupadas: number;
  totalVagas: number;
}
