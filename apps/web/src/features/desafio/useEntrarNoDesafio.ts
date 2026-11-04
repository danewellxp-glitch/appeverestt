import type { DesafioAtual, MeResposta, ParticipacaoResumo, StatusPagamento } from '@everest/shared';
import { useNavigate } from 'react-router';
import { ehApiError } from '../../lib/api';
import { useDesafioAtual, useMe } from '../../lib/queries';
import { destinoDaParticipacao } from '../auth/sessao';
import { useInscrever } from './useInscrever';

/** Motivo que impede a inscrição agora (null = pode entrar). */
export function bloqueioDaInscricao(desafio: DesafioAtual): string | null {
  if (desafio.status === 'ENCERRADO') return 'Desafio encerrado';
  if (!desafio.inscricoesAbertas) return 'Inscrições encerradas';
  if (desafio.vagasDisponiveis <= 0) return 'Vagas esgotadas';
  return null;
}

/** Rótulo do botão/link para quem já tem vaga: o próximo passo conforme o pagamento. */
export const PROXIMO_PASSO: Record<StatusPagamento, string> = {
  PENDENTE: 'Concluir pagamento',
  INFORMADO: 'Pagamento em análise',
  CONFIRMADO: 'Ir para o desafio',
};

/**
 * O que o "Quero participar" mostra agora:
 * - `carregando`: sessão ou desafio ainda carregando (skeleton);
 * - `inscrito`: já tem vaga → link para o próximo passo (pagamento ou desafio);
 * - `sem-desafio`: nenhum desafio ativo (404) → aviso "Fiquem ligados";
 * - `erro`: o desafio não carregou (rede) → "Tentar de novo";
 * - `bloqueado`: encerrado, inscrições fechadas ou vagas esgotadas → botão desabilitado;
 * - `criar-conta` / `completar-cadastro`: link para a próxima tela do cadastro;
 * - `inscrever`: logado com cadastro completo → reserva a vaga ali mesmo.
 */
export type EstadoCta =
  | { tipo: 'carregando' }
  | { tipo: 'inscrito'; para: string; rotulo: string; status: StatusPagamento; vagaNumero: number | null }
  | { tipo: 'sem-desafio' }
  | { tipo: 'erro' }
  | { tipo: 'bloqueado'; motivo: string }
  | { tipo: 'criar-conta'; para: string }
  | { tipo: 'completar-cadastro'; para: string }
  | { tipo: 'inscrever'; slug: string };

export interface EntradaEstadoCta {
  desafio: DesafioAtual | undefined;
  desafioPendente: boolean;
  /** GET /desafios/atual respondeu 404 (nenhum desafio ativo). */
  semDesafio: boolean;
  /** null = visitante (ou erro de rede no /auth/me: segue como visitante). */
  me: MeResposta | null | undefined;
  mePendente: boolean;
}

export const CRIAR_CONTA_PARA_INSCREVER = '/criar-conta?acao=inscrever';
export const COMPLETAR_CADASTRO_PARA_INSCREVER = '/bem-vindo?acao=inscrever';

/** Decide o estado do CTA (função pura: a mesma regra nos 3 botões da landing e em /regras). */
export function estadoDoCta(e: EntradaEstadoCta): EstadoCta {
  if (e.mePendente) return { tipo: 'carregando' };
  const participacao = e.me?.participacao;
  if (participacao) {
    return {
      tipo: 'inscrito',
      para: destinoDaParticipacao(participacao),
      rotulo: PROXIMO_PASSO[participacao.pagamentoStatus],
      status: participacao.pagamentoStatus,
      vagaNumero: participacao.vagaNumero,
    };
  }
  if (e.semDesafio) return { tipo: 'sem-desafio' };
  if (e.desafioPendente) return { tipo: 'carregando' };
  if (!e.desafio) return { tipo: 'erro' };
  const motivo = bloqueioDaInscricao(e.desafio);
  if (motivo) return { tipo: 'bloqueado', motivo };
  if (!e.me) return { tipo: 'criar-conta', para: CRIAR_CONTA_PARA_INSCREVER };
  // A inscrição exige o cadastro completo (X11): a /bem-vindo cuida disso e da vaga.
  if (!e.me.usuario.perfilCompleto) return { tipo: 'completar-cadastro', para: COMPLETAR_CADASTRO_PARA_INSCREVER };
  return { tipo: 'inscrever', slug: e.desafio.slug };
}

/** Depois de reservar a vaga: o Pix; o embaixador (já confirmado) vai direto para a revelação da vaga. */
export function destinoAposInscricao(participacao: Pick<ParticipacaoResumo, 'pagamentoStatus'>): string {
  return participacao.pagamentoStatus === 'CONFIRMADO' ? '/bem-vindo?etapa=vaga' : '/pagamento';
}

/** Estado do CTA a partir do cache (`me` e desafio atual), sem a ação. Para quem só precisa decidir o que mostrar. */
export function useEstadoInscricao() {
  const desafioQ = useDesafioAtual();
  const meQ = useMe();
  const me = meQ.data ?? null;
  const estado = estadoDoCta({
    desafio: desafioQ.data,
    desafioPendente: desafioQ.isPending,
    semDesafio: ehApiError(desafioQ.error, 'NAO_ENCONTRADO'),
    me,
    // Erro de rede no /auth/me: segue como visitante (a capa não pode travar).
    mePendente: meQ.isPending,
  });
  return {
    estado,
    desafio: desafioQ.data,
    desafioCarregando: desafioQ.isPending,
    me,
    sessaoCarregando: meQ.isPending,
    recarregarDesafio: () => void desafioQ.refetch(),
  };
}

/**
 * "Quero participar" (3× na landing e no fim de /regras): estado + ação.
 * Visitante → /criar-conta?acao=inscrever; cadastro incompleto → /bem-vindo?acao=inscrever;
 * cadastro completo → reserva a vaga (POST inscrição) e segue para o Pix.
 */
export function useEntrarNoDesafio() {
  const base = useEstadoInscricao();
  const inscrever = useInscrever();
  const navegar = useNavigate();

  async function inscreverAgora(): Promise<void> {
    if (base.estado.tipo !== 'inscrever' || inscrever.isPending) return;
    try {
      // mutateAsync (e não callbacks do mutate): navega mesmo se o botão sair da tela no meio.
      const r = await inscrever.mutateAsync(base.estado.slug);
      void navegar(destinoAposInscricao(r.participacao), { viewTransition: true });
    } catch {
      // O erro fica em `inscrever.error` (mostrado junto do botão).
    }
  }

  const erro = inscrever.isError
    ? ehApiError(inscrever.error)
      ? inscrever.error.message
      : 'Não foi possível fazer a inscrição.'
    : null;

  return { ...base, inscreverAgora, inscrevendo: inscrever.isPending, erro };
}
