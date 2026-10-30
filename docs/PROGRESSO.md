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
- [ ] Playwright com o emulador do Firebase: smoke criar conta → bem-vindo → vaga → check-in com 3 fotos → dia concluído → ranking; smoke Google → bem-vindo
- [ ] axe nas 14 telas × 2 temas: zero violações sérias ou críticas
- [ ] Lighthouse mobile e tamanho dos chunks (seção 11)
- [ ] **DoD:** números reportados no relatório

## R12: Produção
- [ ] `docs/DEPLOY.md` com a seção 5.5 e as variáveis novas
- [ ] `scripts/verificar-producao.mjs`: `/__/auth/handler` responde e `/api/auth/sessao` existe
- [ ] `pnpm check:launch` sem marcadores
- [ ] **DoD:** login com Google no iPhone com o app instalado (redirect) e no Android (popup) no domínio real
