// Acessibilidade automatizada (Frontend v2 R11): axe-core (WCAG 2.0/2.1 A e AA) em todas as telas,
// nos temas claro e escuro, no viewport de celular. Falha com qualquer violação "serious" ou "critical";
// todas as violações encontradas (de qualquer impacto) são impressas no log.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test';
import { ADMIN, DADOS_PERFIL, DESAFIO, SENHA, URL_WEB } from './ambiente';
import { criarContaEmulador, entrarEmulador } from './firebase-emulador';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const TEMAS = ['claro', 'escuro'] as const;
type Tema = (typeof TEMAS)[number];
const sufixo = Date.now();
const PARTICIPANTE = { nome: 'Bruno Acessível Lima', email: `bruno.a11y.${sufixo}@e2e.dev` };
const NOVATO = { nome: 'Nina Novata', email: `nina.a11y.${sufixo}@e2e.dev` };

type Contexto = Awaited<ReturnType<Browser['newContext']>>;
type Estado = Awaited<ReturnType<Contexto['storageState']>>;

/** Troca o idToken do emulador pelo cookie de sessão (pela origem do front: proxy /api do preview). */
async function abrirSessao(api: APIRequestContext, idToken: string): Promise<void> {
  const r = await api.post('/api/auth/sessao', { data: { idToken }, headers: { Origin: URL_WEB } });
  expect(r.ok(), await r.text()).toBe(true);
}

async function completarPerfil(api: APIRequestContext, nome: string): Promise<void> {
  const r = await api.patch('/api/me', { data: { nome, ...DADOS_PERFIL }, headers: { Origin: URL_WEB } });
  expect(r.ok(), await r.text()).toBe(true);
}

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
    // Participante inscrito com um check-in parcial no dia de hoje (telas com conteúdo real).
    participante = await estadoDe(browser, async (api) => {
      await abrirSessao(api, await criarContaEmulador({ email: PARTICIPANTE.email, senha: SENHA, nome: PARTICIPANTE.nome }));
      await completarPerfil(api, PARTICIPANTE.nome);
      const inscricao = await api.post(`/api/desafios/${DESAFIO.slug}/inscricao`, { headers: { Origin: URL_WEB } });
      expect(inscricao.ok(), await inscricao.text()).toBe(true);
      const checkin = await api.put(`/api/desafios/${DESAFIO.slug}/dias/4`, {
        data: { aguaMl: 1500, exercicio: true, paginasLidas: 4, storyPostado: false },
        headers: { Origin: URL_WEB },
      });
      expect(checkin.ok(), await checkin.text()).toBe(true);
    });
    // Conta recém-criada, sem os dados de cadastro: vê a /bem-vindo.
    novato = await estadoDe(browser, async (api) => {
      await abrirSessao(api, await criarContaEmulador({ email: NOVATO.email, senha: SENHA, nome: NOVATO.nome }));
    });
    // Admin do global-setup (conta no emulador com e-mail verificado → vinculada no primeiro login).
    admin = await estadoDe(browser, async (api) => {
      await abrirSessao(api, await entrarEmulador(ADMIN.email, ADMIN.senha));
      await completarPerfil(api, ADMIN.nome);
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

      test('admin: Admin (/admin) e Participante (/admin/participantes/:id)', async ({ browser }) => {
        const { ctx, page } = await abrir(browser, tema, admin);
        try {
          await page.goto('/admin');
          await expect(page).toHaveURL(/\/admin$/);
          await auditar(page, `Admin /admin [${tema}]`);

          await page.getByRole('link', { name: /Bruno Acessível/ }).first().click();
          await expect(page).toHaveURL(/\/admin\/participantes\/[^/]+$/);
          await auditar(page, `Admin participante /admin/participantes/:id [${tema}]`);
        } finally {
          await ctx.close();
        }
      });
    });
  }
});
