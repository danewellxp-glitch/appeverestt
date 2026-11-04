// Pagamento manual (X12) pelo painel do embaixador:
// 1) uma participante avisa que pagou (pela API) → o admin entra PELA TELA, confirma na fila
//    "Pagamentos a confirmar" → a participante entra no /desafio (não volta para /pagamento);
// 2) o admin remove a inscrição de outro participante que não pagou → a vaga volta para a fila
//    (o contador da capa diminui).
import { expect, test, type Browser, type Page } from '@playwright/test';
import { ADMIN, URL_WEB } from './ambiente';
import { contextoAdmin, prepararParticipante, type Pessoa } from './api';

const sufixo = Date.now();
const PAGANTE: Pessoa = { nome: 'Paula Pagante Rocha', email: `paula.pag.${sufixo}@e2e.dev` };
const DESISTENTE: Pessoa = { nome: 'Rui Desistente Costa', email: `rui.pag.${sufixo}@e2e.dev` };

async function vagasPreenchidas(browser: Browser): Promise<number> {
  const ctx = await browser.newContext();
  try {
    const page = await ctx.newPage();
    await page.goto('/');
    const texto = page.getByText(/\d+ de 50 vagas preenchidas/);
    await expect(texto).toBeVisible({ timeout: 20_000 });
    const m = /(\d+) de 50 vagas preenchidas/.exec((await texto.textContent()) ?? '');
    if (!m?.[1]) throw new Error('Não achei o número de vagas preenchidas');
    return Number(m[1]);
  } finally {
    await ctx.close();
  }
}

/** Login do admin pela tela /entrar (e-mail e senha no emulador), voltando para a aba Participantes. */
async function entrarComoAdminPelaTela(page: Page): Promise<void> {
  await page.goto('/entrar?volta=/admin/participantes');
  const form = page.getByRole('form', { name: 'Entrar na conta' });
  await form.getByLabel('E-mail').fill(ADMIN.email);
  await form.getByLabel('Senha', { exact: true }).fill(ADMIN.senha);
  await form.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/participantes$/, { timeout: 20_000 });
  await expect(page.getByRole('heading', { level: 2, name: 'Pagamentos a confirmar' })).toBeVisible({
    timeout: 20_000,
  });
}

test('admin confirma o pagamento pela fila, a participante entra no desafio e uma inscrição pendente é removida', async ({
  browser,
}) => {
  // O perfil do admin precisa estar completo para o login pela tela cair direto no /admin.
  const adminApi = await contextoAdmin();
  await adminApi.dispose();

  // Participante 1: inscrita e avisou que pagou (INFORMADO). Contexto do navegador = mesmo cookie.
  const ctxPagante = await browser.newContext({ baseURL: URL_WEB });
  await prepararParticipante(ctxPagante.request, PAGANTE, { inscrever: true, informar: true });
  // Participante 2: só inscrito (PENDENTE), vai ser removido.
  const ctxDesistente = await browser.newContext({ baseURL: URL_WEB });
  const idDesistente = await prepararParticipante(ctxDesistente.request, DESISTENTE, { inscrever: true });
  await ctxDesistente.close();
  if (!idDesistente) throw new Error('O participante pendente não foi inscrito.');

  // Antes da confirmação, o /desafio manda a participante de volta para o /pagamento.
  const pagante = await ctxPagante.newPage();
  await pagante.goto('/desafio');
  await expect(pagante).toHaveURL(/\/pagamento$/, { timeout: 20_000 });
  await expect(pagante.getByRole('heading', { level: 2, name: 'Pagamento em análise' })).toBeVisible({
    timeout: 20_000,
  });

  // 1) O admin entra pela tela e confirma na fila.
  const ctxAdmin = await browser.newContext({ baseURL: URL_WEB });
  try {
    const admin = await ctxAdmin.newPage();
    await entrarComoAdminPelaTela(admin);
    await expect(admin.getByText('Pagamentos', { exact: true })).toBeVisible();

    const fila = admin.locator('section', {
      has: admin.getByRole('heading', { level: 2, name: 'Pagamentos a confirmar' }),
    });
    await expect(fila.getByRole('link', { name: PAGANTE.nome, exact: true })).toBeVisible();
    await expect(fila.getByRole('link', { name: DESISTENTE.nome, exact: true })).toHaveCount(0);
    await fila.getByRole('button', { name: new RegExp(`^Confirmar pagamento de ${PAGANTE.nome}`) }).click();
    await expect(admin.getByText(`Pagamento de ${PAGANTE.nome} confirmado. O acesso foi liberado.`)).toBeVisible({
      timeout: 20_000,
    });
    await expect(fila.getByRole('link', { name: PAGANTE.nome, exact: true })).toHaveCount(0);

    // A participante (outra sessão) agora entra no desafio.
    await pagante.goto('/desafio');
    await expect(pagante).toHaveURL(/\/desafio$/, { timeout: 20_000 });
    await expect(pagante.getByRole('button', { name: /Abrir check-in de hoje/ })).toBeVisible({ timeout: 20_000 });
    await pagante.waitForTimeout(500);
    await expect(pagante).toHaveURL(/\/desafio$/);

    // 2) Remover a inscrição de quem não pagou: a vaga volta para a fila.
    const antes = await vagasPreenchidas(browser);
    await admin.goto(`/admin/participantes/${idDesistente}`);
    await expect(admin.getByRole('heading', { level: 1, name: DESISTENTE.nome })).toBeVisible({ timeout: 20_000 });
    await expect(admin.getByRole('heading', { level: 2, name: 'Pagamento' })).toBeVisible();
    await admin.getByRole('button', { name: 'Remover inscrição' }).click();
    const dialogo = admin.getByRole('dialog', { name: 'Remover a inscrição?' });
    await expect(dialogo).toBeVisible();
    await dialogo.getByRole('button', { name: 'Remover inscrição' }).click();
    await expect(admin.getByText('Inscrição removida. A vaga voltou para a fila.')).toBeVisible({ timeout: 20_000 });
    await expect(admin).toHaveURL(/\/admin\/participantes$/, { timeout: 20_000 });
    await expect(admin.getByRole('link', { name: new RegExp(DESISTENTE.nome) })).toHaveCount(0);

    expect(await vagasPreenchidas(browser)).toBe(antes - 1);
  } finally {
    await ctxAdmin.close();
    await ctxPagante.close();
  }
});
