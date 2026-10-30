// Feedback (X13): participante confirmado envia, reabre e edita; o admin vê em /admin/feedbacks;
// o CSV do admin traz BOM, cabeçalho e o participante.
import { expect, test } from '@playwright/test';
import { DESAFIO, URL_WEB } from './ambiente';
import { contextoAdmin, prepararParticipante, type Pessoa } from './api';

const PESSOA: Pessoa = { nome: 'Fernanda Feedback Alves', email: `fernanda.fb.${Date.now()}@e2e.dev` };

test('feedback: envia, edita, aparece para o admin e entra no CSV', async ({ browser }) => {
  const ctx = await browser.newContext({ baseURL: URL_WEB });
  const admin = await contextoAdmin();
  try {
    await prepararParticipante(ctx.request, PESSOA, { inscrever: true, informar: true, confirmar: true });
    const page = await ctx.newPage();

    // 1) Primeiro envio.
    await page.goto('/feedback');
    await expect(page.getByRole('heading', { level: 1, name: 'Seu feedback' })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('radio', { name: '4 estrelas' }).check();
    await page.getByLabel('O que você achou do desafio?').fill('Foi puxado, mas o grupo ajudou muito a seguir.');
    await page.getByLabel('O que mudou para você nestes 30 dias?').fill('Passei a beber mais água e a ler todo dia.');
    await page.getByRole('checkbox', { name: /Autorizo o Everest/ }).check();
    await page.getByRole('button', { name: 'Enviar feedback' }).click();
    await expect(page.getByText('Feedback enviado. Obrigado!')).toBeVisible({ timeout: 20_000 });

    // 2) Reabre: o formulário vem preenchido e vira edição.
    await page.reload();
    await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('radio', { name: '4 estrelas' })).toBeChecked();
    await expect(page.getByLabel('O que você achou do desafio?')).toHaveValue(
      'Foi puxado, mas o grupo ajudou muito a seguir.',
    );
    await page.getByRole('radio', { name: '5 estrelas' }).check();
    await page.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(page.getByText('Feedback atualizado. Obrigado!')).toBeVisible({ timeout: 20_000 });
    await page.reload();
    await expect(page.getByRole('radio', { name: '5 estrelas' })).toBeChecked({ timeout: 20_000 });

    // 3) O admin vê o feedback com a nota nova.
    const ctxAdmin = await browser.newContext({ baseURL: URL_WEB, storageState: await admin.storageState() });
    try {
      const pa = await ctxAdmin.newPage();
      await pa.goto('/admin/feedbacks');
      await expect(pa.getByRole('heading', { level: 1, name: 'Feedbacks' })).toBeVisible({ timeout: 20_000 });
      const cartao = pa.getByRole('listitem').filter({ has: pa.getByRole('link', { name: PESSOA.nome }) });
      await expect(cartao).toBeVisible({ timeout: 20_000 });
      await expect(cartao.getByRole('img', { name: 'Nota 5 de 5' })).toBeVisible();
      await expect(cartao.getByText('Autorizou divulgação')).toBeVisible();
      await expect(pa.getByText('Média')).toBeVisible();
      await expect(pa.getByText('Total')).toBeVisible();
    } finally {
      await ctxAdmin.close();
    }

    // 4) CSV do admin: BOM (Excel lê os acentos), cabeçalho com ";" e a participante.
    const r = await admin.get(`/api/admin/desafios/${DESAFIO.slug}/participantes.csv`);
    expect(r.ok(), await r.text()).toBe(true);
    expect(r.headers()['content-type']).toMatch(/^text\/csv; charset=utf-8/i);
    expect(r.headers()['content-disposition']).toContain(`participantes-${DESAFIO.slug}.csv`);
    const bytes = await r.body();
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const texto = bytes.subarray(3).toString('utf8');
    const [cabecalho, ...linhas] = texto.split('\r\n');
    expect(cabecalho).toContain(';');
    expect(cabecalho?.toLowerCase()).toContain('nome');
    expect(linhas.some((l) => l.includes(PESSOA.nome))).toBe(true);
  } finally {
    await admin.dispose();
    await ctx.close();
  }
});
