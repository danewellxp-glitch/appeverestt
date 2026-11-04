// Smoke E2E (Frontend v2 R11), contra o emulador do Firebase Auth:
// 1) visitante na landing (seções + 3× "Quero participar") → criar conta → /bem-vindo (dados de
//    cadastro) → vaga reservada → /pagamento (Pix: QR, valor, relógio, copia e cola) → "Já fiz o
//    pagamento" → "Pagamento em análise" → o admin confirma → revelação da vaga →
//    check-in completo com as 3 fotos → dia concluído → persistência → ranking → remover foto desfaz a conclusão;
// 2) "Continuar com Google" (popup do emulador) → /bem-vindo.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { ENV_API, SENHA, URL_WEB } from './ambiente';
import { confirmarPagamento, participanteIdDaPagina } from './api';

/** Payload Pix de demonstração que a API E2E serve (ENV_API.PIX_COPIA_E_COLA). */
const PIX_DEMO = ENV_API.PIX_COPIA_E_COLA ?? '';

const FIXTURES = {
  Água: fileURLToPath(new URL('./fixtures/agua.jpg', import.meta.url)),
  Exercício: fileURLToPath(new URL('./fixtures/exercicio.jpg', import.meta.url)),
  Leitura: fileURLToPath(new URL('./fixtures/leitura.jpg', import.meta.url)),
} as const;
type RotuloFoto = keyof typeof FIXTURES;
const ROTULOS_FOTO = Object.keys(FIXTURES) as RotuloFoto[];

/** O `li` da foto: o botão "X: adicionar foto" (vazio) ou a imagem "Foto de prova: X" (enviada). */
function slotFoto(page: Page, rotulo: RotuloFoto): Locator {
  return page
    .getByRole('list', { name: 'Fotos de prova' })
    .getByRole('listitem')
    .nth(ROTULOS_FOTO.indexOf(rotulo));
}

function bannerConcluido(page: Page): Locator {
  return page.getByRole('status').filter({ hasText: 'Dia concluído' });
}

async function vagasPreenchidas(page: Page): Promise<number> {
  const texto = page.getByText(/\d+ de 50 vagas preenchidas/);
  await expect(texto).toBeVisible({ timeout: 20_000 });
  const m = /(\d+) de 50 vagas preenchidas/.exec((await texto.textContent()) ?? '');
  if (!m?.[1]) throw new Error('Não achei o número de vagas preenchidas');
  return Number(m[1]);
}

async function preencherDadosDeCadastro(page: Page, nomeCompleto: string): Promise<void> {
  await expect(page).toHaveURL(/\/bem-vindo/, { timeout: 20_000 });
  const form = page.getByRole('form', { name: 'Seus dados' });
  await expect(form).toBeVisible({ timeout: 20_000 });
  await form.getByLabel('Nome completo').fill(nomeCompleto);
  await form.getByLabel('@ do Instagram').fill('pessoa.smoke');
  await form.getByLabel('Data de nascimento').fill('1994-03-21');
  await form.getByLabel('WhatsApp', { exact: true }).fill('11987654321');
  await form.getByLabel('Bairro', { exact: true }).fill('Pinheiros');
  await form.getByLabel('Cidade', { exact: true }).fill('São Paulo');
  await form.getByLabel('Estado', { exact: true }).selectOption('SP');
  const aceite = form.getByRole('checkbox', { name: /Li e aceito/ });
  if (!(await aceite.isChecked())) await aceite.check();
}

test('smoke: criar conta, vaga, check-in completo com fotos, ranking e remoção de foto', async ({ page, context }) => {
  const email = `joana.smoke.${Date.now()}@e2e.dev`;
  // "Copiar código Pix" usa a Clipboard API (o teste lê de volta o que foi copiado).
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: URL_WEB });

  // 1) Visitante na landing: hero com as vagas e o preço, as seções e os 3 "Quero participar".
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('melhor');
  const preenchidasAntes = await vagasPreenchidas(page);
  await expect(page.getByText(/Inscrição:\s*R\$\s*50,00\s*via Pix/)).toBeVisible();
  for (const secao of ['3 hábitos simples, todos os dias!', 'Quem é o TT', 'Fotos', 'Como funciona', 'Perguntas frequentes']) {
    await expect(page.getByRole('heading', { level: 2, name: secao, exact: true })).toBeAttached();
  }
  await expect(page.getByRole('heading', { level: 2, name: /^Restam? \d+ vagas?$/ })).toBeAttached();
  const queroParticipar = page.getByRole('link', { name: 'Quero participar' });
  await expect(queroParticipar).toHaveCount(3);
  await expect(page.getByRole('link', { name: 'Regras completas' })).toHaveAttribute('href', '/regras');

  // 2) "Quero participar" (o do topo) → criar conta (passo 1 de 2).
  await queroParticipar.first().click();
  await expect(page).toHaveURL(/\/criar-conta\?acao=inscrever$/);
  const form = page.getByRole('form', { name: 'Criar conta' });
  await form.getByLabel('Nome', { exact: true }).fill('Joana Smoke');
  await form.getByLabel('E-mail').fill(email);
  await form.getByLabel('Senha (mínimo 8 caracteres)').fill(SENHA);
  await form.getByRole('checkbox', { name: /Li e aceito/ }).check();
  await form.getByRole('button', { name: 'Criar conta' }).click();

  // 3) /bem-vindo: dados de cadastro (Q7) → "Garantir minha vaga" → /pagamento (vaga reservada).
  await preencherDadosDeCadastro(page, 'Joana Smoke Silva');
  await page.getByRole('button', { name: 'Garantir minha vaga' }).click();
  await expect(page).toHaveURL(/\/pagamento$/, { timeout: 20_000 });

  // 4) Pix: QR, valor, relógio e o copia e cola.
  await expect(page.getByRole('heading', { level: 1, name: 'Pagamento' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Passo 2 de 2')).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: /^Vaga nº \d+ reservada para você$/ })).toBeVisible();
  const qr = page.getByRole('img', { name: /QR code do Pix/ });
  await expect(qr).toBeVisible();
  await expect(qr.locator('svg')).toBeVisible();
  await expect(page.getByText(/R\$\s*50,00/).first()).toBeVisible();
  const relogio = page.getByRole('timer', { name: 'Tempo para pagar' });
  await expect(relogio).toHaveText(/^(5:00|4:[0-5]\d)$/);
  const codigo = page.getByRole('textbox', { name: 'Pix copia e cola' });
  await expect(codigo).toHaveValue(PIX_DEMO);

  await page.getByRole('button', { name: 'Copiar código Pix' }).click();
  await expect(page.getByText('Código Pix copiado.')).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(PIX_DEMO);

  // 5) "Já fiz o pagamento" → "Pagamento em análise": a vaga segue garantida enquanto o TT confere.
  await page.getByRole('button', { name: 'Já fiz o pagamento' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Pagamento em análise' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/^Vaga nº \d+ garantida entre os 50 desafiados$/)).toBeVisible();
  // O aviso cita só o final do WhatsApp cadastrado (11987654321).
  await expect(page.getByText(/final 4321/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver o QR de novo' })).toBeVisible();

  // 6) O admin confirma (pela API); com o reload a tela revela o número da vaga.
  await confirmarPagamento(await participanteIdDaPagina(page));
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: /^Sua vaga: número \d+ de 50$/ })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole('link', { name: 'Ir para o desafio' }).click();
  await expect(page).toHaveURL(/\/desafio$/);

  // 7) Home do desafio → check-in de hoje (dia 4).
  await page.getByRole('button', { name: /Abrir check-in de hoje/ }).click();
  await expect(page).toHaveURL(/\/desafio\/dia\/4$/, { timeout: 20_000 });

  await page.getByRole('button', { name: 'Bati 3 L' }).click();
  await expect(page.getByRole('progressbar', { name: 'Água: 3.000 de 3.000 ml' })).toBeVisible();

  const treino = page.getByRole('switch', { name: 'Fiz meu treino hoje' });
  await treino.click();
  await expect(treino).toHaveAttribute('aria-checked', 'true');

  const maisCinco = page.getByRole('button', { name: '+5 páginas' });
  await maisCinco.click();
  await maisCinco.click();
  await expect(page.getByLabel('10 de 10 páginas')).toBeVisible();

  const story = page.getByRole('switch', { name: 'Postei o story de hoje' });
  await story.click();
  await expect(story).toHaveAttribute('aria-checked', 'true');

  // 8) As 3 fotos de prova (fixtures), uma em cada slot.
  for (const rotulo of ROTULOS_FOTO) {
    const slot = slotFoto(page, rotulo);
    await expect(slot.getByRole('button', { name: `${rotulo}: adicionar foto` })).toBeVisible();
    await slot.locator('input[type="file"]').setInputFiles(FIXTURES[rotulo]);
    await expect(slot.getByRole('button', { name: `Remover foto de ${rotulo}` })).toBeVisible({ timeout: 30_000 });
  }

  // 9) O servidor confirma a conclusão.
  await expect(bannerConcluido(page)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText('5 de 5 requisitos')).toBeVisible();

  // 10) Reload: tudo persistido.
  await page.reload();
  await expect(bannerConcluido(page)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('progressbar', { name: 'Água: 3.000 de 3.000 ml' })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Fiz meu treino hoje' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByLabel('10 de 10 páginas')).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Postei o story de hoje' })).toHaveAttribute('aria-checked', 'true');
  for (const rotulo of ROTULOS_FOTO) {
    await expect(slotFoto(page, rotulo).getByRole('img', { name: `Foto de prova: ${rotulo}` })).toBeVisible();
  }

  // 10b) Atalho do ícone (`/hoje?acao=agua`): +250 ml em 1 toque, toast, URL limpa e persistido.
  await page.goto('/hoje?acao=agua');
  await expect(page).toHaveURL(/\/desafio\/dia\/4$/, { timeout: 20_000 });
  await expect(page.getByRole('status').filter({ hasText: '+250 ml registrados' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('progressbar', { name: 'Água: 3.250 de 3.000 ml' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('progressbar', { name: 'Água: 3.250 de 3.000 ml' })).toBeVisible({ timeout: 20_000 });
  // `/hoje?acao=treino` com o treino já marcado: não muda nada, só avisa.
  await page.goto('/hoje?acao=treino');
  await expect(page.getByRole('status').filter({ hasText: 'já estava marcado' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('switch', { name: 'Fiz meu treino hoje' })).toHaveAttribute('aria-checked', 'true');

  // 11) Ranking: a participante aparece como "Você".
  await page.goto('/ranking');
  await expect(page.getByRole('heading', { level: 1, name: 'Ranking' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Você', { exact: true }).first()).toBeVisible({ timeout: 20_000 });

  // A capa mostra uma vaga a mais preenchida e, no lugar dos "Quero participar", o atalho para o desafio.
  await page.goto('/');
  expect(await vagasPreenchidas(page)).toBe(preenchidasAntes + 1);
  await expect(page.getByRole('link', { name: 'Ir para o desafio' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Quero participar' })).toHaveCount(0);

  // 12) Remover uma foto: o dia deixa de estar concluído.
  await page.goto('/desafio/dia/4');
  await expect(bannerConcluido(page)).toBeVisible({ timeout: 20_000 });
  const slotAgua = slotFoto(page, 'Água');
  await slotAgua.getByRole('button', { name: 'Remover foto de Água' }).click();
  await expect(slotAgua.getByRole('button', { name: 'Água: adicionar foto' })).toBeVisible({ timeout: 20_000 });
  await expect(bannerConcluido(page)).toHaveCount(0);
  await expect(page.getByText('4 de 5 requisitos')).toBeVisible();

  await page.reload();
  await expect(page.getByText('4 de 5 requisitos')).toBeVisible({ timeout: 20_000 });
  await expect(slotFoto(page, 'Água').getByRole('button', { name: 'Água: adicionar foto' })).toBeVisible();
  await expect(bannerConcluido(page)).toHaveCount(0);
});

test('manifest do PWA: atalhos do ícone para água, treino e leitura', async ({ request }) => {
  const r = await request.get('/manifest.webmanifest');
  expect(r.ok()).toBe(true);
  const manifest = (await r.json()) as { shortcuts?: { name: string; url: string }[] };
  expect(manifest.shortcuts?.map((s) => s.url)).toEqual(['/hoje?acao=agua', '/hoje?acao=treino', '/hoje?acao=leitura']);
  expect(manifest.shortcuts?.map((s) => s.name)).toEqual(['Água +250 ml', 'Treino feito', 'Leitura feita']);
});

test('smoke: "Continuar com Google" no emulador leva ao /bem-vindo', async ({ page }) => {
  const email = `google.smoke.${Date.now()}@e2e.dev`;
  await page.goto('/entrar');
  const popupPromessa = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Continuar com Google' }).click();
  const popup = await popupPromessa;

  // Tela de contas falsas do emulador do Firebase Auth.
  await popup.waitForLoadState();
  await popup.getByText('Add new account').click();
  await popup.locator('#email-input').fill(email);
  await popup.locator('#display-name-input').fill('Gabriel Google Teste');
  await popup.getByRole('button', { name: /Sign in with Google\.com/i }).click();
  await popup.waitForEvent('close', { timeout: 20_000 }).catch(() => undefined);

  await expect(page).toHaveURL(/\/bem-vindo/, { timeout: 20_000 });
  const form = page.getByRole('form', { name: 'Seus dados' });
  await expect(form.getByLabel('Nome completo')).toHaveValue('Gabriel Google Teste');
});
