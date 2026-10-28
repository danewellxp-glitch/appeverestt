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
- [ ] Vite react-ts + `@everest/shared`
- [ ] Tailwind + tokens + `styles/index.css`
- [ ] Proxy `/api`
- [ ] `lib/api.ts`, `lib/erros.ts`, `queryClient`
- [ ] `useMe`, `RotaProtegida`, `RotaInscrito`, `RotaAdmin`
- [ ] `AppShell`, `BottomNav`, `Watermark`, Login, Cadastro, Privacidade
- [ ] Script `dev` raiz em paralelo
- [ ] **DoD:** `pnpm dev`; cadastro/login; sessão persiste; build + typecheck

## FASE 10: Telas do produto
- [ ] Entrada, Hoje, Progresso, Ranking, Regras, Admin
- [ ] Upload com compressão e progresso
- [ ] Autosave otimista + indicador
- [ ] Todos os estados
- [ ] **DoD:** roteiro manual 1–8

## FASE 11: PWA
- [ ] Seção 11 completa + ícones
- [ ] Toast de nova versão + banner offline
- [ ] **DoD:** manifest ok, SW ativo, instalável, offline shell, `/api` fora do cache

## FASE 12: Qualidade
- [ ] Playwright smoke + axe
- [ ] Contraste
- [ ] Lighthouse + bundle < 200 KB gzip
- [ ] Logo otimizada
- [ ] **DoD:** e2e passando; números reportados

## FASE 13: Deploy
- [ ] Dockerfile multi-stage
- [ ] `docs/DEPLOY.md`
- [ ] `vercel.json`
- [ ] Checklist de produção
- [ ] **DoD:** link público em Android/iPhone (requer contas e domínio do usuário)
