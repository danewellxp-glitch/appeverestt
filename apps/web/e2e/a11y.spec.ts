// Acessibilidade automatizada (Frontend v2 R11; pagamento e feedback na R13): axe-core (WCAG 2.0/2.1
// A e AA) em todas as telas (19), nos temas claro e escuro, no viewport de celular. Falha com qualquer violação "serious" ou "critical";
// todas as violações encontradas (de qualquer impacto) são impressas no log.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test';
import { DESAFIO, SENHA, URL_WEB } from './ambiente';
import {
  abrirSessao,
  definirPagamento,
  entrarComoAdmin,
  informarPagamento,
  ORIGEM,
  prepararParticipante,
  salvarFeedback,
} from './api';
import { criarContaEmulador } from './firebase-emulador';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const TEMAS = ['claro', 'escuro'] as const;
type Tema = (typeof TEMAS)[number];
const sufixo = Date.now();
const PARTICIPANTE = { nome: 'Bruno Acessível Lima', email: `bruno.a11y.${sufixo}@e2e.dev` };
const NOVATO = { nome: 'Nina Novata', email: `nina.a11y.${sufixo}@e2e.dev` };

type Contexto = Awaited<ReturnType<Browser['newContext']>>;
type Estado = Awaited<ReturnType<Contexto['storageState']>>;

async function estadoDe(browser: Browser, preparar: (api: APIRequestContext) => Promise<void>): Promise<Estado> {
  const ctx = await browser.newContext({ baseURL: URL_WEB });
  try {
    await preparar(ctx.request);
    return await ctx.storageState();
  } finally {
    await ctx.close();
  }
}

async function esperarTela(page: Page): Promise<void> {
  // Rotas carregadas sob demanda + consultas: espera sumirem os esqueletos e as animações de entrada.
  await expect(page.locator('[role="status"][aria-label^="Carregando"]')).toHaveCount(0, { timeout: 20_000 });
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.animate-pulse')).toHaveCount(0, { timeout: 20_000 });
  await page.waitForTimeout(900);
}

async function auditar(page: Page, tela: string): Promise<void> {
  await esperarTela(page);
  const { violations: violacoes } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  if (violacoes.length === 0) {
    console.log(`[a11y] ${tela}: nenhuma violação`);
  } else {
    console.log(`[a11y] ${tela}: ${violacoes.length} violação(ões)`);
    for (const v of violacoes) {
      console.log(`  - [${v.impact ?? 'sem impacto'}] ${v.id}: ${v.help} (${v.nodes.length} nó(s)) ${v.helpUrl}`);
      for (const n of v.nodes.slice(0, 5))
        console.log(`      ${n.target.join(' ')} → ${n.failureSummary?.replace(/\s+/g, ' ') ?? ''}`);
    }
  }
  const graves = violacoes.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(
    graves.map((v) => `${v.impact}: ${v.id} — ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    `Violações graves em ${tela}`,
  ).toEqual([]);
}

async function abrir(browser: Browser, tema: Tema, estado?: Estado): Promise<{ ctx: Contexto; page: Page }> {
  const ctx = await browser.newContext({ ...(estado ? { storageState: estado } : {}), colorScheme: tema === 'escuro' ? 'dark' : 'light' });
  await ctx.addInitScript((t) => {
    try {
      localStorage.setItem('everest-tema', t);
    } catch {
      /* sem storage: segue o sistema (colorScheme acima) */
    }
  }, tema);
  return { ctx, page: await ctx.newPage() };
}

test.describe('acessibilidade (axe)', () => {
  let participante: Estado;
  let novato: Estado;
  let admin: Estado;

  test.beforeAll(async ({ browser }) => {
    // Admin do global-setup (conta no emulador com e-mail verificado → vinculada no primeiro login).
    // Vem antes do participante: é ele quem confirma o pagamento.
    const ctxAdmin = await browser.newContext({ baseURL: URL_WEB });
    try {
      const adminApi = ctxAdmin.request;
      await entrarComoAdmin(adminApi);
      admin = await ctxAdmin.storageState();

      // Participante inscrito e confirmado, com um check-in parcial no dia de hoje e um feedback
      // (telas com conteúdo real, inclusive /feedback e /admin/feedbacks).
      participante = await estadoDe(browser, async (p) => {
        const id = await prepararParticipante(p, PARTICIPANTE, { inscrever: true });
        if (!id) throw new Error('Participante não inscrito');
        await definirPagamento(adminApi, id, 'CONFIRMADO');
        const checkin = await p.put(`/api/desafios/${DESAFIO.slug}/dias/4`, {
          data: { aguaMl: 1500, exercicio: true, paginasLidas: 4, storyPostado: false },
          headers: ORIGEM,
        });
        expect(checkin.ok(), await checkin.text()).toBe(true);
        await salvarFeedback(p, {
          nota: 4,
          oQueAchou: 'Gostei bastante do desafio e da comunidade.',
          oQueMudou: 'Criei o hábito de ler antes de dormir.',
          autorizaDivulgacao: true,
        });
      });
    } finally {
      await ctxAdmin.close();
    }
    // Conta recém-criada, sem os dados de cadastro: vê a /bem-vindo.
    novato = await estadoDe(browser, async (api) => {
      await abrirSessao(api, await criarContaEmulador({ email: NOVATO.email, senha: SENHA, nome: NOVATO.nome }));
    });
  });

  for (const tema of TEMAS) {
    test.describe(`tema ${tema}`, () => {
      for (const [caminho, tela] of [
        ['/', 'Entrada'],
        ['/entrar', 'Entrar'],
        ['/criar-conta', 'Criar conta'],
        ['/recuperar-senha', 'Recuperar senha'],
        ['/regras', 'Regras'],
        ['/privacidade', 'Privacidade'],
        ['/trilha-que-nao-existe', 'Não encontrada'],
      ] as const) {
        test(`visitante: ${tela} (${caminho})`, async ({ browser }) => {
          const { ctx, page } = await abrir(browser, tema);
          try {
            await page.goto(caminho);
            await auditar(page, `${tela} ${caminho} [${tema}]`);
          } finally {
            await ctx.close();
          }
        });
      }

      test('novato: Bem-vindo (/bem-vindo)', async ({ browser }) => {
        const { ctx, page } = await abrir(browser, tema, novato);
        try {
          await page.goto('/bem-vindo');
          await expect(page.getByRole('form', { name: 'Seus dados' })).toBeVisible({ timeout: 20_000 });
          await auditar(page, `Bem-vindo /bem-vindo [${tema}]`);
        } finally {
          await ctx.close();
        }
      });

      for (const [caminho, tela] of [
        ['/desafio', 'Desafio'],
        ['/desafio/dia/4', 'Dia (check-in)'],
        ['/progresso', 'Progresso'],
        ['/ranking', 'Ranking'],
        ['/perfil', 'Perfil'],
        ['/feedback', 'Feedback'],
      ] as const) {
        test(`participante: ${tela} (${caminho})`, async ({ browser }) => {
          const { ctx, page } = await abrir(browser, tema, participante);
          try {
            await page.goto(caminho);
            await expect(page).toHaveURL(new RegExp(`${caminho}$`));
            await auditar(page, `${tela} ${caminho} [${tema}]`);
          } finally {
            await ctx.close();
          }
        });
      }

      test('inscrito sem pagamento: Pagamento (/pagamento) pendente e informado', async ({ browser }) => {
        // Um participante novo por tema: só inscrito (PENDENTE) e, depois do aviso, INFORMADO.
        const pessoa = { nome: `Paulo Pendente ${tema}`, email: `paulo.a11y.${tema}.${sufixo}@e2e.dev` };
        const pendente = await estadoDe(browser, async (api) => {
          await prepararParticipante(api, pessoa, { inscrever: true });
        });
        const { ctx, page } = await abrir(browser, tema, pendente);
        try {
          await page.goto('/pagamento');
          await expect(page.getByRole('button', { name: 'Já fiz o pagamento' })).toBeVisible({ timeout: 20_000 });
          await auditar(page, `Pagamento pendente /pagamento [${tema}]`);

          await informarPagamento(page.request);
          await page.reload();
          await expect(page.getByRole('heading', { level: 2, name: 'Recebemos seu aviso' })).toBeVisible({
            timeout: 20_000,
          });
          await auditar(page, `Pagamento informado /pagamento [${tema}]`);
        } finally {
          await ctx.close();
        }
      });

      test('admin: Admin (/admin) Participante (/admin/participantes/:id) e Feedbacks (/admin/feedbacks)', async ({ browser }) => {
        const { ctx, page } = await abrir(browser, tema, admin);
        try {
          await page.goto('/admin');
          await expect(page).toHaveURL(/\/admin$/);
          await auditar(page, `Admin /admin [${tema}]`);

          await page.getByRole('link', { name: /Bruno Acessível/ }).first().click();
          await expect(page).toHaveURL(/\/admin\/participantes\/[^/]+$/);
          await auditar(page, `Admin participante /admin/participantes/:id [${tema}]`);

          await page.goto('/admin/feedbacks');
          await expect(page.getByRole('img', { name: 'Nota 4 de 5' }).first()).toBeVisible({ timeout: 20_000 });
          await auditar(page, `Admin feedbacks /admin/feedbacks [${tema}]`);
        } finally {
          await ctx.close();
        }
      });
    });
  }
});
