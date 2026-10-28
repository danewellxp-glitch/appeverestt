# Frontend Everest Desafio (`apps/web`): estado atual e guia de conversão

> Retrato do código em **2026-10-27**. Este documento descreve o frontend como ele está agora e explica, passo a passo, como portar **outro** projeto frontend para a mesma stack e as mesmas convenções. Ele foi escrito para ser entregue a um agente de código (Cursor, Claude Code etc.) junto com o repositório.
>
> Outros agentes ainda estavam editando `apps/web/src/pages/*`, `features/*`, `vite.config.ts`, `index.html` e `main.tsx` durante a leitura. Confira sempre o código antes de confiar num detalhe fino.

## 1. Resumo

- **O que é:** PWA mobile-first (pt-BR, preto e vermelho) para o desafio de 30 dias "Everest". A pessoa se cadastra, garante uma vaga, faz o check-in diário (água, exercício, leitura, 3 fotos e story) e acompanha progresso e ranking. Há também um painel de admin ("embaixador") para invalidar dias e abrir ou fechar inscrições.
- **Monorepo pnpm:** `packages/shared` (`@everest/shared`: regras, schemas zod e tipos da API), `apps/api` (NestJS, pronto) e `apps/web` (React 19, Vite 8, Tailwind v4, react-router 8, TanStack Query 5 e PWA).
- **Pronto:** as 11 rotas (`/`, `/login`, `/cadastro`, `/privacidade`, `/regras`, `/hoje`, `/progresso`, `/ranking`, `/admin`, `/admin/participantes/:id` e o 404), autenticação por cookie, camada de dados, design system, upload de fotos e PWA (instalação e atualização).
- **Todas as telas implementadas** (nenhum `STUB TEMPORÁRIO` em `apps/web/src`). Verificado em 2026-10-27: `tsc -b --noEmit`, `vite build` (bundle inicial ~110 KB gzip), `vitest run` (9/9) e `pnpm lint` passam. Em andamento (Fase 12): testes Playwright + axe, Lighthouse e o roteiro manual no navegador.
- **Pendente:** testes E2E/a11y (Playwright e `@axe-core/playwright`, previstos para a FASE 12 e ainda não instalados), decisões de produto Q1, Q2, Q8, Q15 e LOGO (ver §9) e o host da API em `vercel.json` (`API_HOST_AQUI`). Testes unitários do web já existem, mas só de hooks: `useCheckin.test.tsx` e `useUploadFoto.test.tsx` (2 arquivos e 9 testes, todos passando em 2026-10-27; jsdom por pragma em cada arquivo, sem `vitest.config`).

---

## 2. Stack, versões e como rodar

| Pacote | Range (`apps/web/package.json`) | Instalada | Papel |
|---|---|---|---|
| react / react-dom | `^19.3.1` | 19.3.1 | UI |
| react-router | `^8.5.1` | 8.5.1 | Rotas. **Tudo é importado de `'react-router'`**; o projeto não usa `react-router-dom` |
| @tanstack/react-query | `^5.105.0` | 5.105.0 | Estado do servidor e mutations |
| zod | `4.6.7` (fixa) | 4.6.7 | Validação, com schemas vindos de `@everest/shared` |
| lucide-react | `^1.62.0` | 1.62.0 | Ícones |
| browser-image-compression | `^2.0.2` | 2.0.2 | Compressão de fotos no cliente |
| @everest/shared | `workspace:*` | local | Regras, schemas e tipos |
| vite / @vitejs/plugin-react | `^8.3.5` / `^6.1.2` | 8.3.5 / 6.1.2 | Dev server e build |
| tailwindcss / @tailwindcss/vite | `^4.3.3` | 4.3.3 | CSS v4: configurado via `@theme` no CSS, **sem `tailwind.config.js`** |
| vite-plugin-pwa / workbox-window | `^2.0.0` / `^7.4.1` | 2.0.0 / 7.4.1 | Service worker e manifest |
| @vite-pwa/assets-generator | `^2.0.0` | 2.0.0 | Ícones PWA gerados de `public/logo.png` |
| typescript | `5.9.3` (fixa) | 5.9.3 | Strict |
| vitest / @testing-library/react / @testing-library/dom / jsdom | `^5.0.5` / `^16.3.3` / `^10.4.2` / `^30.1.3` | idem | 2 arquivos de teste de hooks. **Sem `vitest.config.*` e sem bloco `test` no `vite.config.ts`**: o ambiente é declarado em cada arquivo com o pragma `// @vitest-environment jsdom` na 1ª linha |

Ambiente: Node 24 (`.nvmrc`; `engines.node >=22`) e `packageManager: pnpm@10.34.9`. Na raiz ficam ESLint 10 (flat config) com typescript-eslint 8 e Prettier 3.

A lista de dependências permitidas está em `docs/PROMPT_CURSOR.md` §5. Qualquer outra precisa de justificativa. Hoje o projeto **não tem** `clsx`, `tailwind-merge`, `axios`, Redux/Zustand, Formik/Yup nem react-hook-form.

Lista de `docs/PROMPT_CURSOR.md` §5 para `apps/web`: `react`, `react-dom`, `vite`, `typescript`, `tailwindcss` + `@tailwindcss/vite`, `react-router`, `@tanstack/react-query`, `zod`, `vite-plugin-pwa`, `@vite-pwa/assets-generator`, `browser-image-compression`, `lucide-react`, `vitest`, `@testing-library/react` e, só na FASE 12, `@playwright/test` e `@axe-core/playwright`.
- `@testing-library/dom` está instalado como peer do `@testing-library/react`.
- `workbox-window` está instalado para o `vite-plugin-pwa`.

Qualquer outra dependência (por exemplo `date-fns`, `clsx`, `react-hook-form`, `framer-motion`, `react-helmet`, `axios`) precisa de justificativa registrada em `docs/DECISOES.md`.

### Como rodar

```bash
pnpm install
docker compose up -d                      # postgres:16, redis:7, minio (+ bucket privado)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm --filter @everest/shared build       # OBRIGATÓRIO: web/api consomem shared/dist
pnpm --filter api exec prisma migrate dev
pnpm --filter api seed                    # dev: admin + desafio + 5 participantes
pnpm dev                                  # shared (watch) + API :3000 + web :5173
```

- **URLs:** app em http://localhost:5173, API em http://localhost:3000/api, Swagger em `/api/docs` (fora de produção) e console do MinIO em http://localhost:9001 (`everest` / `everest-dev-secret`).
- **Logins do seed:** `admin@everest.dev` (ADMIN), `maria@`, `joao@`, `ana@`, `carlos@` e `beatriz@everest.dev`. A senha de todos é `everest-dev-123`.
- **PWA:** o service worker fica desligado no `vite dev`. Para testar, rode `pnpm --filter web build && pnpm --filter web preview` (porta :4173, que também tem proxy para `/api`).

### Scripts

| Onde | Script | Comando |
|---|---|---|
| raiz | `pnpm dev` / `build` / `typecheck` / `test` | `pnpm -r --parallel --if-present dev` e os equivalentes |
| raiz | `pnpm lint` / `pnpm format` | `eslint .` / `prettier --write .` |
| raiz | `pnpm check:placeholders` | `node scripts/check-placeholders.mjs`: procura `[LINK_DO_APP]`, `@[SEU_@]` e `TODO_DECISAO` em `apps/*/src`, `apps/web/index.html` e `apps/web/public` |
| raiz | `pnpm check:launch` | O mesmo com `--strict`: falha se encontrar algum marcador nessas pastas (não varre `apps/web/pwa-assets.config.ts`; ver §9) |
| web | `dev` / `build` / `preview` / `typecheck` / `test` | `vite` / `tsc -b && vite build` / `vite preview --port 4173` / `tsc -b --noEmit` / `vitest run` |
| web | `generate-pwa-assets` | `pnpm --filter web generate-pwa-assets` (equivale a `pwa-assets-generator`; lê `apps/web/pwa-assets.config.ts` e grava em `public/`) |
| raiz | verificação de produção | `node scripts/verificar-producao.mjs https://<domínio>`: testa o app pelo domínio da Vercel, passando pelo rewrite `/api` (ver `docs/DEPLOY.md` §11) |

### Configuração que afeta o código portado

- **`tsconfig.base.json`:** `strict`, **`noUncheckedIndexedAccess`** (`arr[i]` tem tipo `T | undefined`), `noImplicitOverride`, `noFallthroughCasesInSwitch` e `isolatedModules`.
- **`apps/web/tsconfig.json`:** `moduleResolution: "Bundler"`, `jsx: "react-jsx"` e `types: ["vite/client", "vite-plugin-pwa/react", "vite-plugin-pwa/info"]`.
  - `target`/`lib`: `ES2022` + `DOM` + `DOM.Iterable`;
  - `noEmit: true`, `allowImportingTsExtensions: false`, `verbatimModuleSyntax: false`;
  - `include: ["src", "vite.config.ts", "pwa-assets.config.ts"]` (os testes em `src` também passam pelo typecheck).
  - Use `import type { … }` para tipos (é o padrão do código, embora `verbatimModuleSyntax` esteja desligado).
- **Sem `paths` e sem alias `@/`:** os imports internos são **relativos** (`'../../lib/api'`) e não terminam em `.ts`.
- **ESLint:** `@typescript-eslint/no-explicit-any: 'error'` e `no-unused-vars` (o prefixo `_` é ignorado). Não há plugins de react-hooks nem de jsx-a11y.
- **Prettier:** `singleQuote`, `trailingComma: "all"`, `printWidth: 100`, `endOfLine: "lf"`. O `.editorconfig` define 2 espaços e LF.
- **Variáveis de ambiente:** só `VITE_APP_URL` (em `.env.example` e tipada em `src/vite-env.d.ts`). **Não existe `VITE_API_URL`**: a API é sempre `/api`, na mesma origem. Para adicionar uma variável:
  1. coloque `VITE_X=` em `apps/web/.env.example`;
  2. adicione `readonly VITE_X?: string;` em `interface ImportMetaEnv` (`src/vite-env.d.ts`);
  3. leia com `import.meta.env.VITE_X?.trim()` e trate `undefined`.

  **O valor fica público no bundle.** Segredos nunca vão para `VITE_*`.
- **`@everest/shared`:** exporta só `dist/` (build ESM e CJS com tsup). O web importa sempre `from '@everest/shared'`, sem subpaths, e o pacote precisa estar buildado.

---

## 3. Estrutura de pastas (`apps/web`)

```
apps/web/
├─ .env.example · index.html · package.json · tsconfig.json · vite.config.ts
├─ pwa-assets.config.ts · vercel.json
├─ public/  logo.png · favicon.ico · pwa-64x64.png · pwa-192x192.png · pwa-512x512.png
│           maskable-icon-512x512.png · apple-touch-icon-180x180.png
└─ src/
   ├─ main.tsx · vite-env.d.ts
   ├─ app/router.tsx                 ← todas as rotas
   ├─ styles/index.css               ← Tailwind v4 + tokens @theme
   ├─ lib/        api.ts · erros.ts · queryClient.ts · queries.ts · useOnline.ts · datas.ts
   ├─ content/    regras.ts · privacidade.ts        ← textos estáticos
   ├─ components/
   │  ├─ GridDias.tsx
   │  ├─ ui/      Botao.tsx · CampoTexto.tsx · basicos.tsx
   │  └─ layout/  AppShell.tsx · BottomNav.tsx · Watermark.tsx
   ├─ features/
   │  ├─ auth/     rotas.tsx · sessao.ts · formulario.ts · useLogin.ts · useCadastro.ts
   │  │            useLogout.ts · usePosAutenticacao.ts · ErroAposEntrar.tsx
   │  ├─ desafio/  useInscrever.ts
   │  ├─ checkin/  useCheckin.ts · useCheckin.test.tsx · useDiaSelecionado.ts · formatos.ts · CabecalhoDia.tsx
   │  │            CardRequisito.tsx · Interruptor.tsx · CardAgua.tsx · CardExercicio.tsx
   │  │            CardLeitura.tsx · CardStory.tsx · ResumoDia.tsx · IndicadorSalvamento.tsx
   │  │            TelaAntesInicio.tsx · TelaEncerrado.tsx
   │  ├─ fotos/    comprimir.ts · enviarArquivo.ts · fotosValidas.ts · useUploadFoto.ts · useUploadFoto.test.tsx
   │  │            usePollingFotos.ts · CardFotos.tsx · SlotFoto.tsx
   │  ├─ ranking/  TabelaRanking.tsx · ResumoProgresso.tsx
   │  ├─ admin/    consultas.ts · ListaParticipantes.tsx · PainelDia.tsx · FotosDia.tsx
   │  │            ToggleInscricoes.tsx
   │  └─ pwa/      PwaGlobais.tsx · useInstallPrompt.ts · BotaoBaixarApp.tsx · ModalInstrucoesIOS.tsx
   └─ pages/  Entrada · Login · Cadastro · Privacidade · Regras · Hoje · Progresso · Ranking
              Admin · AdminParticipante · NaoEncontrada        (.tsx, todas com `export default`)
```

| O quê | Onde mora | Convenção |
|---|---|---|
| Página (rota) | `src/pages/X.tsx` | `export default function X()`, porque é carregada com `lazy` |
| Lógica e componentes de domínio | `src/features/<domínio>/` | named exports; hooks `useX` |
| UI genérica | `src/components/ui/` | `Botao`, `CampoTexto`, `Card`, `Alerta`… |
| Layout | `src/components/layout/` | `AppShell`, `BottomNav`, `Watermark` |
| Infra (HTTP, cache, erros) | `src/lib/` | `api`, `chaves`, `queryClient`, `mensagemDoErro` |
| Textos estáticos | `src/content/` | objetos `as const` |
| Regras, schemas e tipos | `packages/shared/src/` | **nunca duplicar no front** |

**Arquivos:**
- componentes em `PascalCase.tsx` (`CardAgua.tsx`);
- hooks em `useCamelCase.ts`, ou `.tsx` se tiverem JSX;
- utilitários em `camelCase.ts` (`comprimir.ts`, `formatos.ts`, `datas.ts`);
- testes em `<arquivo>.test.tsx`, ao lado do arquivo testado.

Uma pasta em `features/` por domínio, sem `index.ts`/barrel: importe direto do arquivo. Componentes usados por mais de um domínio sobem para `components/` (por exemplo, `GridDias`).

**Assets:** arquivos em `public/` são referenciados por caminho absoluto (`<img src="/logo.png">`) e entram no precache do SW pelo `globPatterns`. Um asset importado em `src` passa pelo bundle do Vite.

**Idioma dos nomes:** entidades e identificadores de domínio em pt-BR (`Participante`, `vagaNumero`, `comprimirFoto`, `ehApiError`, `aoSelecionar`, `rotulo`). Código técnico genérico pode ficar em inglês (`useOnline`, `AppShell`, `useInstallPrompt`). Toda a UI é em pt-BR.

---

## 4. Rotas e autenticação

### 4.1 Árvore (`src/app/router.tsx`)

```tsx
import { lazy } from 'react';
import { createBrowserRouter } from 'react-router';
import { AppShell } from '../components/layout/AppShell';
import { RotaAdmin, RotaInscrito, RotaProtegida } from '../features/auth/rotas';
import Entrada from '../pages/Entrada';               // eager
const Hoje = lazy(() => import('../pages/Hoje'));      // demais páginas: lazy
// ...
export const router = createBrowserRouter([
  { path: '/', element: <Entrada /> },                 // FORA do AppShell (full-bleed)
  { element: <AppShell />, children: [                 // layout sem path
      { path: '/login', element: <Login /> },
      { path: '/cadastro', element: <Cadastro /> },
      { path: '/privacidade', element: <Privacidade /> },
      { path: '/regras', element: <Regras /> },
      { element: <RotaProtegida />, children: [
          { element: <RotaInscrito />, children: [
              { path: '/hoje', element: <Hoje /> },
              { path: '/progresso', element: <Progresso /> },
              { path: '/ranking', element: <Ranking /> } ] },
          { element: <RotaAdmin />, children: [
              { path: '/admin', element: <Admin /> },
              { path: '/admin/participantes/:id', element: <AdminParticipante /> } ] } ] },
      { path: '*', element: <NaoEncontrada /> } ] },
]);
```

- O lazy loading é feito com `React.lazy` + `element`, sem usar o `route.lazy` do router.
- O **único `<Suspense>`** fica no `AppShell` (`<Suspense fallback={<Carregando />}><Outlet /></Suspense>` dentro do `<main>`). Por isso o header aparece na hora e só o conteúdo fica em loading.
- Não existe `errorElement` nem `ErrorBoundary` no router. Um erro de render, ou a falha ao baixar um chunk `lazy` (por exemplo, depois de um deploy), mostra a **tela de erro padrão do react-router, em inglês**. Isso é uma lacuna conhecida, não uma convenção. Se precisar, adicione `errorElement` no objeto do `AppShell` e da Entrada; não é preciso dependência nova.
- Não há `<ScrollRestoration />`.
- Não há título por página: todas usam `<title>Everest Desafio</title>` do `index.html`. Se o projeto antigo usa `react-helmet`, não traga a lib: o React 19 aceita `<title>` dentro do componente.

**Entry point `src/main.tsx`** (ordem real):

```tsx
// ...imports; o último é import './styles/index.css' (CSS global)
definirAoNaoAutenticado(() => { queryClient.setQueryData(chaves.me, null); }); // nível de módulo
iniciarCapturaInstalacao();                        // nível de módulo (beforeinstallprompt)
const raiz = document.getElementById('root');
if (!raiz) throw new Error('Elemento #root não encontrado');
createRoot(raiz).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <PwaGlobais />   {/* FORA do router: não pode usar Link/useNavigate/useLocation */}
    </QueryClientProvider>
  </StrictMode>,
);
```

- **Provider global novo** (contexto de UI, por exemplo) vai aqui, envolvendo o `RouterProvider`.
- Um componente global que precise do router vai no `AppShell`. Ele não cobre `/`: a Entrada fica fora do `AppShell`.
- `StrictMode` monta efeitos 2× em dev. Efeitos com efeito colateral (navegar, inscrever) usam um guard com `useRef`, como em `usePosAutenticacao` (`iniciado.current`).
- Não há React Query Devtools (não está nas dependências permitidas).

### 4.2 Tabela de rotas

| Path | Arquivo | Carga | Guards | Layout | Acesso | Redirect |
|---|---|---|---|---|---|---|
| `/` | `pages/Entrada.tsx` | eager | — | próprio (`BarraTopo` + `<Watermark/>`), sem AppShell | todos | "Entrar no desafio": sem login vai para `/cadastro?acao=inscrever`; logado faz a inscrição e vai para `/hoje` |
| `/login` | `pages/Login.tsx` | lazy | — (`usePosAutenticacao`) | AppShell | todos | com sessão, vai para `acao` ou `volta`, ou para o padrão |
| `/cadastro` | `pages/Cadastro.tsx` | lazy | — (`usePosAutenticacao`) | AppShell | todos | igual ao `/login` |
| `/privacidade` | `pages/Privacidade.tsx` | lazy | — | AppShell | todos | — |
| `/regras` | `pages/Regras.tsx` | lazy | — | AppShell | todos | — |
| `/hoje` | `pages/Hoje.tsx` | lazy | `RotaProtegida` → `RotaInscrito` | AppShell | logado e inscrito | sem sessão: `/login?volta=…`; sem inscrição: `/` |
| `/progresso` | `pages/Progresso.tsx` | lazy | `RotaProtegida` → `RotaInscrito` | AppShell | logado e inscrito | igual ao `/hoje` |
| `/ranking` | `pages/Ranking.tsx` | lazy | `RotaProtegida` → `RotaInscrito` | AppShell | logado e inscrito | igual ao `/hoje` |
| `/admin` | `pages/Admin.tsx` | lazy | `RotaProtegida` → `RotaAdmin` | AppShell | `papel === 'ADMIN'`, sem exigir inscrição | sem sessão: `/login?volta=…`; não admin: `/hoje` |
| `/admin/participantes/:id` | `pages/AdminParticipante.tsx` | lazy | `RotaProtegida` → `RotaAdmin` | AppShell | ADMIN | usa `useParams().id` e `?dia=N` |
| `*` | `pages/NaoEncontrada.tsx` | lazy | — | AppShell | todos | link para `/` |

**A bottom nav depende do usuário, não da rota.** O `AppShell` renderiza `{inscrito && <BottomNav />}` com `inscrito = Boolean(me?.participacao)`. O `<main>` usa `pb-28` quando há bottom nav e `pb-10` quando não há. Os itens são `/hoje` (CalendarCheck), `/progresso` (TrendingUp), `/ranking` (Trophy) e `/regras` (BookOpen).

Para adicionar um item, edite `ITENS` em `src/components/layout/BottomNav.tsx`:

```ts
const ITENS = [
  { para: '/hoje', rotulo: 'Hoje', Icone: CalendarCheck },
  // ...
  { para: '/nova', rotulo: 'Nova', Icone: AlgumIconeLucide },
] as const;
```

- Troque `grid-cols-4` por `grid-cols-5` no `<ul>`. Com 5 itens em 390 px, cada coluna fica com cerca de 78 px; use rótulos curtos.
- O `NavLink` não usa `end`. Um item `/admin` ficaria ativo também em `/admin/participantes/:id`.
- A nav só aparece para **inscritos**. Um admin não inscrito não a vê.
- **Acoplamento:** `PwaGlobais` posiciona os toasts em `bottom-[calc(env(safe-area-inset-bottom)+4.5rem)]` porque a nav tem `min-h-14`. Se mudar a altura da nav, ajuste esse valor.
- Para links só de admin, o padrão é o ícone no header do `AppShell` (`Shield` → `/admin`), não a bottom nav.

### 4.3 Guards (`src/features/auth/rotas.tsx`)

Os três guards leem `useMe()` e renderizam `<Outlet />` quando a condição passa.

| Guard | `isPending` | `isError` (rede ou 5xx) | Barra quando | Destino |
|---|---|---|---|---|
| `RotaProtegida` | `<Carregando/>` | `Alerta` "Não foi possível carregar sua sessão…" (sem redirect) | `!me` | `<Navigate to={`/login?volta=${encodeURIComponent(pathname + search)}`} replace />` |
| `RotaInscrito` | idem | idem | `!me?.participacao` | `<Navigate to="/" replace />` |
| `RotaAdmin` | idem | idem | `me?.usuario.papel !== 'ADMIN'` | `<Navigate to="/hoje" replace />` |

```ts
// packages/shared/src/tipos.ts
interface MeResposta { usuario: { id; nome; email; papel: 'USUARIO' | 'ADMIN' }; participacao: ParticipacaoResumo | null }
interface ParticipacaoResumo { participanteId; desafioId; desafioSlug; vagaNumero: number | null; ehEmbaixador: boolean; dataInscricao: string }
```

As páginas de inscrito obtêm o slug com `const slug = useMe().data?.participacao?.desafioSlug`.

### 4.4 Query params

| Param | Quem produz | Quem consome | Comportamento |
|---|---|---|---|
| `?volta=<path>` | `RotaProtegida` | `usePosAutenticacao` via `destinoSeguro(volta)` (`features/auth/sessao.ts`) | Depois do login, navega com `replace`. Recusa o que não começa com `/`, o que começa com `//` ou `/\`, e o próprio `/login` ou `/cadastro` |
| `?acao=inscrever` | `Entrada` | `usePosAutenticacao` e os textos de Login/Cadastro | **Tem prioridade sobre `volta`.** Se a pessoa não tem participação: `ensureQueryData(['desafio','atual'])`, depois `inscrever(slug)`, depois `/hoje`. Muda também os textos da tela ("Passo 1 de 2 · Crie sua conta", "Garantindo sua vaga…") |
| `?dia=N` em `/hoje` | `Progresso` (`GridDias aoSelecionar` → `/hoje?dia=N`) e o próprio `GridDias` da Hoje | `useDiaSelecionado(progresso)` (`features/checkin/useDiaSelecionado.ts`) | Aceita de 1 até `min(diaAtual, totalDias)`; qualquer outro valor cai no dia atual. A troca usa `setParams(…, { replace: true })` |
| `?dia=N` em `/admin/participantes/:id` | a própria página | a própria página | `diaDaUrl()` aceita só dias existentes que não sejam `FUTURO`; o padrão é o `diaAtual` ou o último dia passado. A troca usa `{ replace: true, preventScrollReset: true }` |

Os links entre Login e Cadastro preservam a query: `to={{ pathname: '/cadastro', search: local.search }}`.

### 4.5 Fluxo cadastro → inscrição → `/hoje`

1. **`/` (Entrada):** o CTA aparece se o status não é `ENCERRADO`, `inscricoesAbertas` é verdadeiro e `vagasDisponiveis > 0`. As vagas são recarregadas a cada 30 s com `useDesafioAtual({ atualizarACada: 30_000 })`.
   - Visitante: `navegar('/cadastro?acao=inscrever')`.
   - Logado sem inscrição: `inscrever.mutate(slug, { onSuccess: () => navegar('/hoje') })`.
   - Inscrito: link "Ir para o desafio" → `/hoje`.
2. **`/cadastro`:** valida com `cadastroSchema.safeParse` (`nome`, `email`, `senha`, `aceitouTermos: true`) e chama `useCadastro().mutate`, que faz `POST /auth/cadastro`.
   - No sucesso: `limparDadosDeSessaoAnterior(qc)` e `qc.setQueryData(chaves.me, me)`.
   - `EMAIL_EM_USO` vira erro no campo `email`.
3. **`usePosAutenticacao(me)`** dispara quando o `me` passa a existir no cache e faz `POST /desafios/:slug/inscricao`.
   - `onSuccess` grava a `participacao` no `['me']` **antes** de navegar e depois invalida `me` e `desafioAtual`.
   - Se a inscrição falhar, a página mostra `<ErroAposEntrar/>` (a pessoa continua logada).
4. `navegar('/hoje', { replace: true })`.

O hook retorna `{ redirecionando, erroInscricao }`. As páginas mostram `Carregando` com "Garantindo sua vaga…" ou "Entrando…". O login (`useLogin`, `POST /auth/login`) segue o mesmo caminho. `CREDENCIAIS_INVALIDAS` aparece como um `Alerta` geral.

### 4.6 Sessão (cookie httpOnly, sem token no front)

- **Cookie:** `everest_sessao` com `httpOnly`, `sameSite: 'lax'`, `secure` em produção, `path: '/'` e `maxAge` de 30 dias. Contém um JWT `{ sub, papel, v: tokenVersao }`.
- **`JwtAuthGuard`:** recusa token inválido, expirado ou com `v` diferente do `tokenVersao` do usuário, com `401 NAO_AUTENTICADO`.
- **O front nunca lê, guarda nem envia token.** O `fetch` usa `credentials: 'include'` e o cookie vai sozinho.
- **Mesma origem:**
  - Dev: o proxy do Vite manda `/api` para `http://localhost:3000` (`changeOrigin: false`) nas portas 5173 e 4173.
  - Produção: o `apps/web/vercel.json` faz rewrite de `/api/:path*` para `https://API_HOST_AQUI/api/:path*` (**placeholder**) e manda o resto para `/index.html`.
- O `apps/web/vercel.json` também define:
  - `framework: "vite"`;
  - `installCommand: pnpm install --frozen-lockfile --filter "web..."`;
  - `buildCommand: pnpm --filter "web..." run build`;
  - `outputDirectory: "dist"`;
  - cabeçalhos em todas as rotas: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, **`X-Frame-Options: DENY`** e **`Permissions-Policy: camera=(self), microphone=(), geolocation=(), payment=(), usb=()`**;
  - `Cache-Control: public, max-age=31536000, immutable` em `/assets/*`;
  - `no-cache` em `sw.js`, `registerSW.js`, `index.html` e `manifest.webmanifest`.

  **Impacto no port:** em produção, recursos do projeto antigo que usem **microfone, geolocalização, Payment Request ou WebUSB** ficam bloqueados; o app não pode ser embutido em `<iframe>`; não altere as regras de cache do SW.
- **CSRF:** em POST/PUT/PATCH/DELETE, se o header `Origin` vier e não estiver em `WEB_ORIGIN`, a resposta é `403 PROIBIDO`.
- **401 global** (`main.tsx`): `definirAoNaoAutenticado(() => queryClient.setQueryData(chaves.me, null))`. O código **não navega**. O redirect acontece porque `RotaProtegida` re-renderiza. Usam `silenciar401: true`: `/auth/me`, `/auth/login`, `/auth/cadastro` e `/auth/logout`.
- **Logout** (`useLogout`): `POST /auth/logout`. No `onSettled`, faz `setQueryData(me, null)`, remove as queries que não são `me`/`desafio` e navega para `/` com `replace`.

### 4.7 react-router 8: o que usar

- Importe tudo de `'react-router'`: `createBrowserRouter`, `RouterProvider`, `Outlet`, `Navigate`, `Link`, `NavLink`, `useNavigate`, `useLocation`, `useParams`, `useSearchParams`.
- **Redirect declarativo:** `<Navigate to="..." replace />`.
- **Redirect imperativo:** `const navegar = useNavigate(); void navegar('/hoje', { replace: true });`. O `void` é necessário porque o retorno é uma promise.
- **NavLink:** `className={({ isActive }) => …}`. O `aria-current="page"` é automático.
- **Layouts e guards** são rotas sem `path` que renderizam `<Outlet/>`.

---

## 5. Camada de dados

### 5.1 Cliente HTTP: `src/lib/api.ts`

```ts
export async function api<T>(caminho: string, opcoes: OpcoesApi = {}): Promise<T>
interface OpcoesApi { method?: 'GET'|'POST'|'PUT'|'PATCH'|'DELETE'; body?: unknown; signal?: AbortSignal; silenciar401?: boolean }
export class ApiError extends Error { codigo: CodigoErro | 'REDE'; status: number; campos: Record<string, string> }
export function ehApiError(e: unknown, codigo?: CodigoErro | 'REDE'): e is ApiError
export function definirAoNaoAutenticado(fn: () => void): void
```

- **Requisição:** `fetch('/api' + caminho, { credentials: 'include' })`. Sempre envia `Accept: application/json`. Quando há `body`, envia `Content-Type: application/json` com `JSON.stringify(body)`.
- **Falha de rede:** vira `ApiError('REDE', …, 0)`. Um `AbortError` é relançado como está.
- **Resposta não-2xx:** o corpo `{ codigo, mensagem, campos? }` só é aceito se `codigo` estiver em `CODIGOS_ERRO`. Sem corpo válido, o código vira `NAO_AUTENTICADO` (401) ou `ERRO_INTERNO`. A mensagem sai de `mensagemDoErro()` (`lib/erros.ts`). Em `campos`, a chave é o caminho do campo (`'email'`, `'motivo'`; `'_'` para a raiz).
- **Sucesso:** devolve o JSON convertido para `T`, ou `null` se o corpo vier vazio. **Não há validação em runtime das respostas.**

Outros utilitários:
- `lib/useOnline.ts`: `useOnline(): boolean`.
- `lib/datas.ts`: `formatarData(iso, { comDiaSemana? })` dá "4 de novembro" e `formatarDataCurta(iso)` dá "04/11". Datas de dia chegam como `'YYYY-MM-DD'`. **Nunca use `new Date('YYYY-MM-DD')` direto**: em fuso negativo ele mostra o dia anterior.

### 5.2 TanStack Query

`src/lib/queryClient.ts`:

```ts
queries: { staleTime: 30_000, refetchOnWindowFocus: true,
  retry: (falhas, erro) => (ehApiError(erro) && erro.status >= 400 && erro.status < 500) ? false : falhas < 2 }
mutations: { retry: false }
```

O `networkMode` fica no padrão (`'online'`), então mutations ficam **pausadas** offline. O `useCheckin` expõe isso como `aguardandoConexao`.

**Chaves de cache:** use sempre o objeto `chaves` de `src/lib/queries.ts`.

```ts
export const chaves = {
  me: ['me'] as const,
  desafioAtual: ['desafio', 'atual'] as const,
  progresso: (slug: string) => ['progresso', slug] as const,
  dia: (slug: string, n: number) => ['dia', slug, n] as const,
  ranking: (slug: string) => ['ranking', slug] as const,
  adminParticipantes: (slug: string) => ['admin', 'participantes', slug] as const,
  adminParticipante: (slug: string, id: string) => ['admin', 'participante', slug, id] as const,
  adminDia: (slug: string, id: string, n: number) => ['admin', 'dia', slug, id, n] as const,
};
```

O primeiro segmento (`me`, `desafio`, `progresso`, `dia`, `ranking`, `admin`) é usado em invalidações por prefixo.

**Hooks de leitura:**

| Hook | Arquivo | Endpoint | Retorno | Opções |
|---|---|---|---|---|
| `useMe()` | `lib/queries.ts` | GET `/auth/me` (`silenciar401`) | `MeResposta \| null` (401 vira `null`) | `staleTime: 5 min` |
| `useDesafioAtual({ atualizarACada? })` | `lib/queries.ts` | GET `/desafios/atual` | `DesafioAtual` | `refetchInterval` opcional, só com a aba visível |
| `useMeuProgresso(slug?)` | `lib/queries.ts` | GET `/desafios/:slug/meu-progresso` | `MeuProgresso` | `enabled: Boolean(slug)` |
| `useDia(slug?, n \| null)` | `lib/queries.ts` | GET `/desafios/:slug/dias/:n` | `DiaDetalhe` | `staleTime: 60 s`, `refetchInterval: 8 min` (URLs assinadas valem 10 min) |
| `useRanking(slug?)` | `lib/queries.ts` | GET `/desafios/:slug/ranking` | `RankingResposta` | `enabled: Boolean(slug)` |
| `useSlugAdmin()` | `features/admin/consultas.ts` | (usa `useMe` + `useDesafioAtual`) | `{ slug, carregando, erro, tentarDeNovo }` | — |
| `useAdminParticipantes(slug)` | `features/admin/consultas.ts` | GET `/admin/desafios/:slug/participantes` | `AdminParticipantesResposta` | — |
| `useAdminParticipante(slug, id)` | `features/admin/consultas.ts` | GET `…/participantes/:id` | `AdminParticipanteDetalhe` | `id` passa por `encodeURIComponent` |
| `useAdminDia(slug, id, n)` | `features/admin/consultas.ts` | GET `…/participantes/:id/dias/:n` | `AdminDiaDetalhe` | `staleTime: 60 s`, `refetchInterval: 8 min` |

Os hooks de `lib/queries.ts` e `features/admin/consultas.ts` interpolam o `slug` **sem** `encodeURIComponent`. `useInscrever` e os `id`/`diaId` de admin usam `encodeURIComponent`. Em hooks novos, **codifique todo segmento dinâmico** (`encodeURIComponent(slug)`). Os slugs atuais são seguros, mas não confie nisso.

**Hooks de mutação:**

| Hook | Arquivo | Ação |
|---|---|---|
| `useLogin` / `useCadastro` | `features/auth/` | POST `/auth/login` e `/auth/cadastro` (`silenciar401`) |
| `useLogout` | `features/auth/useLogout.ts` | POST `/auth/logout` |
| `useInscrever()` | `features/desafio/useInscrever.ts` | POST `/desafios/:slug/inscricao` |
| `useCheckin(slug, dia, podeEditar)` | `features/checkin/useCheckin.ts` | PUT com debounce de 800 ms; retorna `{ valores, alterar, estado, erro, tentarDeNovo, temRascunho, aguardandoConexao }` |
| `useFotosDia(slug, n)` | `features/fotos/useUploadFoto.ts` | `{ estados, enviar(tipo, file), remover(tipo) }` |
| `usePollingFotos(slug, dia)` | `features/fotos/usePollingFotos.ts` | polling enquanto houver foto `ENVIADA` |
| `useAtualizarInscricoes(slug)` / `useInvalidacaoDia()` | `features/admin/consultas.ts` | PATCH de admin |

Detalhes do `useCheckin`:
- Usa `mutationKey: ['checkin', slug]` (constante `CHAVE_MUTACAO_CHECKIN = ['checkin']`) e `scope: { id: 'checkin:' + slug }`, então os envios rodam em série.
- Valida o body com `checkinSchema.parse` antes de enviar e **nunca envia `concluido`**.
- Envia o pendente na hora em `visibilitychange:hidden`, em `pagehide`, ao trocar de dia e ao desmontar.
- `estado` é `'ocioso'|'pendente'|'salvando'|'salvo'|'erro'`.

**Outros exports úteis:**

| Export | Arquivo |
|---|---|
| `formatarDataHora(iso)` (fuso `TIMEZONE_PADRAO`) | `features/admin/consultas.ts` |
| `valoresDoDia(d: DiaDetalhe): CheckinInput`, `CHAVE_MUTACAO_CHECKIN`, tipos `EstadoSalvamento`, `ErroSalvamento` | `features/checkin/useCheckin.ts` |
| `useCheckin(slug: string, dia: DiaDetalhe \| undefined, podeEditar: boolean)`: **o 2º argumento é o objeto `DiaDetalhe`, não o número** | idem |
| `useDiaSelecionado(progresso: MeuProgresso)` | `features/checkin/useDiaSelecionado.ts` |
| `formatarNumero(n)`, `limitar(valor, minimo, maximo)` | `features/checkin/formatos.ts` |
| `fotoEhValida`, `tiposFotosValidas`, `ROTULO_TIPO_FOTO` | `features/fotos/fotosValidas.ts` |
| `NOME_FOTO`, `RequisitoDiario`, `requisitosDiarios(instagram, hashtag)`, `regras` | `content/regras.ts` |
| `privacidade` (`ConteudoPrivacidade`, `SecaoPrivacidade`) | `content/privacidade.ts` |
| `ehIOS()`, `ResultadoInstalacao = 'aceito'\|'recusado'\|'indisponivel'`, `InstallPrompt` | `features/pwa/useInstallPrompt.ts` |
| `BotaoBaixarApp({ className? })`, `ModalInstrucoesIOS({ aberto, onFechar })`, `ErroAposEntrar({ mensagem })` | `features/pwa/*`, `features/auth/ErroAposEntrar.tsx` |
| `queryClient` (singleton) | `lib/queryClient.ts` |

### 5.3 Endpoints (prefixo `/api`)

Níveis de acesso:
- **público:** sem guard.
- **logado:** cookie válido; senão `401 NAO_AUTENTICADO`.
- **inscrito:** logado e inscrito no desafio; senão `403 NAO_INSCRITO`. Slug inexistente dá `404`.
- **admin:** papel `ADMIN`; senão `403 PROIBIDO`. O admin não precisa estar inscrito.

O `:n` é coagido para inteiro de 1 a 365 (senão `400 VALIDACAO`). Depois o serviço exige `1..totalDias` (senão `404`).

| Método | Rota | Auth | Body | Resposta | Erros |
|---|---|---|---|---|---|
| GET | `/health` | público | – | `{ db, redis }` (503 se algum estiver com erro) | – |
| POST | `/auth/cadastro` | público, 5/min | `cadastroSchema`: `nome` (2–80), `email` (máx. 254), `senha` (8–72), `aceitouTermos: true` | `MeResposta` (201) e grava o cookie | `VALIDACAO`, `EMAIL_EM_USO`, `MUITAS_REQUISICOES` |
| POST | `/auth/login` | público, 5/min | `loginSchema`: `email`, `senha` | `MeResposta` e grava o cookie | `CREDENCIAIS_INVALIDAS`, 429 |
| POST | `/auth/logout` | logado | – | `{ ok: true }` e limpa o cookie | 401 |
| GET | `/auth/me` | logado | – | `MeResposta` (participação do desafio ativo) | 401 (no front vira `null`) |
| GET | `/desafios/atual` | público | – | `DesafioAtual { id, nome, slug, dataInicio, dataFim, totalDias, status, diaAtual, diasParaInicio, totalVagas, vagasDisponiveis, inscricoesAbertas, instagramHandle, hashtag, timezone }` | 404 "Nenhum desafio ativo no momento." |
| POST | `/desafios/:slug/inscricao` | logado | – | `InscricaoResposta { participacao, criada }`: 201 se criou, 200 se já existia | `DESAFIO_ENCERRADO`, `INSCRICOES_FECHADAS`, `VAGAS_ESGOTADAS` (409), 404 |
| GET | `/desafios/:slug/meu-progresso` | inscrito | – | `MeuProgresso { diaAtual, status, totalDias, dias: DiaResumo[], diasConcluidos, evolucao, melhorSequencia, sequenciaAtual }` | 403 |
| GET | `/desafios/:slug/dias/:n` | inscrito | – | `DiaDetalhe { numeroDia, data, aguaMl, exercicio, paginasLidas, storyPostado, concluido, invalidado, motivoInvalidacao, editavel, requisitosPendentes, fotos: FotoDia[] }` | 400/403/404 |
| PUT | `/desafios/:slug/dias/:n` | inscrito | `checkinSchema`: `aguaMl` (0–20000), `exercicio`, `paginasLidas` (0–2000), `storyPostado`. **Sem `concluido`** | `DiaDetalhe` com `concluido` recalculado | `DESAFIO_NAO_INICIADO`, `DESAFIO_ENCERRADO`, `DIA_NAO_EDITAVEL` (409), `VALIDACAO` |
| POST | `/desafios/:slug/dias/:n/fotos/upload-url` | inscrito, 30/min | `uploadUrlSchema`: `tipo: 'AGUA'\|'EXERCICIO'\|'LEITURA'`, `mimeType: 'image/jpeg'\|'image/png'\|'image/webp'`, `tamanhoBytes` (≤ 5 MB) | `{ fotoId, uploadUrl, headers: { 'Content-Type' } }` | `FOTO_GRANDE_DEMAIS` (413), `VALIDACAO`, janela de edição |
| POST | `/desafios/:slug/dias/:n/fotos/:fotoId/confirmar` | inscrito | – | `{ fotoId, status }` | 404, `FOTO_INVALIDA` (422), 413 |
| DELETE | `/desafios/:slug/dias/:n/fotos/:tipo` | inscrito | – | `{ ok: true }` | 404, janela de edição |
| GET | `/desafios/:slug/ranking` | inscrito | – | `RankingResposta { itens: { posicao, participanteId, nomeExibicao, ehEmbaixador, diasConcluidos, melhorSequencia, sequenciaAtual, dataInscricao }[], minhaPosicao }` | 403 |
| GET | `/admin/desafios/:slug/participantes` | admin | – | `AdminParticipantesResposta { desafio, participantes[] }` | 403 |
| GET | `/admin/desafios/:slug/participantes/:id` | admin | – | `AdminParticipanteDetalhe { participante, progresso }` | 404 |
| GET | `/admin/desafios/:slug/participantes/:id/dias/:n` | admin | – | `AdminDiaDetalhe` = `DiaDetalhe` + `{ diaId \| null, participanteId, nomeParticipante, invalidadoEm }` | 404 |
| PATCH | `/admin/dias/:diaId/invalidacao` | admin | `invalidacaoSchema`: `invalidado`, `motivo?` (obrigatório se `invalidado: true`, máx. 500) | `{ diaId, invalidado, concluido, motivoInvalidacao }` | 404. Com `diaId === null` não há como invalidar |
| PATCH | `/admin/desafios/:slug` | admin | `atualizarDesafioSchema`: `inscricoesAbertas` | `{ slug, nome, inscricoesAbertas, totalVagas }` | 404 |

**Não existem** (a API tem exatamente os 19 handlers acima; não invente):
- troca ou recuperação de senha, verificação de e-mail;
- edição de perfil ou nome, avatar, exclusão de conta;
- perfil público de outro participante (a visão por participante é só admin);
- lista de desafios (só `GET /desafios/atual`; não há `GET /desafios/:slug`);
- notificações ou push, comentários, likes;
- paginação (ranking e listas de admin vêm inteiros).

Telas do projeto antigo que dependam disso viram **PENDÊNCIA**. Um endpoint novo exige mudar `apps/api`, criar o tipo e o schema em `packages/shared/src/tipos.ts` e `schemas.ts` (re-exportados por `src/index.ts`) e rodar `pnpm --filter @everest/shared build`. No `pnpm dev` isso já roda em watch.

Semântica que importa para a UI:
- **`DiaResumo.situacao`:** `'CONCLUIDO' | 'INVALIDADO' | 'HOJE' | 'NAO_CONCLUIDO' | 'FUTURO'`.
- **`editavel`:** é `true` com `status === 'EM_ANDAMENTO'` e `n === diaAtual`. Também é `true` para `n < diaAtual` se a env da API `PERMITIR_EDITAR_DIAS_ANTERIORES=true` (o padrão é `false`, decisão X1). Fonte: `apps/api/src/modules/dias/dia.service.ts` (`ehEditavel`) e `apps/api/src/config/env.ts`.
- **`FotoDia { id, tipo, status: 'PENDENTE'|'ENVIADA'|'CONFIRMADA'|'REJEITADA', thumbUrl, url }`:** `url` existe com status `ENVIADA` ou `CONFIRMADA`; `thumbUrl`, só com `CONFIRMADA`. São URLs assinadas válidas por 10 min.
- **Datas:** `data`, `dataInicio` e `dataFim` chegam como `'YYYY-MM-DD'`; `dataInscricao` e `invalidadoEm`, como ISO 8601 completo.
- **Rate limit:** 100 req/min no global. Estourar dá `429 MUITAS_REQUISICOES`.

### 5.4 Protocolo de upload de foto (`features/fotos/`)

1. **`comprimirFoto(file)`** (`comprimir.ts`): `browser-image-compression` com `{ maxWidthOrHeight: 1600, maxSizeMB: 1, fileType: 'image/jpeg', useWebWorker: true }` e `libURL` local via `import … from 'browser-image-compression/dist/browser-image-compression.js?url'`, para não buscar no CDN, convertida em URL absoluta (`new URL(urlLibCompressao, window.location.href).href`). A lib é importada sob demanda (`await import('browser-image-compression')`). Antes de comprimir, o `useFotosDia` recusa um arquivo com `type` que não seja `image/*` (tipo vazio passa).
2. **POST `upload-url`** com `{ tipo, mimeType, tamanhoBytes }`. O servidor **apaga na hora a foto anterior do mesmo tipo**. Se algo falhar depois disso, o front precisa recarregar o dia.
3. **PUT direto no storage** (`enviarArquivo(url, headers, corpo, aoProgresso)`): XHR com `withCredentials = false` e **exatamente** os `headers` recebidos, porque o `Content-Type` entra na assinatura. Um 403 vira "O link de envio expirou…".
4. **POST `/:fotoId/confirmar`**: o servidor faz um HeadObject. A foto vai para `ENVIADA` (**e já conta para a conclusão**) e entra na fila `fotos` (job `processar-foto`; constantes `FILA_FOTOS` e `JOB_PROCESSAR` em `apps/api/src/modules/fotos/fotos.constantes.ts`). A chamada é idempotente.
5. **Recarregar:** invalidar `chaves.dia`, `chaves.progresso` e `chaves.ranking`.
6. **Polling** (`usePollingFotos`): enquanto houver foto `ENVIADA`, invalida o `dia` a cada 2 s por cerca de 30 ciclos e depois a cada 10 s. Pula a recarga se houver mutation `['checkin', slug]` em andamento. No fim do processamento, invalida `progresso` e `ranking`.
7. **Worker:** gera webp de 1600 px e thumb de 400 px, remove o EXIF e marca `CONFIRMADA`. Imagem inválida vira `REJEITADA`.
8. **DELETE `/fotos/:tipo`:** um `NAO_ENCONTRADO` é tratado como "já não existia". Depois, invalida `dia`, `progresso` e `ranking`.

**Reuso na UI:**
- `useFotosDia(slug: string, numeroDia: number)` (`features/fotos/useUploadFoto.ts`) retorna `{ estados, enviar, remover }`:
  - `estados: Partial<Record<TipoFoto, EstadoFoto>>`;
  - `EstadoFoto = { upload: { fase: 'comprimindo'|'enviando'|'confirmando'; progresso: number /*0–100*/; previewUrl: string } | null; removendo: boolean; erro: string | null }`;
  - `enviar(tipo: TipoFoto, arquivo: File): Promise<void>` e `remover(tipo: TipoFoto): Promise<void>`. **Nunca lançam erro**: a falha fica em `estados[tipo].erro`.
- Chame também `usePollingFotos(slug, dia: DiaDetalhe | undefined)` na página.
- Para exibir, use `fotoEhValida(foto)`, `tiposFotosValidas(fotos)` e `ROTULO_TIPO_FOTO` (`features/fotos/fotosValidas.ts`), ou os componentes prontos `CardFotos`/`SlotFoto`.
- O input (em `SlotFoto`) usa `accept="image/*"` **sem `capture`** e fica escondido com `className="sr-only" tabIndex={-1} aria-hidden` atrás de um `Botao` que chama `ref.current?.click()`. No `onChange`, faça `e.currentTarget.value = ''` para permitir escolher o mesmo arquivo de novo.
- **Só existem 3 tipos de foto (`AGUA`, `EXERCICIO`, `LEITURA`), ligados a um dia.** Não há upload genérico (avatar, anexo). Isso exigiria endpoint novo na API.
- Em dev, o storage é o MinIO (`S3_ENDPOINT=http://localhost:9000`, outra origem que o app). As URLs assinadas servem para `<img src>` e para o PUT via XHR do `enviarArquivo`; não dependa de outros acessos a elas a partir do front (CORS do bucket não verificado para isso).

### 5.5 Códigos de erro

O formato é sempre `{ codigo, mensagem, campos? }`. As mensagens do front ficam em `MENSAGENS_ERRO` (`src/lib/erros.ts`).

| Código | HTTP | Mensagem no front |
|---|---|---|
| `VALIDACAO` | 400 | Confira os dados informados. |
| `NAO_AUTENTICADO` | 401 | Faça login para continuar. |
| `PROIBIDO` | 403 | Você não tem permissão para fazer isso. |
| `NAO_ENCONTRADO` | 404 | Não encontramos o que você procurou. |
| `EMAIL_EM_USO` | 409 | Este e-mail já tem cadastro. Faça login. |
| `CREDENCIAIS_INVALIDAS` | 401 | E-mail ou senha incorretos. |
| `VAGAS_ESGOTADAS` | 409 | As vagas acabaram. Que pena! Fique de olho no próximo desafio. |
| `INSCRICOES_FECHADAS` | 409 | As inscrições estão fechadas. |
| `NAO_INSCRITO` | 403 | Você ainda não está inscrito no desafio. |
| `DESAFIO_NAO_INICIADO` | 409 | O desafio ainda não começou. |
| `DESAFIO_ENCERRADO` | 409 | O desafio já terminou. |
| `DIA_NAO_EDITAVEL` | 409 | Este dia não pode mais ser editado. |
| `FOTO_INVALIDA` | 422 | Não conseguimos usar essa foto. Tente outra. |
| `FOTO_GRANDE_DEMAIS` | 413 | A foto é grande demais (máximo 5 MB). |
| `MUITAS_REQUISICOES` | 429 | Muitas tentativas seguidas. Espere um minuto e tente de novo. |
| `ERRO_INTERNO` | 500 | Algo deu errado do nosso lado. Tente novamente. |
| `REDE` (só no front) | 0 | `MENSAGENS_ERRO.REDE` = "Sem conexão. Verifique sua internet." (usado só via `mensagemDoErro('REDE')`). O texto efetivamente lançado por `api()` é "Sem conexão com o servidor. Verifique sua internet." (`lib/api.ts`), e o `enviarArquivo` usa "Falha de conexão ao enviar a foto. Tente de novo." |

`mensagemDoErro(codigo, doServidor?)` usa a mensagem do servidor apenas para `VALIDACAO`, `DIA_NAO_EDITAVEL`, `FOTO_INVALIDA` e `NAO_ENCONTRADO`.

Para erros de formulário, `features/auth/formulario.ts` exporta:
- `errosDasIssues(issues, campos)`: converte erros do zod para `{ campo: primeira mensagem }`, filtrando pelos `campos` informados;
- `errosDoServidor(erro, campos)`: lê `ApiError.campos`;
- `mensagemGeral(erro)`;
- o tipo `ErrosCampos<C>`.

### 5.6 Invalidação de cache depois de cada mutação

| Mutação | O que fazer no cache |
|---|---|
| login / cadastro | `limparDadosDeSessaoAnterior(qc)` (remove tudo que não é `me`/`desafio`), depois `setQueryData(chaves.me, me)` |
| logout (no `onSettled`) | `setQueryData(chaves.me, null)`, remover as queries que não são `me`/`desafio`, navegar para `/` |
| 401 em qualquer lugar | `setQueryData(chaves.me, null)` (ouvinte global) |
| inscrição: sucesso | `setQueryData(me, { ...atual, participacao })` **antes** de navegar, depois invalidar `me` e `desafioAtual` |
| inscrição: `VAGAS_ESGOTADAS`, `INSCRICOES_FECHADAS` ou `DESAFIO_ENCERRADO` | invalidar `desafioAtual` |
| PUT check-in: `onMutate` | `cancelQueries(dia)` e update otimista recalculando `requisitosPendentes` (o `concluido` continua o do servidor) |
| PUT check-in: sucesso | invalidar `progresso(slug)` e `ranking(slug)`; `setQueryData(dia, resposta)` só se for a edição mais recente |
| PUT check-in: erro | rollback; com `DIA_NAO_EDITAVEL` ou `DESAFIO_ENCERRADO`, descartar o rascunho e invalidar `dia` e `progresso` |
| upload confirmado, DELETE de foto, erro depois do `upload-url` | invalidar `dia(slug, n)`, `progresso(slug)` e `ranking(slug)` |
| admin: PATCH inscrições | `setQueryData(adminParticipantes(slug), …)` e invalidar `desafioAtual` |
| admin: PATCH invalidação | invalidar os prefixos `['admin']`, `['ranking']`, `['progresso']` e `['dia']` |

### 5.7 O que vem do `@everest/shared`

- **Constantes:**
  - `METAS = { aguaMl: 3000, paginas: 10, fotos: 3 }`;
  - `TIPOS_FOTO`, `REQUISITOS = ['AGUA','EXERCICIO','LEITURA','FOTOS','STORY']`;
  - `MIME_TYPES_FOTO`, `TAMANHO_MAX_FOTO_BYTES` (5 MiB);
  - `LIMITES = { aguaMlMax, paginasMax, nomeMin, nomeMax, senhaMin, senhaMax, motivoInvalidacaoMax }`;
  - `TOTAL_DIAS_PADRAO = 30`, `TIMEZONE_PADRAO = 'America/Sao_Paulo'`;
  - `CODIGOS_ERRO`.
- **Schemas zod** (mensagens em pt-BR): `cadastroSchema`, `loginSchema`, `checkinSchema`, `tipoFotoSchema`, `uploadUrlSchema`, `invalidacaoSchema`, `atualizarDesafioSchema`, `numeroDiaSchema`, além dos tipos `*Input`.
- **Tipos:** `MeResposta`, `DesafioAtual`, `MeuProgresso`, `DiaResumo`, `DiaDetalhe`, `FotoDia`, `RankingResposta`, `Admin*`…
- **Regras:**
  - `requisitosPendentes`, `calcularConcluido`, `contarFotosDistintas`;
  - `calcularDiaAtual`, `hojeNoFuso`, `dataDoDia`;
  - `calcularMelhorSequencia`, `calcularSequenciaAtual`, `calcularEvolucao`;
  - `ordenarRanking`, `nomeExibicao` ("Maria Souza Lima" → "Maria L.").
- **Regra central:** `concluido` **nunca** sai do cliente. O front só mostra prévias (por exemplo, "3 de 5 requisitos"). Em `Hoje.tsx`, o banner "Dia concluído! 🔥" só aparece com `dia.concluido && pendentes.length === 0`.

---

## 6. Design system

### 6.1 Tokens (`@theme` em `src/styles/index.css`)

O arquivo começa com `@import 'tailwindcss';`. Cada `--color-x` gera as classes `bg-x`, `text-x`, `border-x` etc. O tema é único e **escuro** (`color-scheme: dark`).

| Token | Classe | Hex | Uso |
|---|---|---|---|
| `--color-fundo` | `bg-fundo` | `#000000` | fundo da página (já aplicado no `body`), header (`bg-fundo/90`) e bottom nav (`bg-fundo/95`; itens com `min-h-14`) |
| `--color-superficie` | `bg-superficie` | `#0a0a0a` | `Card` |
| `--color-superficie-2` | `bg-superficie-2` | `#171717` | inputs, botão secundário, trilhos, `Skeleton`, estado desabilitado |
| `--color-borda` | `border-borda` | `#262626` | bordas e divisórias |
| `--color-texto` | `text-texto` | `#ffffff` | texto principal |
| `--color-texto-2` | `text-texto-2` | `#a3a3a3` | texto secundário, rótulos, ícones inativos |
| `--color-vermelho` | `bg-vermelho` | `#dc2626` | **só** fundo de botão ou barra, dia concluído, switch ligado e títulos grandes (≥ 24 px). **Nunca em texto pequeno** |
| `--color-vermelho-texto` | `text-vermelho-texto` | `#ef4444` | texto vermelho pequeno, borda de campo com erro, dia "HOJE", **outline de foco** |
| `--color-sucesso` | `text-sucesso` | `#22c55e` | selo "Feito" e estados de sucesso |
| `--font-sans` | `font-sans` | — | `system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` (**sem web font**) |

Contraste: `#dc2626` sobre preto dá cerca de 4,3:1 e reprova AA para texto pequeno; `#ef4444` sobre preto dá cerca de 5,6:1 e passa; branco sobre `#dc2626` dá cerca de 4,8:1 e passa.

Para estados semânticos sem token, usa-se a paleta padrão do Tailwind no padrão fundo `*-950`, borda `*-900` e texto `*-100`:
- erro: `border-red-900 bg-red-950/60 text-red-100`;
- aviso, offline e dia invalidado: `amber-*`;
- sucesso: `green-*`;
- hover do botão primário: `hover:bg-red-700`.

**Base global e utilitários próprios:**

```css
body { @apply bg-fundo text-texto font-sans antialiased; min-height: 100dvh; }
:focus-visible { outline: 2px solid var(--color-vermelho-texto); outline-offset: 2px; } /* foco global */
@utility pt-safe { padding-top: env(safe-area-inset-top); }
@utility pb-safe { padding-bottom: env(safe-area-inset-bottom); }
@utility rotulo  { @apply text-xs font-semibold uppercase tracking-widest text-texto-2; }
@media (prefers-reduced-motion: reduce) { /* zera animações e transições */ }
```

### 6.2 Tipografia e layout

| Elemento | Classes |
|---|---|
| h1 "marca" (Login, Cadastro, Regras, Privacidade) | `text-4xl font-black uppercase leading-none tracking-tight` |
| h1 simples (Progresso, Ranking, Admin, Hoje) | `text-3xl font-bold` |
| hero da Entrada | `text-[2.6rem] font-black uppercase leading-[0.95] tracking-tight` |
| h2 de card | `text-lg font-bold` |
| rótulo ("eyebrow") | classe `rotulo` ou `<Rotulo>` |
| texto de botão | `text-sm font-bold uppercase tracking-wide` (já embutido no `Botao`) |
| input | `text-base` (evita o zoom no iOS) |

- **Mobile-first:** o conteúdo usa `mx-auto max-w-md px-4`, aplicado pelo `AppShell`. O viewport de referência é **390×844**.
- **Header:** `sticky top-0 z-20 border-b border-borda bg-fundo/90 pt-safe backdrop-blur`.
- **Bottom nav:** `fixed inset-x-0 bottom-0 z-20 … pb-safe`.
- **Altura:** use `min-h-dvh`, não `h-screen`/`100vh`.
- **Raios:** `rounded-xl` para botões, inputs e dias; `rounded-2xl` para cards; `rounded-full` para barras.

### 6.3 Componentes

**`Botao`** (`components/ui/Botao.tsx`)

```ts
type Variante = 'primario' | 'secundario' | 'fantasma';
interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;     // default 'primario'
  carregando?: boolean;    // disabled + aria-busy + <Loader2 animate-spin>
  larguraTotal?: boolean;  // w-full
  icone?: ReactNode;       // ícone à esquerda (passe aria-hidden)
}                          // type default = 'button' → passe type="submit" em forms
```

- **Base:** `min-h-11 min-w-11 rounded-xl px-4 py-2.5`.
- **Variantes:**
  - `primario`: `bg-vermelho text-white hover:bg-red-700`;
  - `secundario`: `border border-borda bg-superficie-2`;
  - `fantasma`: `hover:bg-superficie-2`.
- O `className` é concatenado ao final, sem `tailwind-merge`.

**`CampoTexto`** (`components/ui/CampoTexto.tsx`)

```ts
interface CampoTextoProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  rotulo: string;              // <label htmlFor> visível, obrigatório
  erro?: string | undefined;   // text-vermelho-texto + aria-invalid + borda vermelha
  dica?: string;               // aparece só quando não há erro
}
// id vem de useId() (não passe id). aria-describedby → `${id}-dica` / `${id}-erro`. className vai no WRAPPER.
```

**`basicos.tsx`** (`components/ui/basicos.tsx`)

| Export | Props | Notas |
|---|---|---|
| `Card` | `HTMLAttributes<HTMLDivElement>` | `rounded-2xl border border-borda bg-superficie p-4` |
| `Skeleton` | `{ className? }` | `aria-hidden animate-pulse`; o tamanho vem do `className` (ex.: `h-24`) |
| `Carregando` | `{ texto? = 'Carregando…' }` | `role="status"`; é o fallback do Suspense |
| `Alerta` | `{ tipo?: 'erro'\|'aviso'\|'info'\|'sucesso' = 'info', children, className?, acao?: ReactNode }` | `role="alert"` só no tipo `erro`; nos demais, `role="status"` |
| `Rotulo` | `{ children, className? }` | `<p class="rotulo">` |
| `BarraProgresso` | `{ valor, maximo, rotulo, className? }` | `role="progressbar"` com `aria-*`; `rotulo` é obrigatório |

**`GridDias`** (`components/GridDias.tsx`)

```ts
GridDias(props: { dias: DiaResumo[]; selecionado?: number | null; aoSelecionar?: (n: number) => void; rotulo?: string })
```

- Renderiza `<ol class="grid grid-cols-6 gap-2">`.
- Sem `aoSelecionar`, as células são `role="img"` (só leitura).
- Cores por `situacao`:
  - `CONCLUIDO`: `bg-vermelho` com ícone `Check`;
  - `INVALIDADO`: `border border-amber-700 bg-amber-950/60 text-amber-100`, com ícone `AlertTriangle`;
  - `HOJE`: `border-2 border-vermelho-texto`;
  - `NAO_CONCLUIDO`: `bg-superficie-2 text-texto-2`;
  - `FUTURO`: `border border-borda bg-transparent text-texto-2/60`; fica `disabled` só no modo clicável (com `aoSelecionar`).
- O dia selecionado recebe `ring-2 ring-white ring-offset-2 ring-offset-fundo` e `aria-current="true"`.

**Layout** (`components/layout/`):
- **`AppShell`:**
  - Header com logo (link para `/`), `Shield` → `/admin` (só ADMIN, `aria-label="Painel do embaixador"`), `LogOut` (`aria-label="Sair da conta"`). O `AppShell` também renderiza `<Watermark />`.
  - `<main>` com `Suspense`.
  - `BottomNav` se a pessoa for inscrita.
- **`BottomNav`:** `<nav aria-label="Navegação principal">`.
- **`Watermark`:** `aria-hidden fixed inset-0 -z-10 opacity-5`, com a logo.

**Primitivos de domínio** (`features/checkin/`):
- `Interruptor({ ligado, rotulo, disabled?, aoAlternar })` é um `<button role="switch" aria-checked>` com `min-h-12`.
- `CardRequisito({ titulo, icone, cumprido, children })` monta uma `<section aria-labelledby>` com o selo "Feito"/"Pendente".

**Ícones:** `lucide-react`, com import nomeado. Use `size-4` dentro de botões e `size-5` na nav, no header e nos alertas. Coloque **sempre `aria-hidden`** quando houver texto ao lado.

### 6.4 Acessibilidade (regras do projeto)

1. Alvos de toque ≥ 44 px (`min-h-11`; `min-w-11` em botão só de ícone).
2. Foco visível global. **Nunca** use `outline-none` sem substituto, e não adicione `focus:ring`.
3. Labels visíveis com `aria-invalid` e `aria-describedby` (já no `CampoTexto`).
4. `aria-live="polite"` ou `role="status"` para salvamento, vagas e uploads. `role="alert"` **só** para erro.
5. **Uma `<h1>` por página.** Cards usam `<h2>` com `aria-labelledby`.
6. Vermelho em texto pequeno usa sempre `text-vermelho-texto`.
7. Ícone decorativo leva `aria-hidden`; botão só com ícone leva `aria-label`; imagem decorativa leva `alt=""`.
8. `prefers-reduced-motion` já é tratado no CSS global.
9. Os testes de acessibilidade com `@axe-core/playwright` estão previstos para a FASE 12 e **ainda não foram instalados**.

---

## 7. Telas, features e PWA: status

| Rota | Status | Hooks e dados | Destaques |
|---|---|---|---|
| `/` Entrada | ✅ pronto (273 linhas) | `useDesafioAtual({atualizarACada:30_000})`, `useMe`, `useInscrever`, `useLogout` | `PainelVagas` (`BarraProgresso`); `AcaoPrincipal` (inscrito / encerrado / fechado / esgotado / entrar); `BotaoBaixarApp`; estados skeleton, `NAO_ENCONTRADO` e erro |
| `/login` | ✅ | `useLogin`, `usePosAutenticacao` | `loginSchema.safeParse`; o foco vai para o primeiro `[aria-invalid="true"]` |
| `/cadastro` | ✅ | `useCadastro`, `usePosAutenticacao` | `cadastroSchema`; checkbox de privacidade obrigatório; `EMAIL_EM_USO` com link "Entrar" |
| `/privacidade` | ✅ (texto provisório Q8) | — | `content/privacidade.ts`: `privacidade.secoes` e `avisoProvisorio` |
| `/regras` | ✅ | `useDesafioAtual`, `useMe` | `content/regras.ts` (`requisitosDiarios()` e `regras`); CTA "Quero participar" para quem não é inscrito |
| `/hoje` | ✅ pronta (typecheck, build e testes passam) | `useMe`, `useMeuProgresso`, `useDesafioAtual`, `useDia`, `useDiaSelecionado`, `useCheckin`, `usePollingFotos`, `useOnline` | `NAO_INICIADO` → `TelaAntesInicio`; `ENCERRADO` → `TelaEncerrado`; em andamento: `CabecalhoDia`, `GridDias`, `AvisosDia`, `ResumoDia`, `IndicadorSalvamento`, `CardAgua`, `CardExercicio`, `CardLeitura`, `CardFotos`, `CardStory`. Offline ou dia não editável deixam a tela só para leitura |
| `/progresso` | ✅ | `useMeuProgresso` | `CartoesProgresso` e `LegendaGrid` (`features/ranking/ResumoProgresso.tsx`); `GridDias` leva para `/hoje?dia=N` |
| `/ranking` | ✅ | `useRanking` | `TabelaRanking`, `SeloEmbaixador`, card "Sua posição", `scrollIntoView` respeitando o reduced-motion |
| `/admin` | ✅ | `useSlugAdmin`, `useDesafioAtual`, `useAdminParticipantes` (página); `useAtualizarInscricoes` (em `ToggleInscricoes`) | `ToggleInscricoes` (switch com confirmação), `ListaParticipantes` (busca sem acento com `useDeferredValue`) |
| `/admin/participantes/:id` | ✅ | `useSlugAdmin`, `useAdminParticipante` (página); `useAdminDia`, `useInvalidacaoDia` (em `PainelDia`) | `PainelDia` (invalidar com motivo obrigatório ou revalidar), `FotosDia`, `?dia=N`; `diaId === null` mostra "Sem registro neste dia" |
| `*` | ✅ | — | 404 com "Voltar ao início" |

**Padrão de estados em toda tela:** `isPending` mostra `Skeleton` ou `Carregando`; `isError` mostra `<Alerta tipo="erro" acao={<Botao variante="secundario" onClick={() => void q.refetch()}>Tentar de novo</Botao>}>`; vazio mostra um `Card` com texto; offline desabilita a edição.

### PWA

- **`vite.config.ts` → `VitePWA`:**
  - `registerType: 'prompt'`, `injectRegister: false`, `includeManifestIcons: false`, `devOptions.enabled: false`.
  - Manifest: `name 'Everest Desafio'`, `short_name 'Everest'`, `lang 'pt-BR'`, `display 'standalone'`, `orientation 'portrait'`, cores `#000000`, ícones 192, 512 e maskable 512.
  - Workbox: `globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg,webp,woff2}']`, `navigateFallback: '/index.html'`, `navigateFallbackDenylist: [/^\/api/]`, `cleanupOutdatedCaches: true`. **Sem `runtimeCaching`.**
- **`features/pwa/`:**
  - `useInstallPrompt()` retorna `{ instalado, ios, podeInstalar, instalar() }`; a captura começa em `iniciarCapturaInstalacao()`.
  - `BotaoBaixarApp` tenta, nesta ordem: prompt nativo, `ModalInstrucoesIOS`, copiar `urlDoApp()` e mostrar o link.
  - `PwaGlobais` usa `useRegisterSW` e mostra os toasts "Nova versão disponível / Atualizar" e "App pronto para uso offline", o `IndicadorOffline` e um `registro.update()` a cada 1 h.
- **`index.html`:** `lang="pt-BR"`, `viewport-fit=cover`, `theme-color #000000`, metas iOS e `apple-touch-icon-180x180.png`.
- **Ícones:** gerados de `public/logo.png` por `pwa-assets.config.ts` e versionados em `public/`. A logo atual é provisória (`TODO_DECISAO(LOGO)`).
- **Riscos conhecidos:**
  - O offline global agora é só o `IndicadorOffline` (`features/pwa/PwaGlobais.tsx`), em todas as rotas. Em `/hoje`, o `AvisosDia` (`pages/Hoje.tsx`) mostra também um `Alerta` "Você está offline…", então ali o aviso ainda aparece duas vezes.
  - O `PwaGlobais` continua reservando o espaço da bottom nav (`bottom-[calc(env(safe-area-inset-bottom)+4.5rem)]`) mesmo onde ela não aparece.
  - Abrir o app offline mostra só o shell, porque `/api` não é cacheado.

---

## 8. Guia de conversão do seu frontend para esta stack

### 8a. Passo a passo

1. **Prepare o ambiente.** Siga a §2 e garanta que `pnpm dev` sobe e que você consegue logar com `maria@everest.dev` / `everest-dev-123`. Rode `pnpm --filter @everest/shared build` antes de tudo.
2. **Inventarie o projeto antigo.** Liste cada tela, rota, chamada HTTP, store global, formulário, componente visual e asset. Monte uma tabela "tela antiga → rota nova" usando a §4.2:
   - telas equivalentes **substituem ou enriquecem** a página existente;
   - telas novas viram rotas novas;
   - telas sem equivalente no domínio (por exemplo, um "perfil") precisam de endpoint na API. **Não invente endpoint no front**: veja a §5.3 e, se faltar algo, registre como pendência.
3. **Crie as páginas.** Cada uma vai em `src/pages/NomeEmPtBr.tsx` com `export default function NomeEmPtBr()`. Registre em `src/app/router.tsx`:
   ```tsx
   const MinhaTela = lazy(() => import('../pages/MinhaTela'));
   // dentro do grupo certo:
   //   pública com layout → filha direta do AppShell
   //   precisa só de login (sem inscrição) → filha DIRETA de <RotaProtegida/>, irmã de <RotaInscrito/> e <RotaAdmin/>
   //   precisa de login + inscrição → filha de <RotaInscrito/>
   //   admin → filha de <RotaAdmin/>
   //   full-bleed (sem header/nav) → irmã do AppShell, como Entrada (com <Watermark/> próprio)
   //   rota com parâmetro → path '/x/:id' e `const { id } = useParams()` (id: string | undefined)
   { path: '/minha-tela', element: <MinhaTela /> },
   ```
   - Não há `errorElement`, `<ScrollRestoration />` nem título por página (ver §4.1).
   - A página renderiza **só o conteúdo**, com uma `<h1>`. Header, nav, `max-w-md`, padding e Suspense já vêm do AppShell.
   - Se a tela entra na navegação principal, adicione um item em `ITENS` de `components/layout/BottomNav.tsx` (hoje são 4 colunas, `grid-cols-4`; ajuste se mudar). Veja os cuidados na §4.2.
4. **Mova o HTTP para `api<T>()` + TanStack Query.**
   - Leitura: reaproveite os hooks de `lib/queries.ts` ou de `features/admin/consultas.ts`. Para um hook novo, siga o padrão:
     ```ts
     export function useAlgo(slug: string | undefined) {
       return useQuery({
         queryKey: chaves.algo(slug ?? ''),          // adicione a chave em `chaves`
         queryFn: ({ signal }) => api<AlgoResposta>(`/desafios/${slug ?? ''}/algo`, { signal }),
         enabled: Boolean(slug),
       });
     }
     ```
   - **Escrita:** o modelo é `features/desafio/useInscrever.ts`:
     ```ts
     const ERROS_QUE_MUDAM_VAGAS = ['VAGAS_ESGOTADAS', 'INSCRICOES_FECHADAS', 'DESAFIO_ENCERRADO'] as const;

     export function useInscrever() {
       const qc = useQueryClient();
       return useMutation({
         mutationFn: (slug: string) =>
           api<InscricaoResposta>(`/desafios/${encodeURIComponent(slug)}/inscricao`, { method: 'POST' }),
         onSuccess: (resposta) => {
           // grava no cache ANTES de navegar (senão o guard usa o `me` antigo)
           qc.setQueryData<MeResposta | null>(chaves.me, (atual) =>
             atual ? { ...atual, participacao: resposta.participacao } : atual,
           );
           void qc.invalidateQueries({ queryKey: chaves.me });
           void qc.invalidateQueries({ queryKey: chaves.desafioAtual });
         },
         onError: (erro) => {
           if (ERROS_QUE_MUDAM_VAGAS.some((codigo) => ehApiError(erro, codigo))) {
             void qc.invalidateQueries({ queryKey: chaves.desafioAtual });
           }
         },
       });
     }
     // na tela: inscrever.mutate(slug, { onSuccess: () => void navegar('/hoje') });
     ```
     - Para atualizar o cache com a resposta (sem refetch), siga `useAtualizarInscricoes` (`features/admin/consultas.ts`): `qc.setQueryData<T>(chave, (antigo) => antigo ? { ...antigo, campo } : antigo)`.
     - Para esperar a invalidação antes de liberar a UI, faça `onSuccess: async () => { await Promise.all([...invalidateQueries]) }`, como em `useInvalidacaoDia`.
     - `mutations.retry` é `false` e a mutation fica pausada offline (`networkMode: 'online'`). Mostre `isPaused` se fizer sentido.
     - Na UI, use `mutation.isPending` para `Botao carregando` e `mutation.error` com `mensagemGeral(erro)`.
     - Invalidações por tipo de mutação: §5.6.
   - Erros: `ehApiError(e, 'CODIGO')`; o texto vem de `e.message` (já traduzido por `mensagemDoErro`); erros por campo vêm de `e.campos`.
   - Tipos das respostas: importe de `@everest/shared`. Não redeclare interfaces da API no front.
5. **Troque a validação.** Use os schemas do `@everest/shared` (`cadastroSchema.safeParse(dados)`) com `errosDasIssues` e `errosDoServidor` de `features/auth/formulario.ts`. Para um formulário novo sem schema, o schema deve ser criado no **shared** (e usado também na API), não no web. Esqueleto real de `pages/Login.tsx`:
   ```tsx
   const CAMPOS = ['email', 'senha'] as const;
   type Campo = (typeof CAMPOS)[number];
   // dentro do componente:
   const login = useLogin();
   const [erros, setErros] = useState<ErrosCampos<Campo>>({});
   const [tentativas, setTentativas] = useState(0);
   const formRef = useRef<HTMLFormElement>(null);
   useEffect(() => {                 // foco no 1º campo inválido após cada tentativa com erro
     if (tentativas === 0) return;
     formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
   }, [tentativas]);

   function limparErro(campo: Campo) {
     setErros((atual) => (atual[campo] ? { ...atual, [campo]: undefined } : atual));
   }

   function enviar(e: FormEvent<HTMLFormElement>) {
     e.preventDefault();
     if (login.isPending) return;
     const resultado = loginSchema.safeParse({ email, senha });
     if (!resultado.success) {
       login.reset();
       setErros(errosDasIssues(resultado.error.issues, CAMPOS));
       setTentativas((n) => n + 1);
       return;
     }
     setErros({});
     login.mutate(resultado.data, {
       onError: (erro) => { setErros(errosDoServidor(erro, CAMPOS)); setTentativas((n) => n + 1); },
     });
   }
   // <form ref={formRef} noValidate onSubmit={enviar} aria-label="Entrar na conta">
   //   {login.isError && <Alerta tipo="erro">{mensagemGeral(login.error)}</Alerta>}
   //   <CampoTexto rotulo="E-mail" name="email" type="email" autoComplete="email" value={email}
   //     onChange={(e) => { setEmail(e.target.value); limparErro('email'); }} erro={erros.email} />
   //   <Botao type="submit" larguraTotal carregando={login.isPending}>Entrar</Botao>
   ```
   - Sempre use `noValidate`: a validação é do zod, não do navegador.
6. **Troque os estilos.** Apague `tailwind.config.js`, CSS modules, styled-components e web fonts, e use as classes de token da §6.1. Um token novo vira `--color-<nome>` em `@theme` (`src/styles/index.css`). Monte classes condicionais com template string, já que não há `clsx`.
7. **Troque os componentes.**
   - `<button>` vira `<Botao variante>`;
   - `label` + `input` + erro vira `<CampoTexto rotulo erro dica>`;
   - checkbox estilizado ou toggle vira `Interruptor`;
   - box ou painel vira `Card`;
   - spinner vira `Carregando` ou `Botao carregando`;
   - placeholder de loading vira `Skeleton`;
   - banner vira `Alerta`;
   - barra de progresso vira `BarraProgresso`;
   - ícones viram `lucide-react`.
8. **Implemente os estados obrigatórios** em cada tela: carregando, erro com "Tentar de novo", vazio, offline (`useOnline()` desabilita edição) e sem permissão (os guards já tratam).
9. **Ajuste para TS strict:** sem `any` (use `unknown` e zod), trate `arr[i]` como `T | undefined` e use imports relativos sem extensão.
10. **PWA:** não mexa no `VitePWA` além do necessário. **Nunca** adicione `runtimeCaching` para `/api` nem para URLs de storage. Assets novos em `public/` entram no precache pelo `globPatterns`.
11. **Textos:** tudo em pt-BR. Textos longos e estáticos vão em `src/content/*.ts`. Decisão de produto pendente vira `TODO_DECISAO(Qx)` e é registrada em `docs/DECISOES.md`.
12. **Verifique** com o checklist da §8d.

### 8b. "Se no seu projeto você usa X → aqui use Y"

| No seu projeto | Aqui |
|---|---|
| Create React App / Webpack | Vite 8 (`vite.config.ts`; scripts `dev`, `build`, `preview`) |
| `.env` com `REACT_APP_*` / `process.env.X` | `VITE_*` / `import.meta.env.VITE_X`, declarada em `src/vite-env.d.ts` e em `.env.example` (hoje só existe `VITE_APP_URL`) |
| `REACT_APP_API_URL` / baseURL absoluta | **nenhuma**: sempre `/api/...` relativo (proxy no dev, rewrite do Vercel em produção) |
| axios / `fetch` solto / instância com interceptors | `api<T>(caminho, { method, body, signal, silenciar401 })` de `src/lib/api.ts` |
| interceptor de 401 que redireciona | ouvinte global (`definirAoNaoAutenticado`) zera `chaves.me`, e `RotaProtegida` redireciona |
| Redux / Zustand / Context para dados do servidor | TanStack Query 5 (`useQuery`/`useMutation`) com as chaves de `chaves` |
| Redux/Zustand para estado de UI | `useState`/`useReducer` locais; estado navegável em query params (`useSearchParams`) |
| `useEffect` + `fetch` + `setLoading` | `useQuery` (`isPending`, `isError`, `data`, `refetch`) |
| `react-router-dom` v5/v6 (`BrowserRouter`, `<Routes>`) | `react-router` 8: `createBrowserRouter` + `RouterProvider`, imports de `'react-router'` |
| `<PrivateRoute>` / HOC de auth | rotas-layout `RotaProtegida`, `RotaInscrito`, `RotaAdmin` com `<Outlet/>` |
| `history.push` / `useHistory` | `const navegar = useNavigate(); void navegar('/x', { replace: true })` |
| `localStorage.setItem('token', jwt)` / header `Authorization: Bearer` | **cookie httpOnly `everest_sessao`**: nunca guardar nem ler token; `credentials: 'include'` já está no `api()` |
| "usuário logado" em store/localStorage | `useMe()` (`MeResposta \| null`) |
| Formik / react-hook-form + Yup | schemas zod do `@everest/shared` (`safeParse`) + `CampoTexto` + `errosDasIssues`/`errosDoServidor` |
| `tailwind.config.js` (`theme.extend.colors`) | `@theme { --color-x: … }` em `src/styles/index.css` |
| CSS Modules / styled-components / Sass / emotion | classes Tailwind v4 com os tokens |
| `clsx` / `classnames` / `tailwind-merge` | template string (não estão nas dependências permitidas) |
| Google Fonts / `@font-face` | stack do sistema (`font-sans`) |
| heroicons / react-icons / FontAwesome | `lucide-react` (`size-4`/`size-5`, `aria-hidden`) |
| MUI / Chakra / shadcn/ui | `Botao`, `CampoTexto`, `Card`, `Alerta`, `Skeleton`, `Carregando`, `Rotulo`, `BarraProgresso`, `Interruptor`, `GridDias` |
| `h-screen` / `100vh` | `min-h-dvh`; barras fixas com `pt-safe`/`pb-safe` |
| `bg-black`, `text-gray-400`, `text-red-600` | `bg-fundo`, `text-texto-2`, `text-vermelho-texto` |
| `new Date('2026-11-04')` para exibir | `formatarData` / `formatarDataCurta` de `lib/datas.ts` |
| alias `@/components/...` | import relativo (`'../components/ui/Botao'`) |
| `export const Page = …` para páginas | `export default function Pagina()` (necessário para o `lazy`) |
| Jest | Vitest 5 + Testing Library (`renderHook`, `waitFor`, `act`). Sem config global: testes ficam ao lado do arquivo (`useX.test.tsx`) e começam com `// @vitest-environment jsdom` (ver §8f e `useCheckin.test.tsx`) |
| CRA service worker / Workbox manual | `vite-plugin-pwa` já configurado (`registerType: 'prompt'`) |
| cálculo de "concluído" ou ranking no front | `@everest/shared` (`requisitosPendentes`, `ordenarRanking`…), só como prévia; a verdade vem do servidor |

### 8c. Regras inegociáveis

1. **TypeScript strict, sem `any`.** O ESLint barra com erro. Use `unknown` e valide com zod.
2. **Regra de negócio só no `@everest/shared` e no servidor.** O front **nunca envia `concluido`** e só mostra prévias. Banners de sucesso saem do valor do servidor.
3. **Nunca cachear `/api`** nem URLs assinadas no service worker. Nada de `runtimeCaching`.
4. **Texto vermelho pequeno é `#ef4444`** (`text-vermelho-texto`). `#dc2626` (`bg-vermelho`) só em fundos e títulos grandes.
5. **Alvos de toque ≥ 44 px** (`min-h-11`) e foco visível (sem `outline-none`).
6. **pt-BR** na UI e nos nomes de domínio.
7. **Mobile-first, conteúdo em `max-w-md mx-auto px-4`**, testado em 390×844.
8. **Sessão por cookie httpOnly.** Nada de token em JS ou storage.
9. **Sem dependência nova fora da §5** do `PROMPT_CURSOR.md` sem justificativa registrada em `docs/DECISOES.md`.
10. **Uma `<h1>` por página.** `role="alert"` só para erro; `aria-live="polite"` para status.
11. **Chaves de cache:** `queryKey` sempre vem de `chaves` (`src/lib/queries.ts`), com as invalidações da §5.6. A única exceção são **invalidações amplas por prefixo**, que usam o array literal do 1º segmento, como em `useInvalidacaoDia`: `qc.invalidateQueries({ queryKey: ['admin'] })`, `['ranking']`, `['progresso']`, `['dia']`. Ao criar uma chave nova:
    - o 1º segmento não pode ser `'me'` nem `'desafio'`, a menos que o dado deva **sobreviver ao logout e à troca de conta**. `limparDadosDeSessaoAnterior` e `useLogout` removem toda query cujo `queryKey[0]` não seja `'me'` ou `'desafio'`;
    - o 1º segmento não pode colidir com os existentes (`progresso`, `dia`, `ranking`, `admin`), senão as invalidações por prefixo vão atingi-la.

### 8d. Checklist de verificação

```bash
pnpm --filter @everest/shared build
pnpm --filter web typecheck        # tsc -b --noEmit
pnpm --filter web test             # vitest run (testes de hooks, ver §8f)
pnpm --filter web build            # tsc -b && vite build
pnpm lint                          # eslint . (sem any, sem unused)
pnpm check:launch                  # falha se houver TODO_DECISAO / [LINK_DO_APP] / @[SEU_@] nas pastas varridas (ver §9)
pnpm --filter web preview          # :4173, testa PWA/SW
```

Roteiro manual no DevTools, em modo dispositivo **390×844**:
- [ ] Visitante em `/`: vê as vagas e "Entrar no desafio" leva para `/cadastro?acao=inscrever`. Ao criar a conta, cai em `/hoje`.
- [ ] Acessar `/hoje` deslogado leva para `/login?volta=%2Fhoje`. Depois do login, volta para `/hoje`.
- [ ] Logado sem inscrição, `/hoje` leva para `/`. Um usuário comum em `/admin` vai para `/hoje`.
- [ ] Toda tela portada tem os estados carregando, erro com "Tentar de novo", vazio e offline (DevTools → Offline).
- [ ] Navegação só por teclado (Tab) mostra o outline vermelho em tudo, e nenhum alvo tem menos de 44 px.
- [ ] Sem texto vermelho pequeno em `#dc2626` e só uma `<h1>` por página.
- [ ] No preview, o SW instala, o toast "App pronto para uso offline" aparece, e a aba Network mostra `/api` sempre vindo da rede.
- [ ] Logout volta para `/` e limpa o cache (o voltar do navegador não mostra dados antigos).

### 8e. Prompt pronto para colar no Cursor

⚠️ `.cursor/rules/everest.mdc` tem `alwaysApply: true`. O Cursor vai:
- ler `docs/PROGRESSO.md` e `docs/DECISOES.md` antes de cada tarefa;
- seguir "Execute só a fase pedida; ao terminar, entregue o relatório de fase e PARE";
- exigir build/test/typecheck antes de concluir;
- parar ao repetir o mesmo erro 3 vezes.

O port não é uma FASE do `PROMPT_CURSOR.md` §13. Por isso o prompt abaixo diz isso explicitamente.

```text
Esta tarefa NÃO é uma FASE do PROMPT_CURSOR.md §13; use o formato de relatório da §14 só ao final de cada tela.
Você vai portar o frontend que está em <CAMINHO_DO_PROJETO_ANTIGO> para o app web deste monorepo
(apps/web). Leia primeiro, nesta ordem: docs/FRONTEND.md (fonte principal), docs/PROMPT_CURSOR.md
§2, §3, §5, §9, §10, §11 e Anexo A, docs/DECISOES.md, docs/PROGRESSO.md e docs/DEPLOY.md.
Siga docs/FRONTEND.md §8 à risca.

Stack obrigatória: React 19 + Vite 8 + TypeScript 5.9 strict (noUncheckedIndexedAccess, sem any),
react-router 8 (imports de 'react-router'), TanStack Query 5, Tailwind v4 com tokens @theme em
apps/web/src/styles/index.css (sem tailwind.config.js), lucide-react, zod via @everest/shared.

Passos:
1. Inventarie as telas, rotas, chamadas HTTP, stores, formulários e componentes do projeto antigo.
   Produza uma tabela "tela antiga → rota nova" usando a tabela de rotas de docs/FRONTEND.md §4.2.
   Liste qualquer tela que precise de endpoint inexistente (§5.3) como PENDÊNCIA; não invente API.
2. Para cada tela: crie/edite apps/web/src/pages/<Nome>.tsx com export default, registre com
   lazy() em apps/web/src/app/router.tsx dentro do guard correto (RotaProtegida/RotaInscrito/
   RotaAdmin) e renderize só o conteúdo (o AppShell já dá header, nav, max-w-md e Suspense).
3. Toda chamada HTTP via api<T>() de src/lib/api.ts (base /api relativa, cookie httpOnly; nunca
   token em localStorage). Leitura com useQuery e as chaves de `chaves` (src/lib/queries.ts);
   escrita com useMutation e as invalidações de docs/FRONTEND.md §5.6. Tipos de @everest/shared.
4. Validação com os schemas zod de @everest/shared + CampoTexto + errosDasIssues/errosDoServidor.
   Regra de negócio só no shared/servidor; nunca envie `concluido`.
5. Estilos só com os tokens (bg-fundo, bg-superficie, bg-superficie-2, border-borda, text-texto,
   text-texto-2, bg-vermelho, text-vermelho-texto, text-sucesso, rotulo, pt-safe, pb-safe).
   Texto vermelho pequeno = text-vermelho-texto (#ef4444). Alvos min-h-11. Uma <h1> por página.
   Componentes: Botao, CampoTexto, Card, Alerta, Skeleton, Carregando, Rotulo, BarraProgresso,
   Interruptor, GridDias. Classes condicionais com template string (sem clsx).
6. Estados obrigatórios em cada tela: carregando, erro com "Tentar de novo", vazio, offline.
7. Não adicione dependências fora de docs/PROMPT_CURSOR.md §5. Não adicione runtimeCaching ao PWA.
   Textos em pt-BR. Decisões pendentes viram TODO_DECISAO(Qx) + linha em docs/DECISOES.md.
8. Ao final rode: pnpm --filter @everest/shared build; pnpm --filter web typecheck;
   pnpm --filter web build; pnpm lint; pnpm check:placeholders. Corrija tudo. Faça o roteiro
   manual de docs/FRONTEND.md §8d em 390×844 e relate o que passou e o que ficou pendente.

Trabalhe uma tela por vez, mostrando o diff e a verificação de cada uma antes de seguir.
```

### 8f. Como testar

- **Onde:** ao lado do arquivo, `src/features/<dominio>/useX.test.tsx`. O `tsconfig` inclui `src`, então os testes também passam pelo typecheck.
- **Rodar:** `pnpm --filter web test` (`vitest run`). Para um arquivo só, `pnpm --filter web exec vitest run src/features/fotos/useUploadFoto.test.tsx`. O `pnpm test` da raiz (`pnpm -r --if-present test`) roda também os testes do shared (vitest) e da API (jest).
- **Modelo** (trecho real de `useUploadFoto.test.tsx`):
  ```tsx
  // @vitest-environment jsdom
  import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
  import { act, renderHook, waitFor } from '@testing-library/react';
  import type { ReactNode } from 'react';
  import { beforeEach, describe, expect, it, vi } from 'vitest';

  const mocks = vi.hoisted(() => ({ api: vi.fn(), comprimir: vi.fn(), enviar: vi.fn() }));
  vi.mock('../../lib/api', async (importOriginal) => {
    const original = await importOriginal<typeof import('../../lib/api')>();
    return { ...original, api: mocks.api };   // mantém ApiError/ehApiError reais
  });
  vi.mock('./comprimir', () => ({ comprimirFoto: mocks.comprimir }));   // módulos pesados/de browser
  vi.mock('./enviarArquivo', () => ({ enviarArquivo: mocks.enviar }));

  function montar() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    return renderHook(() => useFotosDia('desafio-teste', 4), { wrapper });
  }
  ```
- Para simular um erro da API: `mocks.api.mockRejectedValueOnce(new ApiError('DIA_NAO_EDITAVEL', 'msg', 409))` (padrão de `useCheckin.test.tsx`).
- Não há setup global, `jest-dom` nem MSW (não estão nas dependências permitidas).

---

## 9. Pendências e decisões em aberto (frontend)

Origem: `docs/DECISOES.md`. Todas estão como **ASSUMIDO 🚫** (bloqueiam o lançamento). O `pnpm check:launch` pega os marcadores de Q2 (`BotaoBaixarApp.tsx`), Q8 (`content/privacidade.ts`), LOGO (`apps/web/pwa-assets.config.ts`) e o `API_HOST_AQUI` do `apps/web/vercel.json`. Q1 (fica no banco) e Q15 (fica em env) não têm marcador no código: confira à mão.

| ID | Questão | Situação atual | Onde afeta o front |
|---|---|---|---|
| **Q1** | @ do Instagram | Sem default em produção; o seed de dev usa `everest_dev`. Fica no banco (`Desafio.instagramHandle`) | `CardStory` mostra "Copiar @handle #hashtag" com `DesafioAtual.instagramHandle` e `hashtag`; sem esses valores, mostra um texto genérico. Também aparece em `/regras` (`requisitosDiarios(instagram, hashtag)`) |
| **Q2** | Link de publicação | Sem valor; vai na env `VITE_APP_URL` | `features/pwa/BotaoBaixarApp.tsx` (`urlDoApp()`, com fallback para `location.origin`) tem `TODO_DECISAO(Q2)` |
| **Q8** | Política de privacidade | Página `/privacidade` com texto provisório e checkbox obrigatório no cadastro | `src/content/privacidade.ts` (`pendencia: 'TODO_DECISAO(Q8)…'`, `avisoProvisorio`) |
| **Q15** | Domínio | Sem valor; vai em env | Afeta `VITE_APP_URL`, `WEB_ORIGIN` na API (CSRF) e o rewrite de `apps/web/vercel.json`, que ainda tem `https://API_HOST_AQUI` |
| **LOGO** | Logo final | Placeholder gerado por `scripts/gerar-logo-placeholder.cjs` | Substituir `apps/web/public/logo.png` e rodar `pnpm --filter web generate-pwa-assets`. Há `TODO_DECISAO(LOGO)` em `pwa-assets.config.ts` |

Outras pendências técnicas do front:
- **Testes:** existem só 2 testes de hooks (`useCheckin`, `useFotosDia`; 9 casos). Não há testes de páginas ou componentes, nem `vitest.config.*` ou bloco `test` no Vite: o jsdom vem do pragma por arquivo. Playwright e `@axe-core/playwright` (FASE 12) ainda não estão instalados.
- **Offline:** o offline global agora é só o `IndicadorOffline` (`features/pwa/PwaGlobais.tsx`), em todas as rotas. Em `/hoje`, o `AvisosDia` (`pages/Hoje.tsx`) mostra também um `Alerta` "Você está offline…", então ali o aviso ainda aparece duas vezes. O `PwaGlobais` continua reservando o espaço da bottom nav (`bottom-[calc(env(safe-area-inset-bottom)+4.5rem)]`) mesmo quando ela não aparece.
- **Divergência da spec:** a §10 diz que um 401 "redireciona para /login". O código só zera `me`, e o redirect acontece pelo `RotaProtegida`. Numa rota pública, um 401 não navega.
