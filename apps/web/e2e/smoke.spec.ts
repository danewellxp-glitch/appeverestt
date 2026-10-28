// Smoke E2E (Fase 12): visitante → cadastro → inscrição automática → check-in completo
// com as 3 fotos → dia concluído → persistência → ranking → remover foto desfaz a conclusão.
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

function slotFoto(page: Page, rotulo: RotuloFoto): Locator {
  return page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { level: 3, name: rotulo, exact: true }) });
}

function bannerConcluido(page: Page): Locator {
  return page.getByRole('status').filter({ hasText: 'Dia concluído!' });
}

async function vagasDisponiveis(page: Page): Promise<number> {
  const texto = page.getByText(/de 50 vagas disponíveis/);
  await expect(texto).toBeVisible();
  const frase = (await texto.locator('xpath=..').textContent()) ?? '';
  const m = /(\d+)\s*de 50 vagas disponíveis/.exec(frase.replace(/\s+/g, ' '));
  if (!m?.[1]) throw new Error(`Não achei o número de vagas em: "${frase}"`);
  return Number(m[1]);
}

test('smoke: cadastro, check-in completo com fotos, ranking e remoção de foto', async ({
  page,
}) => {
  const sufixo = Date.now();
  const email = `joana.smoke.${sufixo}@e2e.dev`;

  // 1) Visitante vê as vagas na landing.
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('melhor');
  const vagasAntes = await vagasDisponiveis(page);
  expect(vagasAntes).toBeGreaterThan(0);

  // 2) "Entrar no desafio" → cadastro (passo 1 de 2).
  await page.getByRole('button', { name: 'Entrar no desafio' }).click();
  await expect(page).toHaveURL(/\/cadastro\?acao=inscrever$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Criar conta' })).toBeVisible();

  await page.getByLabel('Nome completo').fill('Joana Smoke');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByLabel('Li e aceito a política de privacidade').check();
  await page.getByRole('button', { name: 'Criar conta e entrar' }).click();

  // 3) Inscrição automática → /hoje (dia 4 de 30).
  await expect(page).toHaveURL(/\/hoje$/, { timeout: 20_000 });
  await expect(page.getByRole('heading', { level: 1, name: 'Dia 4 de 30' })).toBeVisible({
    timeout: 20_000,
  });

  // 4) Check-in: água, exercício, leitura e story.
  await page.getByRole('button', { name: 'Bati 3 L' }).click();
  await expect(page.getByText('3.000', { exact: true })).toBeVisible();

  const exercicio = page.getByRole('switch', { name: 'Fiz meu exercício hoje' });
  await exercicio.click();
  await expect(exercicio).toHaveAttribute('aria-checked', 'true');

  const paginas = page.getByLabel('Páginas lidas');
  await paginas.fill('10');
  await paginas.blur();
  await expect(paginas).toHaveValue('10');

  const story = page.getByRole('switch', { name: 'Postei o story' });
  await story.click();
  await expect(story).toHaveAttribute('aria-checked', 'true');

  // 5) As 3 fotos de prova, uma em cada slot.
  for (const rotulo of ROTULOS_FOTO) {
    const slot = slotFoto(page, rotulo);
    await slot.locator('input[type="file"]').setInputFiles(FIXTURES[rotulo]);
    await expect(slot.getByRole('img', { name: `Foto de prova: ${rotulo}` })).toBeVisible({
      timeout: 30_000,
    });
  }

  // 6) O servidor confirma a conclusão (o banner só aparece com concluido=true vindo da API).
  await expect(bannerConcluido(page)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText('5 de 5 requisitos')).toBeVisible();

  // 7) Reload: tudo persistido.
  await page.reload();
  await expect(bannerConcluido(page)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('3.000', { exact: true })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Fiz meu exercício hoje' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(page.getByLabel('Páginas lidas')).toHaveValue('10');
  await expect(page.getByRole('switch', { name: 'Postei o story' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(page.getByText('3 de 3 fotos de prova', { exact: false })).toBeVisible();
  for (const rotulo of ROTULOS_FOTO) {
    await expect(
      slotFoto(page, rotulo).getByRole('img', { name: `Foto de prova: ${rotulo}` }),
    ).toBeVisible();
  }

  // 8) Ranking mostra a participante ("Primeiro S.") com 1 dia concluído.
  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Ranking' })
    .click();
  await expect(page).toHaveURL(/\/ranking$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Ranking' })).toBeVisible();
  await expect(page.getByText('Joana S.').first()).toBeVisible();
  await expect(page.getByText('1 dia concluído').first()).toBeVisible();

  // A landing agora mostra uma vaga a menos e o atalho para o desafio.
  await page.goto('/');
  expect(await vagasDisponiveis(page)).toBe(vagasAntes - 1);
  await expect(page.getByRole('link', { name: 'Ir para o desafio' })).toBeVisible();

  // 9) Remover uma foto: o dia deixa de estar concluído.
  await page.goto('/hoje');
  await expect(bannerConcluido(page)).toBeVisible({ timeout: 20_000 });
  const slotAgua = slotFoto(page, 'Água');
  await slotAgua.getByRole('button', { name: 'Remover foto de Água' }).click();
  await slotAgua.getByRole('button', { name: 'Remover', exact: true }).click();
  await expect(slotAgua.getByRole('button', { name: 'Enviar foto de Água' })).toBeVisible({
    timeout: 20_000,
  });
  await expect(bannerConcluido(page)).toHaveCount(0);
  await expect(page.getByText('4 de 5 requisitos')).toBeVisible();

  await page.reload();
  await expect(page.getByText('2 de 3 fotos de prova', { exact: false })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText('4 de 5 requisitos')).toBeVisible();
  await expect(bannerConcluido(page)).toHaveCount(0);
});
