// Smoke E2E (Frontend v2 R11), contra o emulador do Firebase Auth:
// 1) visitante → criar conta → /bem-vindo (dados de cadastro) → vaga → check-in completo com as
//    3 fotos → dia concluído → persistência → ranking → remover foto desfaz a conclusão;
// 2) "Continuar com Google" (popup do emulador) → /bem-vindo.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { SENHA } from './ambiente';

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

test('smoke: criar conta, vaga, check-in completo com fotos, ranking e remoção de foto', async ({ page }) => {
  const email = `joana.smoke.${Date.now()}@e2e.dev`;

  // 1) Visitante vê as vagas na capa.
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('melhor');
  const preenchidasAntes = await vagasPreenchidas(page);

  // 2) "Entrar no desafio" → criar conta (passo 1 de 2).
  await page.getByRole('button', { name: 'Entrar no desafio' }).click();
  await expect(page).toHaveURL(/\/criar-conta\?acao=inscrever$/);
  const form = page.getByRole('form', { name: 'Criar conta' });
  await form.getByLabel('Nome', { exact: true }).fill('Joana Smoke');
  await form.getByLabel('E-mail').fill(email);
  await form.getByLabel('Senha (mínimo 8 caracteres)').fill(SENHA);
  await form.getByRole('checkbox', { name: /Li e aceito/ }).check();
  await form.getByRole('button', { name: 'Criar conta' }).click();

  // 3) /bem-vindo: dados de cadastro (Q7) → "Garantir minha vaga" → revelação do número.
  await preencherDadosDeCadastro(page, 'Joana Smoke Silva');
  await page.getByRole('button', { name: 'Garantir minha vaga' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /^Sua vaga: número \d+ de 50$/ })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole('link', { name: 'Ir para o desafio' }).click();
  await expect(page).toHaveURL(/\/desafio$/);

  // 4) Home do desafio → check-in de hoje (dia 4).
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

  // 5) As 3 fotos de prova (fixtures), uma em cada slot.
  for (const rotulo of ROTULOS_FOTO) {
    const slot = slotFoto(page, rotulo);
    await expect(slot.getByRole('button', { name: `${rotulo}: adicionar foto` })).toBeVisible();
    await slot.locator('input[type="file"]').setInputFiles(FIXTURES[rotulo]);
    await expect(slot.getByRole('button', { name: `Remover foto de ${rotulo}` })).toBeVisible({ timeout: 30_000 });
  }

  // 6) O servidor confirma a conclusão.
  await expect(bannerConcluido(page)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText('5 de 5 requisitos')).toBeVisible();

  // 7) Reload: tudo persistido.
  await page.reload();
  await expect(bannerConcluido(page)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('progressbar', { name: 'Água: 3.000 de 3.000 ml' })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Fiz meu treino hoje' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByLabel('10 de 10 páginas')).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Postei o story de hoje' })).toHaveAttribute('aria-checked', 'true');
  for (const rotulo of ROTULOS_FOTO) {
    await expect(slotFoto(page, rotulo).getByRole('img', { name: `Foto de prova: ${rotulo}` })).toBeVisible();
  }

  // 8) Ranking: a participante aparece como "Você".
  await page.goto('/ranking');
  await expect(page.getByRole('heading', { level: 1, name: 'Ranking' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Você', { exact: true }).first()).toBeVisible({ timeout: 20_000 });

  // A capa mostra uma vaga a mais preenchida e o atalho para o desafio.
  await page.goto('/');
  expect(await vagasPreenchidas(page)).toBe(preenchidasAntes + 1);
  await expect(page.getByRole('link', { name: 'Ir para o desafio' }).first()).toBeVisible();

  // 9) Remover uma foto: o dia deixa de estar concluído.
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
