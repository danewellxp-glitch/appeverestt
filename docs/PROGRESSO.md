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
- [ ] Pacote `@everest/shared` com tsup (cjs + esm + dts) e `exports` corretos
- [ ] Constantes, schemas zod e funções da seção 8
- [ ] Testes da seção 8
- [ ] **DoD:** `test` 100%; `build` gera `dist/index.js`, `index.cjs`, `index.d.ts`

## FASE 2: Base da API
- [ ] Projeto Nest em `apps/api` dependendo de `@everest/shared`
- [ ] ConfigModule com validação zod do env
- [ ] Prisma: schema, migration inicial + `checks`, `PrismaService`
- [ ] `RedisModule`
- [ ] `main.ts`: `/api`, helmet, cookie-parser, trust proxy, Swagger em dev, filtro de exceções, ZodValidationPipe, CORS dev
- [ ] `GET /api/health`
- [ ] `prisma/seed.ts` idempotente
- [ ] Scripts `criar-desafio`, `criar-admin`, `redefinir-senha`
- [ ] **DoD:** migrate ok; start:dev sobe; health 200; `/api/docs` abre; seed 2× sem duplicar; CHECK `vagaNumero = 0` falha

## FASE 3: Autenticação
- [ ] cadastro, login, logout, me
- [ ] `JwtAuthGuard`, `AdminGuard`, `@UsuarioAtual()`, checagem de `Origin`
- [ ] `ThrottlerModule`
- [ ] Testes e2e de auth
- [ ] **DoD:** `pnpm --filter api test:e2e` passa

## FASE 4: Desafio e inscrição
- [ ] `GET /desafios/atual` com cache de vagas
- [ ] `POST /desafios/:slug/inscricao` com trava
- [ ] Q3 aplicada no seed/script do embaixador
- [ ] Teste de concorrência 60 → 50/10
- [ ] Teste mesmo usuário 2× em paralelo
- [ ] Teste `INSCRICOES_FECHADAS`
- [ ] **DoD:** testes passando

## FASE 5: Check-in diário e progresso
- [ ] `GET /meu-progresso`, `GET /dias/:n`, `PUT /dias/:n`
- [ ] PUT valida janela, upsert, recalcula `concluido`, invalida ranking
- [ ] Testes da fase
- [ ] **DoD:** testes passando; Swagger com exemplos

## FASE 6: Fotos
- [ ] `StorageService`
- [ ] `upload-url`, `confirmar`, `DELETE`
- [ ] BullMQ: fila `fotos`, `processar-foto`, limpeza repetível
- [ ] Recálculo do dia após confirmar/rejeitar/deletar
- [ ] Testes de integração com MinIO
- [ ] Teste sem EXIF
- [ ] **DoD:** testes passando; objeto no MinIO; URL assinada abre e expira

## FASE 7: Ranking
- [ ] Consulta agregada + sequências + `ordenarRanking` + `nomeExibicao`
- [ ] Cache + `minhaPosicao`
- [ ] Testes
- [ ] **DoD:** testes passando

## FASE 8: Admin
- [ ] Endpoints admin com `AdminGuard`
- [ ] Invalidação grava quem/quando, recalcula, invalida ranking
- [ ] Testes
- [ ] **DoD:** `pnpm --filter api test && pnpm --filter api test:e2e`

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
