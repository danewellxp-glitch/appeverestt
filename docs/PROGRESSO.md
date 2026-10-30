# Progresso

Marque `[x]` somente o que foi **verificado** (comando rodado / teste passando).

## FASE 0: Fundação do repositório
- [x] `git init`, `.gitignore`, `.editorconfig`, `.nvmrc`, `.gitattributes`
- [x] `pnpm-workspace.yaml` + `package.json` raiz com `dev`, `build`, `lint`, `typecheck`, `test`, `check:launch`
- [x] `tsconfig.base.json` strict, ESLint flat config + Prettier
- [x] `docker-compose.yml` (postgres:16, redis:7, minio, minio-init) com healthchecks
- [x] `.env.example` em `apps/api` e `apps/web`
- [x] `scripts/check-placeholders.mjs` (`--strict` sai 1)
- [x] `docs/PROGRESSO.md`, `docs/DECISOES.md`, `.cursor/rules/everest.mdc`
- [x] **DoD:** `pnpm install` ok; 3 serviços *healthy*; bucket `everest-provas` criado e privado (verificado via log do `minio-init`); `pnpm lint` passa

## FASE 1: `packages/shared`
- [x] Pacote `@everest/shared` com tsup (cjs + esm + dts) e `exports` corretos (verificado `require` e `import`)
- [x] Constantes, schemas zod, tipos de resposta da API e funções da seção 8
- [x] Testes da seção 8 (52 testes, 5 arquivos)
- [x] **DoD:** `test` 100%; `build` gera `dist/index.js`, `index.cjs`, `index.d.ts`; typecheck e lint ok

## FASE 2: Base da API
- [x] Projeto Nest em `apps/api` dependendo de `@everest/shared`
- [x] ConfigModule com validação zod do env
- [x] Prisma: schema, migration inicial + `checks`, `PrismaService`
- [x] `RedisModule`
- [x] `main.ts`: `/api`, helmet, cookie-parser, trust proxy, Swagger em dev, filtro de exceções, ZodValidationPipe, CORS dev
- [x] `GET /api/health`
- [x] `prisma/seed.ts` idempotente
- [x] Scripts `criar-desafio`, `criar-admin`, `redefinir-senha`
- [x] **DoD:** migrate ok; start:dev sobe; health 200; `/api/docs` abre; seed 2× sem duplicar; CHECK `vagaNumero = 0` falha

## FASE 3: Autenticação
- [x] cadastro, login, logout, me
- [x] `JwtAuthGuard`, `AdminGuard`, `@UsuarioAtual()`, checagem de `Origin`
- [x] `ThrottlerModule`
- [x] Testes e2e de auth
- [x] **DoD:** `pnpm --filter api test:e2e` passa

## FASE 4: Desafio e inscrição
- [x] `GET /desafios/atual` com cache de vagas
- [x] `POST /desafios/:slug/inscricao` com trava
- [x] Q3 aplicada no seed/script do embaixador
- [x] Teste de concorrência 60 → 50/10 (sem vaga repetida, todas entre 1 e 50)
- [x] Teste mesmo usuário 2× em paralelo
- [x] Teste `INSCRICOES_FECHADAS`
- [x] **DoD:** testes passando

## FASE 5: Check-in diário e progresso
- [x] `GET /meu-progresso`, `GET /dias/:n`, `PUT /dias/:n`
- [x] PUT valida janela, upsert, recalcula `concluido`, invalida ranking
- [x] Testes da fase
- [x] **DoD:** testes passando; Swagger com exemplos

## FASE 6: Fotos
- [x] `StorageService`
- [x] `upload-url`, `confirmar`, `DELETE`
- [x] BullMQ: fila `fotos`, `processar-foto`, limpeza repetível
- [x] Recálculo do dia após confirmar/rejeitar/deletar
- [x] Testes de integração com MinIO
- [x] Teste sem EXIF
- [x] **DoD:** testes passando; objeto no MinIO; URL assinada abre e expira

## FASE 7: Ranking
- [x] Consulta agregada + sequências + `ordenarRanking` + `nomeExibicao`
- [x] Cache + `minhaPosicao`
- [x] Testes
- [x] **DoD:** testes passando

## FASE 8: Admin
- [x] Endpoints admin com `AdminGuard`
- [x] Invalidação grava quem/quando, recalcula, invalida ranking
- [x] Testes
- [x] **DoD:** `pnpm --filter api test` (6 unitários) + `pnpm --filter api test:e2e` (52 e2e em 6 suítes) — todos passando

## FASE 9: Base do frontend
- [x] Vite react-ts + `@everest/shared`
- [x] Tailwind + tokens + `styles/index.css`
- [x] Proxy `/api`
- [x] `lib/api.ts`, `lib/erros.ts`, `queryClient`
- [x] `useMe`, `RotaProtegida`, `RotaInscrito`, `RotaAdmin`
- [x] `AppShell`, `BottomNav`, `Watermark`, Login, Cadastro, Privacidade
- [x] Script `dev` raiz em paralelo
- [x] **DoD:** build + typecheck + lint + 9 testes unitários do web passando (roteiro no navegador: ver Fase 10/12)

## FASE 10: Telas do produto
- [x] Entrada, Hoje, Progresso, Ranking, Regras, Admin
- [x] Upload com compressão e progresso
- [x] Autosave otimista + indicador
- [x] Todos os estados
- [ ] **DoD:** roteiro manual 1–8

## FASE 11: PWA
- [x] Seção 11 completa + ícones
- [x] Toast de nova versão + banner offline
- [x] **DoD:** manifest ok, SW ativo (verificado no Chrome), precache sem `/api`, sem runtimeCaching (teste offline completo fica na Fase 12)

## FASE 12: Qualidade
- [ ] Playwright smoke + axe
- [ ] Contraste
- [ ] Lighthouse + bundle < 200 KB gzip
- [ ] Logo otimizada
- [ ] **DoD:** e2e passando; números reportados

## FASE 13: Deploy
- [x] Dockerfile multi-stage (build + boot + migrations + health + fotos verificados localmente)
- [x] `docs/DEPLOY.md`
- [x] `vercel.json` (falta trocar `API_HOST_AQUI`)
- [ ] Checklist de produção
- [ ] **DoD:** link público em Android/iPhone (requer contas e domínio do usuário)

---

# Frontend v2 (docs/FRONTEND.md §12)

## R0: Linha de base
- [x] `pnpm install`, `pnpm --filter @everest/shared build`, `pnpm typecheck`, `pnpm lint`, `pnpm --filter web build` e `pnpm --filter api test:e2e` rodados antes de qualquer mudança (todos passaram; extra: `pnpm test` com shared 52, api 7, web 9)
- [x] Correções que impediam o build: nenhuma necessária (`Hoje.tsx` compila; `tsc -b` + `vite build` ok)
- [x] Commit das alterações pendentes ("chore: estado antes do frontend v2"), sem `.env` e sem segredos reais
- [x] `docs/DECISOES.md`: Q12 e X3 CONFIRMADO; novas X5, X6, X7 e X8
- [x] `.cursor/rules/everest.mdc` com a linha do Frontend v2
- [x] **DoD:** relatório com o estado de cada comando; `pnpm --filter web build` passa

## R1: Backend (Firebase, perfil, feed, conferência)
- [x] `firebase-tools` (dev) + script raiz `pnpm emu`; `firebase.json` só com a porta 9099 do emulador de auth (UI desligada)
- [x] Migration Prisma da seção 4.1 (`20261030120000_firebase_auth_conferencia`)
- [x] `firebase-admin` + provider `VERIFICADOR_FIREBASE` (real + falso) + env (seção 4.2)
- [x] `POST /auth/sessao`, `PATCH /me`, `DELETE /me`, `GET /desafios/:slug/feed`, `PATCH /admin/dias/:diaId/conferencia`, e `paraRevisar`/`totalParaRevisar`/`AGUARDANDO_CONFERENCIA` nas rotas de admin
- [x] Zerar a conferência em toda edição do dia (check-in, foto substituída/confirmada/removida/rejeitada, invalidação)
- [x] Legado `cadastro`/`login` atrás de `AUTH_SENHA_LEGADO` (404 quando desligado)
- [x] Helpers de e2e migrados para `/auth/sessao` com o verificador falso + testes da seção 4.3
- [x] Script `seed:firebase` para o emulador
- [x] Swagger com exemplos dos endpoints novos (conferido em `/api/docs-json`)
- [x] **DoD:** `pnpm --filter api test` (8) e `test:e2e` (76 em 9 suítes) verdes; `idToken` do emulador (`accounts:signInWithPassword` de maria@everest.dev) funcionou no `POST /auth/sessao` com o verificador real

## R2: Shared (feita junto com a R1)
- [x] Tipos `UsuarioMe` (+`fotoUrl`, `perfilCompleto`), `FeedResposta`, `AdminParticipante.paraRevisar`, `DiaResumo.situacao` (+`AGUARDANDO_CONFERENCIA`), `ConferenciaResposta`
- [x] Schemas `sessaoSchema`, `atualizarPerfilSchema`, `entrarSchema`, `criarContaSchema` e `conferenciaSchema`
- [x] `regras/altitude.ts` + testes (seção 10); também `iniciais()` para avatar
- [x] **DoD:** `pnpm --filter @everest/shared test` (61) e `build` ok; `pnpm typecheck` da raiz ok

## R1.1: Lacunas da R1+R2 (pedido do usuário em 2026-10-30)
- [x] Inscrição exige perfil completo no servidor: `403 PERFIL_INCOMPLETO` sem gastar vaga (X11)
- [x] Foto do Google: verificador falso aceita foto; e2e cobre gravar, atualizar e não apagar num login sem foto
- [x] Dados de cadastro (Q7): nome completo, @ do Instagram, data de nascimento (≥ 18, X10), WhatsApp, bairro, cidade, UF; migration `dados_cadastro`; `PATCH /me` + `me` com os campos; `DELETE /me` apaga tudo
- [x] Consentimento de marketing separado e opcional (`aceitouMarketingEm`, revogável) (X9)
- [x] Shared: `regras/perfil.ts` + testes; spec da `/bem-vindo` e do `/perfil` atualizada em `docs/FRONTEND.md` §4.4, §5.4, §9.3, §9.9, §9.10, §10
- [x] **DoD:** shared 69, api unit 8, api e2e 80 (9 suítes), web 9, typecheck/lint/build verdes

## R3: Tema, tokens e fontes
- [x] Fontes instaladas (`@fontsource-variable/onest`, `@fontsource/big-shoulders-display` 700/800/900), só subset latin; preload do peso 900 injetado no build
- [x] `index.css` com os tokens dos dois temas + `@custom-variant escuro` + utilitários `rotulo`, `press` e `surgir` (+ tokens de estado `erro-*`, `aviso-*`, `ok-*`, `info-*`, `vermelho-escuro`, `borda-campo`)
- [x] Script inline do tema no `index.html` (antes do CSS) + `lib/tema.ts` (`useTema`, `definirTema`, `iniciarTema`) + `<meta name="theme-color">` dinâmico
- [x] Revisão de todas as classes `red-*`/`amber-*`/`green-*`/`sky-*`/`zinc-*`/`bg-white`/`text-white`: viraram tokens; sobraram só branco/preto sobre foto ou véu e o botão branco dos interruptores (iguais nos dois temas)
- [x] **DoD:** Playwright headless (preview + API): `everest-tema` = vazio/claro/escuro/sistema × SO claro/escuro → `data-tema`, fundo, texto e theme-color corretos nos 8 casos; o script roda antes do `<link rel=stylesheet>` (sem flash); prints da Entrada nos dois temas conferidos; build ok

## R4: Primitivos de UI e movimento
- [x] `Botao` (pílula, sem caixa alta, variantes `gradiente`/`google`/`perigo`, tamanhos md/sm, spinner que mantém a largura), `CampoTexto` (pílula, `alinhamento`, `prefixo`), `Avatar` + `PilhaAvatares`, `Contador`/`useContador`, `FolhaInferior`, `Toast`/`ToastProvider`/`useToast`, `Segmentado`, `Interruptor` (movido para `ui/`), `Barra` (substitui `BarraProgresso`), `BarraAbas` (substitui `BottomNav`), `BotaoVoltar` e `AppShell` sem header
- [x] `src/lib/transicoes.ts` (`marcarDirecao`, `abrirComTransformacao`, `nomeTransicaoDoEstado`) + CSS das View Transitions (seção 7.3) + `marcarDirecao` na barra de abas e no voltar (os demais links ganham a direção nas fases das telas e na R10)
- [x] Toasts do PWA (nova versão, pronto offline) no `ToastProvider`; um só aviso de offline (global; o da `/hoje` saiu)
- [x] Testes: `Segmentado` (aria-pressed), `FolhaInferior` (foco inicial, Esc fecha e devolve o foco, foco preso), `useContador` (reduced motion = valor final); vitest do web com `environment: 'jsdom'`
- [x] **DoD:** `pnpm --filter web test` 17/17; build ok. Conferido no Playwright (390×844, dois temas): indicador da aba segue a rota, abas somem fora das rotas de aba

## R5: Autenticação no front
- [x] `lib/firebase.ts` (import dinâmico + prefetch), `features/auth/firebaseAuth.ts`, `errosFirebase.ts` e `.env.example` do web (seção 5)
- [x] Páginas `Entrar`, `CriarConta`, `RecuperarSenha` e `BemVindo` (com os dados de cadastro da R1.1 e a revelação da vaga) + `TelaAuth` + `BotaoGoogle` + `FormularioPerfil` (reaproveitado no /perfil)
- [x] Guards `RotaVisitante` (roda o pós-login) e `RotaPerfilCompleto`; `usePosAutenticacao` atualizado (seção 5.4)
- [x] Router novo com `/login` → `/entrar` e `/cadastro` → `/criar-conta` (preservando a query); `RotaAdmin` barra para `/desafio`
- [x] Removidos `pages/Login.tsx`, `pages/Cadastro.tsx`, `useLogin` e `useCadastro`; `AUTH_SENHA_LEGADO=false` no `.env` de dev e no exemplo
- [x] **DoD** (Playwright + `pnpm emu` + `seed:firebase` + API + web dev): login de maria@everest.dev por e-mail → `/desafio`; Google no emulador cria conta → `/bem-vindo` (aceite desmarcado) → vaga nº 9 → `/desafio`; "Criar conta" por e-mail → `/bem-vindo` (aceite já marcado) → vaga nº 10; `/login?volta=…` → `/entrar?volta=…`; senha errada → "E-mail ou senha incorretos."; build: o SDK do Firebase fica nos chunks `index.esm-*` (auth 36,2 KB gzip + app 9,9 KB gzip), fora do chunk de entrada (que só tem o wrapper `lib/firebase.ts`)

## R6: Home `/desafio`
- [ ] `FaixaDias`, `CarrosselDestaque`, `CardEscalada`, `CardStoryDoDia`, `CardSeuDia`, `CardsAtividade` e `CtaFixo`
- [ ] `pages/Desafio.tsx` com os estados `NAO_INICIADO` / `EM_ANDAMENTO` / `ENCERRADO`, skeleton e erro
- [ ] Container transform `abrir-dia` e `abrir-ranking`
- [ ] **DoD:** roteiro manual 390×844 nos dois temas (6 passos da seção 12)

## R7: Check-in `/desafio/dia/:n`
- [ ] `pages/Dia.tsx` (refatora `Hoje.tsx`), `useDiaSelecionado` lendo `useParams`, redirect de `:n` inválido
- [ ] Restyle de `CardRequisito`, `CardAgua`, `CardExercicio`, `CardLeitura`, `CardFotos`/`SlotFoto`, `CardStory`, `ResumoDia`, `IndicadorSalvamento` + `BannerDiaConcluido`
- [ ] Modo leitura (dia passado), invalidado, offline e erro
- [ ] **DoD:** banner animado uma vez + toast; recarregar mantém; remover foto tira o banner; `/desafio` atualizado; testes existentes verdes

## R8: Progresso, Ranking, Regras e Privacidade
- [ ] `Montanha` + `pages/Progresso.tsx`
- [ ] `pages/Ranking.tsx` com o card "Sua posição" e a frase de desempate
- [ ] `pages/Regras.tsx` e `content/regras.ts` atualizados
- [ ] `pages/Privacidade.tsx` e `content/privacidade.ts` atualizados (mantendo o marcador Q8)
- [ ] **DoD:** montanha anima e respeita reduced motion; grid leva para `/desafio/dia/N`; ranking rola até a sua linha

## R9: Perfil e Admin
- [ ] `pages/Perfil.tsx` com tema, instalação, sair e excluir (seção 9.9)
- [ ] `pages/Admin.tsx` e `pages/AdminParticipante.tsx` restyle + fila de conferência (seções 9.11 e 9.12)
- [ ] **DoD:** tema persiste no app inteiro; excluir conta → `/` com toast e "Participante removido" no ranking; aprovar diminui "para revisar", invalidar exige motivo

## R10: PWA e polimento de navegação
- [ ] Folha "Instalar o app" com `Segmentado` iPhone/Android (substitui o `ModalInstrucoesIOS`)
- [ ] `view-transition-name: tabbar`; foco no `h1` depois de navegar; direção certa em todos os links
- [ ] `NaoEncontrada` no novo visual
- [ ] **DoD:** build + preview; manifest e SW como antes; transições no Chrome e fallback sem `startViewTransition`

## R11: Qualidade
- [ ] Playwright com o emulador do Firebase: smoke criar conta → bem-vindo → vaga → check-in com 3 fotos → dia concluído → ranking; smoke Google → bem-vindo
- [ ] axe nas 14 telas × 2 temas: zero violações sérias ou críticas
- [ ] Lighthouse mobile e tamanho dos chunks (seção 11)
- [ ] **DoD:** números reportados no relatório

## R12: Produção
- [ ] `docs/DEPLOY.md` com a seção 5.5 e as variáveis novas
- [ ] `scripts/verificar-producao.mjs`: `/__/auth/handler` responde e `/api/auth/sessao` existe
- [ ] `pnpm check:launch` sem marcadores
- [ ] **DoD:** login com Google no iPhone com o app instalado (redirect) e no Android (popup) no domínio real
