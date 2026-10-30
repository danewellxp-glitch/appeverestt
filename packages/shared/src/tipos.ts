// Formatos de resposta da API, compartilhados com o front.
import type { Requisito, TipoFoto } from './constantes';
import type { StatusDesafio } from './regras/diaAtual';
import type { ItemRankingPosicionado } from './regras/ranking';

export type Papel = 'USUARIO' | 'ADMIN';
export type StatusFoto = 'PENDENTE' | 'ENVIADA' | 'CONFIRMADA' | 'REJEITADA';

export interface ParticipacaoResumo {
  participanteId: string;
  desafioId: string;
  desafioSlug: string;
  vagaNumero: number | null;
  ehEmbaixador: boolean;
  dataInscricao: string;
}

export interface UsuarioMe {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  /** Foto do Google (pode ser null). */
  fotoUrl: string | null;
  /** Aceitou os termos e a conta não foi excluída. Falso = precisa passar pela /bem-vindo. */
  perfilCompleto: boolean;
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
  vagaNumero: number | null;
  ehEmbaixador: boolean;
  dataInscricao: string;
  diasConcluidos: number;
  diasInvalidados: number;
  /** Dias concluídos (não invalidados) que o embaixador ainda não aprovou. */
  paraRevisar: number;
}

export interface AdminParticipantesResposta {
  desafio: { slug: string; nome: string; inscricoesAbertas: boolean; totalVagas: number };
  participantes: AdminParticipante[];
  totalParaRevisar: number;
}

export interface AdminParticipanteDetalhe {
  participante: AdminParticipante;
  progresso: MeuProgresso;
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
