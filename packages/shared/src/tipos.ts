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

export type SituacaoDia = 'CONCLUIDO' | 'INVALIDADO' | 'HOJE' | 'NAO_CONCLUIDO' | 'FUTURO';

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
}

export interface AdminParticipantesResposta {
  desafio: { slug: string; nome: string; inscricoesAbertas: boolean; totalVagas: number };
  participantes: AdminParticipante[];
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
}
