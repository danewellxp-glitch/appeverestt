// Acessibilidade automatizada (Fase 12): axe-core (WCAG 2.0/2.1 A e AA) em todas as telas,
// no viewport de celular. Falha com qualquer violação de impacto "serious" ou "critical";
// todas as violações encontradas (de qualquer impacto) são impressas no log.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { ADMIN, DESAFIO, SENHA, URL_WEB } from './ambiente';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const PARTICIPANTE = { nome: 'Bruno Acessivel', email: `bruno.a11y.${Date.now()}@e2e.dev` };

type Estado = Awaited<ReturnType<Awaited<ReturnType<Browser['newContext']>>['storageState']>>;

/** Faz a requisição pela origem do front (proxy /api do preview) e devolve o estado com o cookie de sessão. */
async function sessaoVia(
  browser: Browser,
  entrar: (ctx: Awaited<ReturnType<Browser['newContext']>>) => Promise<void>,
): Promise<Estado> {
  const ctx = await browser.newContext({ baseURL: URL_WEB });
  try {
    await entrar(ctx);
    return await ctx.storageState();
  } finally {
    await ctx.close();
  }
}

async function esperarTela(page: Page): Promise<void> {
  // Rotas carregadas sob demanda + consultas: espera sumirem os esqueletos "Carregando…".
  await expect(page.locator('[role="status"][aria-label^="Carregando"]')).toHaveCount(0, {
    timeout: 20_000,
  });
  await expect(page.locator('h1').first()).toBeVisible();
  await expect(page.locator('.animate-pulse')).toHaveCount(0, { timeout: 20_000 });
}

async function auditar(page: Page, tela: string): Promise<void> {
  await esperarTela(page);
  const resultado = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const violacoes = resultado.violations;
  if (violacoes.length === 0) {
    console.log(`[a11y] ${tela}: nenhuma violação`);
  } else {
    console.log(`[a11y] ${tela}: ${violacoes.length} violação(ões)`);
    for (const v of violacoes) {
      console.log(
        `  - [${v.impact ?? 'sem impacto'}] ${v.id}: ${v.help} (${v.nodes.length} nó(s)) ${v.helpUrl}`,
      );
      for (const n of v.nodes.slice(0, 5))
        console.log(
          `      ${n.target.join(' ')} → ${n.failureSummary?.replace(/\s+/g, ' ') ?? ''}`,
        );
    }
  }
  const graves = violacoes.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(
    graves.map(
      (v) => `${v.impact}: ${v.id} — ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
    ),
    `Violações graves em ${tela}`,
  ).toEqual([]);
}

test.describe('acessibilidade (axe)', () => {
  let estadoParticipante: Estado;
  let estadoAdmin: Estado;

  test.beforeAll(async ({ browser }) => {
    // Participante inscrito com um check-in parcial no dia de hoje (telas com conteúdo real).
    estadoParticipante = await sessaoVia(browser, async (ctx) => {
      const api = ctx.request;
      const cadastro = await api.post('/api/auth/cadastro', {
        data: {
          nome: PARTICIPANTE.nome,
          email: PARTICIPANTE.email,
          senha: SENHA,
          aceitouTermos: true,
        },
      });
      expect(cadastro.status(), await cadastro.text()).toBe(201);
      const inscricao = await api.post(`/api/desafios/${DESAFIO.slug}/inscricao`);
      expect(inscricao.ok(), await inscricao.text()).toBe(true);
      const atual = await api.get('/api/desafios/atual');
      const { diaAtual } = (await atual.json()) as { diaAtual: number | null };
      expect(diaAtual).toBe(4);
      const checkin = await api.put(`/api/desafios/${DESAFIO.slug}/dias/${diaAtual}`, {
        data: { aguaMl: 1500, exercicio: true, paginasLidas: 4, storyPostado: false },
      });
      expect(checkin.ok(), await checkin.text()).toBe(true);
    });

    estadoAdmin = await sessaoVia(browser, async (ctx) => {
      const login = await ctx.request.post('/api/auth/login', {
        data: { email: ADMIN.email, senha: ADMIN.senha },
      });
      expect(login.ok(), await login.text()).toBe(true);
    });
  });

  test.describe('visitante', () => {
    for (const [caminho, tela] of [
      ['/', 'Entrada'],
      ['/login', 'Login'],
      ['/cadastro', 'Cadastro'],
      ['/privacidade', 'Privacidade'],
      ['/regras', 'Regras'],
    ] as const) {
      test(`${tela} (${caminho})`, async ({ page }) => {
        await page.goto(caminho);
        await auditar(page, `${tela} (${caminho})`);
      });
    }
  });

  test.describe('participante', () => {
    for (const [caminho, tela] of [
      ['/hoje', 'Hoje'],
      ['/progresso', 'Progresso'],
      ['/ranking', 'Ranking'],
    ] as const) {
      test(`${tela} (${caminho})`, async ({ browser }) => {
        const ctx = await browser.newContext({ storageState: estadoParticipante });
        const page = await ctx.newPage();
        try {
          await page.goto(caminho);
          await expect(page).toHaveURL(new RegExp(`${caminho}$`));
          await auditar(page, `${tela} (${caminho})`);
        } finally {
          await ctx.close();
        }
      });
    }
  });

  test.describe('admin', () => {
    test('Admin (/admin) e Participante (/admin/participantes/:id)', async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: estadoAdmin });
      const page = await ctx.newPage();
      try {
        await page.goto('/admin');
        await expect(page).toHaveURL(/\/admin$/);
        await auditar(page, 'Admin (/admin)');

        await page
          .getByRole('link', { name: /Bruno Acessivel/ })
          .first()
          .click();
        await expect(page).toHaveURL(/\/admin\/participantes\/[^/]+$/);
        await auditar(page, 'Admin participante (/admin/participantes/:id)');
      } finally {
        await ctx.close();
      }
    });
  });
});
