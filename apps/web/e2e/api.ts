// Atalhos pela API para os testes E2E (sempre pela origem do front: o proxy /api do preview).
// A sessão é o cookie que o POST /api/auth/sessao devolve; cada APIRequestContext guarda o seu.
import { expect, request, type APIRequestContext, type Page } from '@playwright/test';
import type { FeedbackInput, MeResposta } from '@everest/shared';
import { ADMIN, DADOS_PERFIL, DESAFIO, SENHA, URL_WEB } from './ambiente';
import { criarContaEmulador, entrarEmulador } from './firebase-emulador';

/** As rotas que mudam estado exigem a origem do front (proteção de CSRF da API). */
export const ORIGEM = { Origin: URL_WEB } as const;

const BASE_DESAFIO = `/api/desafios/${DESAFIO.slug}`;
const BASE_ADMIN = `/api/admin/desafios/${DESAFIO.slug}`;

async function exigirOk(r: Awaited<ReturnType<APIRequestContext['get']>>): Promise<void> {
  expect(r.ok(), `${r.url()} → ${r.status()} ${await r.text()}`).toBe(true);
}

/** Troca o idToken do emulador pelo cookie de sessão. */
export async function abrirSessao(api: APIRequestContext, idToken: string): Promise<void> {
  await exigirOk(await api.post('/api/auth/sessao', { data: { idToken }, headers: ORIGEM }));
}

/** Preenche os dados de cadastro (Q7) e o nome. */
export async function completarPerfil(api: APIRequestContext, nome: string): Promise<void> {
  await exigirOk(await api.patch('/api/me', { data: { nome, ...DADOS_PERFIL }, headers: ORIGEM }));
}

/** Contexto de API novo (com o próprio cookie), apontando para o front. Feche com `dispose()`. */
export function novoContextoApi(): Promise<APIRequestContext> {
  return request.newContext({ baseURL: URL_WEB });
}

/** Sessão do admin do global-setup (e-mail verificado no emulador → vinculado no primeiro login). */
export async function entrarComoAdmin(api: APIRequestContext): Promise<void> {
  await abrirSessao(api, await entrarEmulador(ADMIN.email, ADMIN.senha));
  await completarPerfil(api, ADMIN.nome);
}

/** Abre um contexto de API já logado como admin. Feche com `dispose()`. */
export async function contextoAdmin(): Promise<APIRequestContext> {
  const api = await novoContextoApi();
  await entrarComoAdmin(api);
  return api;
}

/** O admin confirma (ou devolve para pendente) o pagamento de um participante. */
export async function definirPagamento(
  admin: APIRequestContext,
  participanteId: string,
  status: 'CONFIRMADO' | 'PENDENTE' = 'CONFIRMADO',
): Promise<void> {
  await exigirOk(
    await admin.patch(`${BASE_ADMIN}/participantes/${participanteId}/pagamento`, {
      data: { status },
      headers: ORIGEM,
    }),
  );
}

/** Confirma o pagamento abrindo (e fechando) uma sessão de admin própria. */
export async function confirmarPagamento(participanteId: string): Promise<void> {
  const admin = await contextoAdmin();
  try {
    await definirPagamento(admin, participanteId, 'CONFIRMADO');
  } finally {
    await admin.dispose();
  }
}

/** `participacao` do usuário logado no contexto (GET /api/auth/me). */
export async function minhaParticipacao(api: APIRequestContext): Promise<NonNullable<MeResposta['participacao']>> {
  const r = await api.get('/api/auth/me');
  await exigirOk(r);
  const me = (await r.json()) as MeResposta;
  if (!me.participacao) throw new Error('O usuário logado não está inscrito.');
  return me.participacao;
}

/** O participanteId de quem está logado na página (o contexto do navegador compartilha o cookie). */
export async function participanteIdDaPagina(page: Page): Promise<string> {
  return (await minhaParticipacao(page.request)).participanteId;
}

export interface Pessoa {
  nome: string;
  email: string;
}

/**
 * Cria uma conta no emulador, abre a sessão no `api`, completa o perfil e, conforme as opções,
 * inscreve, avisa o pagamento e (pelo admin) confirma. Devolve o participanteId (ou null sem inscrição).
 */
export async function prepararParticipante(
  api: APIRequestContext,
  pessoa: Pessoa,
  opcoes: { inscrever?: boolean; informar?: boolean; confirmar?: boolean } = {},
): Promise<string | null> {
  await abrirSessao(api, await criarContaEmulador({ email: pessoa.email, senha: SENHA, nome: pessoa.nome }));
  await completarPerfil(api, pessoa.nome);
  if (!opcoes.inscrever && !opcoes.informar && !opcoes.confirmar) return null;
  await exigirOk(await api.post(`${BASE_DESAFIO}/inscricao`, { headers: ORIGEM }));
  const { participanteId } = await minhaParticipacao(api);
  if (opcoes.informar) await informarPagamento(api);
  if (opcoes.confirmar) await confirmarPagamento(participanteId);
  return participanteId;
}

/** "Já fiz o pagamento" pela API. */
export async function informarPagamento(api: APIRequestContext): Promise<void> {
  await exigirOk(await api.post(`${BASE_DESAFIO}/pagamento/informar`, { headers: ORIGEM }));
}

/** Cria ou atualiza o feedback do participante logado. */
export async function salvarFeedback(api: APIRequestContext, feedback: FeedbackInput): Promise<void> {
  await exigirOk(await api.put(`${BASE_DESAFIO}/feedback`, { data: feedback, headers: ORIGEM }));
}
