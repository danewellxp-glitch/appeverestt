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
- [x] Logo otimizada (logo oficial na v2 R12)
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
- [x] `FaixaDias`, `CarrosselDestaque`, `CardEscalada`, `CardStoryDoDia`, `CardSeuDia`, `CardsAtividade` e `CtaFixo` (+ `useFeed`, `formatarDiaCurto`)
- [x] `pages/Desafio.tsx` com os estados `NAO_INICIADO` (contagem no lugar do "Seu dia", sem CTA) / `EM_ANDAMENTO` / `ENCERRADO` (resumo final + "Ver ranking final"), skeleton e erro com "Tentar de novo"
- [x] Container transform `abrir-dia` (card, chips e CTA) e `abrir-ranking` (card de atividade); a tela de destino herda o nome no `AppShell`; prefetch do chunk no pointerdown
- [x] **DoD** (Playwright 390×844, claro e escuro, login real pelo emulador): 1) a faixa centraliza o dia atual (desvio 0 px); 2) dia futuro → shake + toast "O dia 6 abre em 2 dias, à meia-noite."; 3) "Seu dia" abre o check-in do dia; 4) card preto abre o ranking; 5) carrossel encaixa e os pontos acompanham (18/6 → 6/18 px); 6) "Marcar como postado" muda o "Seu dia" de 0 para 1 de 5 na hora

## R7: Check-in `/desafio/dia/:n`
- [x] `pages/Dia.tsx` (substitui `Hoje.tsx`), `useDiaSelecionado` lendo `useParams`; `:n` inválido ou fora de 1..min(diaAtual, totalDias) redireciona para o dia atual; `/hoje` e `/hoje?dia=N` redirecionam (`RedirecionarHoje`)
- [x] Restyle de `CardRequisito` (bolha + selo "Feito"/o que falta + anel vermelho), `CardAgua`, `CardExercicio`, `CardLeitura` (stepper), `CardFotos`/`SlotFoto` (grade 3:4), `CardStory` (linha copiável), `ResumoDia` (card resumo + 5 segmentos), `IndicadorSalvamento` (compacto no topo) + `BannerDiaConcluido`
- [x] Modo leitura (dia passado, com cadeado), invalidado (motivo), offline (aviso global + edição desligada) e erro com "Tentar de novo"; removidos `CabecalhoDia`, `TelaAntesInicio` e `TelaEncerrado` (conteúdo já na home)
- [x] **DoD** (Playwright 390×844, login real, fotos de verdade no MinIO + worker): completar os 5 requisitos mostra o banner animado uma vez e o toast "Dia 4 concluído. +295 m na escalada."; recarregar mantém 5 de 5 com o banner parado e sem toast; remover a foto de água tira o banner (4 de 5); voltar para `/desafio` mostra "4 de 5" com a tag "Fotos 2/3"; `useCheckin.test` e `useUploadFoto.test` verdes. Conferidos também `/hoje` → `/desafio/dia/4`, `/desafio/dia/99` → `/desafio/dia/4` e o dia passado sem botões de edição

## R8: Progresso, Ranking, Regras e Privacidade
- [x] `Montanha` (crista, trecho percorrido, acampamentos Base/C1/C2/C3/Cume, marcador com halo, 1,2 s ease-out) + `pages/Progresso.tsx` (altitude, 4 tiles com Contador, grid dos 30 dias restyle + `LegendaDias`)
- [x] `pages/Ranking.tsx` com o card "Sua posição" (pop) e a frase de desempate (`fraseSuaPosicao` + testes), lista com avatar/foto, selo Embaixador, "Você" com anel vermelho; API passa a devolver `fotoUrl` no ranking
- [x] `pages/Regras.tsx` e `content/regras.ts` com os textos do protótipo (handle, hashtag, vagas e dias dinâmicos; CTA "Quero participar" para não inscritos)
- [x] `pages/Privacidade.tsx` e `content/privacidade.ts` atualizados (dados de cadastro da R1.1, foto do Google, marketing só com consentimento, 18+, login pelo Firebase, 90 dias após o fim, exclusão pelo Perfil); marcador `TODO_DECISAO(Q8)` mantido
- [x] **DoD** (Playwright, login real): a montanha anima (traço curto ao abrir → final em 1,8 s) e, com `reducedMotion: 'reduce'`, já abre no final; o grid leva para `/desafio/dia/2`; o ranking rola até a sua linha (tela 390×600: scrollY 388, linha no meio da tela); prints das 4 telas nos dois temas conferidos

## R9: Perfil e Admin
- [x] `pages/Perfil.tsx`: avatar, vaga e data de inscrição; Aparência (Claro/Escuro/Sistema com `Segmentado`); switch de marketing (X9); "Meus dados" em folha com o `FormularioPerfil`; instalar o app; Regras; Privacidade; Painel do embaixador (ADMIN); Sair; "Excluir minha conta" com folha de confirmação (foco inicial em "Cancelar") → `DELETE /me` → `/` com toast
- [x] `pages/Admin.tsx` (3 tiles: vagas, fecharam hoje, para revisar; switch de inscrições com confirmação; busca sem acento; lista ordenada por "para revisar" com pílula laranja) e `pages/AdminParticipante.tsx` (grid com aguardando/invalidado + legenda; abre no último dia aguardando; `PainelDia` com pílula de situação, fotos, valores e Aprovar/Invalidar/Revalidar; motivo com 5+ caracteres)
- [x] **DoD** (Playwright, login real): trocar para Escuro no Perfil vale em /progresso e depois de recarregar (`everest-tema=escuro`), e volta para Sistema; conta nova criada e excluída → `/` com "Conta excluída." e o ranking mostra "Participante removido"; no admin, aprovar baixa "para revisar" (8 → 7), invalidar sem motivo é bloqueado e, com motivo, o ranking recalcula (Beatriz 2 → 1 dia; revalidado depois)

## R10: PWA e polimento de navegação
- [x] Folha "Instalar o app" (`FolhaInstalar`) com `Segmentado` iPhone/Android, prompt nativo quando existe e "Copiar o link do app"; substitui o `ModalInstrucoesIOS` (removido) na Entrada e no Perfil; marcador Q2 mantido em `urlDoApp`
- [x] `view-transition-name: tabbar` (desde a R4); foco no `h1` depois de navegar (`AppShell`, espera o skeleton sair); `ScrollRestoration`; direção em todos os links (`LinkNav` com `avancar`/`voltar`/`aba`)
- [x] `NaoEncontrada` no visual novo ("Trilha errada"); **Entrada (`/`) refeita** (§9.1: marca, montanha, hero, card de vagas com Contador, CTA, "Baixar o app", regras), que não estava em nenhuma fase
- [x] **DoD** (Playwright no `build + preview`): manifest "Everest Desafio" standalone com 3 ícones, SW ativo, 55 entradas no cache e 0 de `/api`; `startViewTransition` chamado em 5 de 5 navegações por toque (abas, link e voltar); com `delete Document.prototype.startViewTransition` a navegação segue instantânea e sem erro; foco cai no `h1` ("Progresso") depois de trocar de aba

## R11: Qualidade
- [x] Playwright com o emulador do Firebase (`e2e/firebase-emulador.ts`, emulador como webServer, admin criado no emulador com e-mail verificado): smoke criar conta → bem-vindo (dados de cadastro) → vaga → check-in com 3 fotos → dia concluído → reload → ranking ("Você") → remover foto desfaz; smoke "Continuar com Google" (popup do emulador) → /bem-vindo com o nome preenchido. **2/2 passam**
- [x] axe em 15 telas × 2 temas (Entrada, Entrar, Criar conta, Recuperar senha, Regras, Privacidade, 404, Bem-vindo, Desafio, Dia, Progresso, Ranking, Perfil, Admin, Admin participante): **28/28 testes, zero violações sérias ou críticas**. Corrigido: contraste do texto com opacidade no card vermelho (3,81:1 → branco puro) e "label in name" (avatar do perfil, card "Seu dia", card do ranking, chips da faixa de dias, +1/+5 páginas, slots de foto)
- [~] Lighthouse mobile **não rodado** (o pacote `lighthouse` não está instalado; instalar depende de aprovação). Medido com Playwright no `build + preview` (CPU 4×, rede 1,6 Mbps / 150 ms, sem cache, 3 rodadas): **FCP = LCP 1,7–1,8 s, CLS ≤ 0,017**
- [x] Chunks: rota `/` baixa **157,3 KB de JS + 9,7 KB de CSS = 167 KB gzip** (< 200 KB) e **nenhum chunk do Firebase**; com fontes (61,8 KB) e imagens, 239 KB no total. Entrada `index` 84,0 KB gzip; Firebase só nas telas de login (`index.esm` 36,2 + 9,9 KB)
- [x] **DoD:** números acima no relatório

## R12: Marca (logo oficial, pedido do dono em 2026-10-30)
- [x] `scripts/marca.cjs` (sharp via apps/api) gera de `apps/web/design/logo-original.jpg`: `public/marca/montanha.png` (682×313, 16,4 KB), `everest.png` (681×61, 12,1 KB), `icone.png` (traço engrossado, 128×58, 3,1 KB) e `public/logo.png` 1024 (fundo preto); ícones do PWA regerados em fundo preto
- [x] `components/layout/Marca.tsx` (`IconeMontanha`, `MontanhaMarca`, `Wordmark`) com o utilitário `mascara-marca` (`-webkit-mask` + `mask`); capa e topo da Entrada e marca d'água (`Watermark`) com a logo nova; sem preload de imagem no `index.html`; `logo.webp`, `otimizar-logo.cjs` e `gerar-logo-placeholder.cjs` removidos
- [x] **DoD:** screenshots da capa nos dois temas conferidos; `webkitMaskImage`/`maskImage` aplicados; `TODO_DECISAO(LOGO)` removido (`check:placeholders` com 3 marcadores: Q2, Q8, `API_HOST_AQUI`)
- [~] Pendência: favicon 48 px e ícone 64 px ficam pouco legíveis (traço fino); 180/192/512 ok

## R13: Backend do pagamento Pix, feedback e painel
- [x] Migration `20261030200000_pagamento_feedback` (enum `StatusPagamento`, campos no `Participante`, backfill CONFIRMADO, `Feedback` com cascade e CHECK 1–5)
- [x] Gate `PAGAMENTO_PENDENTE` em `exigirParticipante` (dias, fotos, progresso, ranking, feed, feedback); ranking/feed só com confirmados; `PixService` + `PIX_COPIA_E_COLA` validado (`lerPix` no shared, obrigatório em produção)
- [x] `GET /pagamento`, `POST /pagamento/informar`, `GET`/`PUT /feedback`; admin: PATCH pagamento (confirmar / "Não recebi"), DELETE de inscrição não paga (trava do desafio), `GET …/feedbacks`, `GET …/participantes.csv`, dados de cadastro no detalhe; menor vaga livre; `criar-admin` sem senha; seed com 1 pendente, 1 informado e 2 feedbacks
- [x] **DoD:** shared 77, api unit 19 (2 suítes), api e2e 96 (11 suítes, 15 novos); typecheck, lint e build verdes

## R14: Telas de pagamento e feedback, painel do admin e E2E
- [x] `/pagamento` (QR com `uqr`, copia e cola, relógio de 5 min que só avisa, "Já fiz o pagamento", espera com consulta a cada 30/60 s, "Não localizamos seu pagamento", revelação da vaga); guards com `destinoDaParticipacao`; abas só para confirmados; capa com o valor e CTA por status
- [x] `/feedback` (estrelas, dois textos, autorização), card "Conte como foi" (dia 28+ e fim), linhas no Perfil; regras e privacidade atualizadas
- [x] Painel: fila "Pagamentos a confirmar", pílula e filtro de pagamento, "Baixar CSV", detalhe com Dados/Pagamento/Feedback/Remover inscrição, `/admin/feedbacks`
- [x] Revisão adversarial: 4 achados corrigidos (cache do pagamento após remoção e reinscrição, CONFIRMADO antigo sobrescrevendo o `me`, feedback na política de privacidade, 500 → 404 em corrida no PATCH do admin)
- [x] **DoD:** web 45 testes; Playwright **36/36** (smoke 2, admin-pagamento 1, feedback 1, a11y 32 = 19 telas × 2 temas sem nenhuma violação); entrada 84,5 kB gzip; `uqr` só no chunk `Pagamento` (8,2 kB gzip); precache 66 entradas

## R15: Produção (antiga R12)
- [ ] `docs/DEPLOY.md` com a seção 5.5 e as variáveis novas
- [ ] `scripts/verificar-producao.mjs`: `/__/auth/handler` responde e `/api/auth/sessao` existe
- [ ] `pnpm check:launch` sem marcadores
- [ ] **DoD:** login com Google no iPhone com o app instalado (redirect) e no Android (popup) no domínio real
- [ ] Contas do dono (`docs/CONTAS.md`) e `PIX_COPIA_E_COLA` real na API de produção

## R16: App instalado, barra de abas fixa e correções do front (2026-11-04)
- [x] `features/pwa/standalone.ts`: detecção única do app instalado (`rodandoStandalone`, usada também na Entrada, na instalação e no login do iOS) e `aplicarModoApp` (viewport sem zoom, `html[data-app]`, pinça e duplo toque cancelados), só no app instalado (X17)
- [x] Barra de abas em todas as telas de quem tem o pagamento confirmado, menos login/cadastro/pagamento (`ROTAS_SEM_ABAS`); `/regras`, `/privacidade`, `/feedback` e `/admin/*` acendem a aba Perfil
- [x] Correções: cabeçalho do TT duplicado quando a foto falha; "começa hoje" sem desafio carregado; alerta antigo no "Adicionar participante"; erro duplicado no formulário do desafio; "Pagamento em análise" no Perfil; foco preso às abas do painel; "Vagas esgotadas" alcançável por leitor de tela; h1 de /regras volta a "Regras"; rolagem da landing restaurada ao voltar; `BotaoBaixarApp` órfão removido
- [x] **DoD:** typecheck, lint e `pnpm --filter web test` verdes; Playwright no build (API simulada, 390×844): barra presente em 11 rotas de confirmado e ausente para pendente/visitante; app instalado com viewport travado, `touch-action: pan-x pan-y` e barra presa no fundo depois de rolar (27/27)
- [x] Verificação com axe (subagente, API simulada, 12 rotas × 2 temas): zero violações; nada do `<main>` fica sob a barra; folhas inferiores ficam acima dela
- [x] Corrigido (já existia desde a R6): os textos sr-only da faixa de dias escapavam do trilho e esticavam `/desafio` para ~1.567 px; no Chrome do celular a barra de abas e o botão de check-in saíam da tela. Trilho com `relative`; página com 390 px e dia atual centralizado com desvio 0 px
- [ ] Limite conhecido (já existia): um segundo toque em outra aba durante a animação de troca (~0,5 s) se perde, porque o Chrome manda os toques para o `<html>` enquanto a View Transition roda (`pointer-events: none` no véu não resolve)
- [ ] E2E completo do web (`pnpm --filter web test:e2e`) não rodado: o emulador do Firebase precisa de Java, que não está instalado neste servidor
- [ ] Conferir no celular depois do deploy: pinça e duplo toque sem zoom no app instalado (Android e iPhone)

## Backlog por prioridade (2026-11-04)
P0 = participante real perde dia ou ganha dia indevido · P1 = número errado ou regra só no front · P2 = texto incoerente · P3 = depende do dono · P4 = crescimento

### R17: P0, regras do dia e das fotos
- [x] Foto confirmada depois da virada do dia não conta para o dia anterior (`confirmar` checa a janela e descarta o envio)
- [x] Tolerância de 5 min na virada da meia-noite para check-in e fotos que já estavam a caminho (`TOLERANCIA_VIRADA_MS`, vale também para o último dia)
- [x] Trocar uma foto não apaga a anterior antes de a nova chegar: migration `troca_foto_sem_perda` (índice único parcial só para fotos recebidas), a nova fica PENDENTE ao lado e a troca acontece na confirmação
- [x] **DoD:** api unit `janela.spec.ts` (9); api e2e 99/99 (2 novos: troca que não chega mantém o dia concluído; confirmação depois da virada → `DIA_NAO_EDITAVEL`)
- [x] Revisão independente (subagente) corrigida: a confirmação trava a foto nova antes de apagar a antiga (se a nova sumiu, nada sai; `fotos-troca.e2e-spec.ts`); a fila do worker vem antes de apagar os arquivos antigos, que viram best-effort; o modo app não cancela mais `touchend`/`touchmove` (engolia toques rápidos em "+1 página"); funil monotônico (isentos contam em "informaram"); admin que avisou Pix conta na receita; formulário de novo desafio com erro quando a lista não carrega

### R18: P1, números e regras no servidor
- [x] Indicadores: admin inscrito (confirmado sem Pix) fica fora da receita e de "informaram", como o embaixador (`isento`). O funil continua como documentado (informaram sem isentos, confirmados com todos)
- [x] Salvar o check-in sem mudança não devolve o dia para a fila de conferência nem limpa o cache do ranking
- [x] `ativar` ao criar desafio pela API passa a ser `false` por padrão (o painel já mandava explícito)
- [x] Perfil completo (dados + aceite dos termos) exigido também no servidor para participar (`exigirParticipante` → 403 `PERFIL_INCOMPLETO`)
- [x] **DoD:** api unit 55 (metricas +1); api e2e 101 (conferência +1, perfil +1); shared 77

### R19: P2, textos
- [x] Passos da landing na ordem do app: conta → vaga reservada → Pix → confirmação ("Passo 2 de 2" no pagamento fica: bate com o "Passo 1 de 2" do cadastro e com o E2E)
- [x] Q2/Q15 confirmados com o domínio real (everestt.app.br); marcador Q2 removido. "Desafio 30 Dias Everest" é o nome da marca (fica); "para 2027" na landing é texto de campanha (fica com o dono)

### P3, depende do dono (não construir sem resposta)
- Conteúdo da landing (TT, fotos, WhatsApp), vídeo, texto da privacidade (Q8), prêmio
- Embaixador compete no ranking? Sair da conta encerra a sessão em todos os aparelhos?
- Provedor para Pix com confirmação automática (custo por transação)

### P4, crescimento
- Lembrete diário (push no app instalado) para quem não fechou o dia
- Antifraude de fotos como sinal para o embaixador: **foto repetida feita na R20**. Data da foto (EXIF) fica de fora: o worker apaga o EXIF e muitos celulares e apps de mensagem não mandam
- Várias turmas, metas por desafio, comunidade

### R20: P4, sinal de foto parecida (2026-11-04)
- [x] Worker calcula o dHash (64 bits, 16 hex) da versão processada e grava em `FotoProva.hashPerceptual` (migration `20261104150000_hash_foto`, coluna nula; o índice parcial da R17 continua só no SQL). Imagem lisa (cor sólida) fica sem hash; falha no hash não derruba a foto
- [x] `fotos/hash-perceptual.ts`: `dHashDePixels`, `hashPerceptual` (sharp), `distanciaHamming` e `IndiceHashes` (casa dos pombos), com `DISTANCIA_MAX_PARECIDA = 5` (X20)
- [x] `GET /admin/desafios/:slug/participantes/:id/dias/:n`: cada foto traz `parecida` (`participanteId`, `nome`, `numeroDia`, `tipo`, `mesmaPessoa`) ou null, com uma consulta só (`admin/fotos-parecidas.ts`). A rota do participante continua sem o campo
- [x] Lista e detalhe do participante: `diasFotoParecida` (dias **para revisar** com foto parecida; aprovar ou invalidar tira da lista)
- [x] Painel: aviso no dia ("Uma foto deste dia é parecida com outra já enviada no desafio"), pílula em cada foto ("Parecida com a foto de Maria S. · dia 3 · água", com link para o dia da outra foto; sem link quando é do mesmo dia), "Foto parecida no dia N" na lista e atalhos "Dia N" no participante; tokens `aviso-*` dos dois temas
- [x] `scripts/hash-fotos.ts` (`node dist/cli/scripts/hash-fotos.js [--desafio <slug>] [--lote 20]`): preenche as fotos CONFIRMADA sem hash lendo o `.full.webp` do storage, em lotes com cursor; idempotente; resumo no fim (preenchidas, lisas, sem arquivo, falhas)
- [x] **DoD:** api unit 74 (+19: hash-perceptual 16, fotos-parecidas 3); api e2e 106 (fotos +3: mesma foto como água e leitura → `parecida` só no admin e sai da lista ao aprovar; outra pessoa com a mesma foto recomprimida e menor → aponta a original, fotos diferentes e lisas não; script preenche e roda de novo sem mexer); shared 77; web 143 (+8: `fotoParecida`, `FotosDia`); typecheck e lint verdes
- [ ] Produção: a migration roda sozinha no boot da API (`migrate deploy` no `CMD` da imagem); depois do deploy, rodar uma vez `docker compose -f docker-compose.prod.yml exec api node dist/cli/scripts/hash-fotos.js`
- [ ] axe/Playwright das telas do admin com foto parecida não rodados (este servidor roda a produção; sem a pilha de E2E). Cores só com os tokens `aviso-*` já aprovados no axe da R14

## R21: Água, treino e leitura em 1 toque (atalhos do ícone) (2026-11-04)
- [x] `/hoje?acao=agua|treino|leitura` (`features/checkin/acaoRapida.ts`): água +250 ml, treino feito, leitura = meta (10 páginas). `RedirecionarHoje` leva a ação para o dia atual (ou `/desafio` fora do período); `useAcaoRapida` aplica uma vez na tela do dia, salva na hora, mostra toast e limpa a URL com replace (dia fechado ou offline só avisa)
- [x] `shortcuts` do manifest (`features/pwa/atalhos.ts`, fonte única com o `vite.config.ts`): toque longo no ícone no Android mostra "Água +250 ml", "Treino feito" e "Leitura feita"
- [x] Folha "Instalar o app": seção "Água, treino e leitura em 1 toque" (Android: toque longo; iPhone: botões que copiam o link de cada ação para o app Atalhos, que vira widget). Limite da plataforma: no iPhone o link abre no Safari, não dentro do app instalado
- [x] **DoD:** web unit 162 (+19: `acaoRapida`, `useAcaoRapida`, `atalhos`); typecheck e lint verdes; manifest do build conferido com os 3 atalhos. Smoke E2E ganhou `/hoje?acao=agua` (+250 ml, toast, URL limpa, persistência), `treino` já marcado e o teste do manifest
- [ ] E2E do web não rodado neste servidor (sem Java para o emulador do Firebase)
- [ ] Widget nativo de tela inicial não existe para PWA (Android nem iOS); só com app nativo. Próximo passo possível: Web Push com botões de ação no Android (registrar água direto da notificação)

## R22: Notificações push com ações rápidas (2026-11-05)
- [x] Shared: `regras/acaoRapida.ts` (saiu do web, que reexporta), `regras/push.ts` (`LEMBRETES_PUSH`, `MODELOS_AVISO`), schemas `pushInscricaoSchema`, `avisoPushSchema`, `acaoRapidaSchema`, tipos do push e o código `PUSH_NAO_CONFIGURADO`
- [x] API (`modules/push`): `PushInscricao` (migration `20261105100000_push_inscricao`); `GET /push/chave-publica`, `GET/PUT/DELETE /push/inscricao`; `POST /acoes-rapidas` (mesmo caminho de salvar do `PUT /dias/:n`, 30/min); `GET /admin/desafios/:slug/push` e `POST /admin/desafios/:slug/avisos`. Lembretes por job schedulers do BullMQ (água 10h/14h/17h, treino 18h, leitura 21h, fuso do desafio ativo), ressincronizados ao ativar/desativar desafio. 404/410 apaga a inscrição; 5 falhas seguidas também. Excluir a conta apaga as inscrições
- [x] Web: service worker próprio (`src/sw.ts`, `injectManifest`) com precache, fallback da SPA, `SKIP_WAITING`, `push` e `notificationclick` (botão de ação → `POST /api/acoes-rapidas` e confirmação; sem sessão → abre `/hoje?acao=X`). `usePush`, "Lembretes no celular" no Perfil, `ConvitePush` na home, linha na `FolhaInstalar` (iPhone) e a aba `/admin/avisos`
- [x] **DoD:** shared 82, api unit 92 e e2e 122 (`push.e2e-spec` com 16 casos, infra dev só em 127.0.0.1), web unit 220; typecheck, lint e build verdes. SW conferido no navegador (vite preview + Playwright com API simulada): registra, 3 atalhos no manifest, fallback offline, push falso com botão "+250 ml", clique no botão chama a API, "Atualizar" continua funcionando
- [ ] Produção: gerar as chaves VAPID e pôr no `.env` antes do próximo `up` (`docs/DEPLOY-CONTABO.md`); sem elas o compose não sobe
- [ ] Teste real no Android (botão na notificação) e no iPhone com o app instalado
- [ ] Duas ações de água ao mesmo tempo podem perder uma soma (lê e grava o dia sem trava). Raro; tratar se aparecer
- [ ] E2E do web e axe nas telas novas não rodados aqui (sem Java para o emulador do Firebase)

