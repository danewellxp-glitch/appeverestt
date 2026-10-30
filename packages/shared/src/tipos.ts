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
  temFeedback: boolean;
}

export interface AdminParticipantesResposta {
  desafio: { slug: string; nome: string; inscricoesAbertas: boolean; totalVagas: number };
  participantes: AdminParticipante[];
  totalParaRevisar: number;
  /** Quantos tocaram em "Já fiz o pagamento" e esperam a conferência. */
  totalPagamentosInformados: number;
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
  /** Não confirmado, não embaixador e sem check-ins: o admin pode remover a inscrição. */
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

export interface AdminDiaDetalhe extends DiaDetalhe {
  diaId: string | null;
  participanteId: string;
  nomeParticipante: string;
  invalidadoEm: string | null;
  conferidoEm: string | null;
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
