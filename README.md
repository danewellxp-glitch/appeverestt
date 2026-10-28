# Everest Desafio

App (PWA mobile-first) do **Desafio 30 Dias Everest**: até 50 vagas, check-in diário de 5 requisitos com 3 fotos de prova, ranking e tela de conferência para o embaixador.

- Requisitos e regras: [docs/PROMPT_CURSOR.md](docs/PROMPT_CURSOR.md)
- Decisões (produto e técnicas): [docs/DECISOES.md](docs/DECISOES.md)
- Andamento por fase: [docs/PROGRESSO.md](docs/PROGRESSO.md)
- Publicação: [docs/DEPLOY.md](docs/DEPLOY.md)

## Estrutura

| Pasta | O que é |
|---|---|
| `packages/shared` | Regras de negócio (conclusão do dia, dia atual, sequências, ranking) + schemas zod + tipos da API. Fonte única da verdade |
| `apps/api` | NestJS 11 + Prisma 6 (PostgreSQL) + Redis (cache) + BullMQ (worker de fotos) + S3/R2 |
| `apps/web` | React 19 + Vite 8 + Tailwind v4 + TanStack Query + PWA |

## Rodar localmente

Pré-requisitos: Node 24, pnpm 10, Docker Desktop.

```bash
pnpm install
docker compose up -d                      # postgres, redis, minio (+ cria o bucket privado)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm --filter @everest/shared build
pnpm --filter api exec prisma migrate dev
pnpm --filter api seed                    # SÓ desenvolvimento: admin + desafio + 5 participantes fictícios
pnpm dev                                  # shared (watch) + API :3000 + web :5173
```

- App: http://localhost:5173 · API: http://localhost:3000/api · Swagger: http://localhost:3000/api/docs · MinIO: http://localhost:9001 (everest / everest-dev-secret)
- Logins do seed: `admin@everest.dev` (admin/embaixador) e `maria@everest.dev`, `joao@…`, `ana@…`, `carlos@…`, `beatriz@…` — senha `everest-dev-123`.

## Testes e qualidade

```bash
pnpm --filter @everest/shared test        # regras de negócio
pnpm --filter api test                    # unitários da API
pnpm --filter api test:e2e                # e2e da API (usa banco everest_test, Redis db 1 e bucket de teste)
pnpm typecheck && pnpm lint
pnpm check:launch                         # falha se restar [LINK_DO_APP], @[SEU_@] ou TODO_DECISAO
```

## Scripts de operação (API)

```bash
pnpm --filter api criar-desafio --slug desafio-30-everest --nome "Desafio 30 Dias Everest" --dataInicio 2026-11-01 --handle everest --totalVagas 50
pnpm --filter api criar-admin --nome "Anderson" --email anderson@exemplo.com --senha "..." --embaixador
pnpm --filter api redefinir-senha --email pessoa@exemplo.com --senha "nova-senha"
```
