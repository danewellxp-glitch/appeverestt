# syntax=docker/dockerfile:1
#
# Imagem de produção da API + worker (mesmo processo).
# Build a partir da RAIZ do repositório (o contexto precisa do workspace pnpm):
#   docker build -f apps/api/Dockerfile -t everest-api .
#
# Estágios:
#   base    → Node 24 (Debian bookworm slim) + openssl (exigido pelo Prisma) + pnpm
#   build   → instala o workspace, compila @everest/shared e a API, isola as
#             dependências de produção com `pnpm deploy` e gera o Prisma Client para Linux
#   runtime → só o necessário para rodar; usuário não-root; tini como PID 1

ARG NODE_VERSION=24
ARG PNPM_VERSION=10.34.9

# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS base
ARG PNPM_VERSION
ENV CI=true \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && npm install -g "pnpm@${PNPM_VERSION}" \
 && npm cache clean --force

# ---------------------------------------------------------------------------
FROM base AS build
WORKDIR /repo

# 1) Manifestos primeiro (camada de dependências fica em cache enquanto o lockfile não muda).
#    O manifesto do web entra só para o pnpm reconhecer o importer do lockfile.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/api/prisma apps/api/prisma

# `api...` = a API e suas dependências do workspace (@everest/shared), com devDependencies
# (precisamos de tsup, nest, typescript e prisma para compilar). Nada do web é instalado.
RUN pnpm install --frozen-lockfile --filter "api..."

# 2) Código-fonte e build (shared antes da API: a API importa @everest/shared/dist).
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @everest/shared build \
 && pnpm --filter api exec prisma generate \
 && pnpm --filter api build

# 3) Pasta de produção isolada: só dependências de produção, com @everest/shared
#    copiado (não symlink). `--legacy` porque o workspace não usa inject-workspace-packages
#    (o deploy "novo" do pnpm 10 exige essa opção).
RUN pnpm --filter api deploy --prod --legacy /prod/api \
 && rm -rf /prod/api/dist /prod/api/src /prod/api/scripts /prod/api/test \
           /prod/api/tsconfig*.json /prod/api/nest-cli.json /prod/api/prisma/seed.ts \
 && cp -R apps/api/dist /prod/api/dist

# 4) Prisma CLI para o `prisma migrate deploy` do start.
#    `prisma` é devDependency da API, mas o `deploy --prod` já o instala como peer do
#    @prisma/client (mesma versão do lockfile) — só não fica em node_modules/prisma.
#    Expomos esse pacote em /app/node_modules/prisma. Se um dia o pnpm deixar de trazê-lo,
#    instalamos a MESMA versão do workspace com npm (fallback).
#    Depois geramos o Prisma Client dentro da pasta de produção: o generate roda neste Linux,
#    então o engine é o debian-openssl-3.0.x (não precisa de binaryTargets no schema).
WORKDIR /prod/api
RUN set -e; \
    PRISMA_VERSION="$(node -p "require('/repo/apps/api/node_modules/prisma/package.json').version")"; \
    CLI="$(ls -d node_modules/.pnpm/prisma@"${PRISMA_VERSION}"*/node_modules/prisma 2>/dev/null | head -n1 || true)"; \
    if [ -z "$CLI" ]; then \
      echo "prisma ${PRISMA_VERSION} não veio no deploy; instalando com npm"; \
      npm install --prefix /prod/api/.prisma-cli --no-audit --no-fund --omit=dev "prisma@${PRISMA_VERSION}"; \
      npm cache clean --force; \
      CLI=".prisma-cli/node_modules/prisma"; \
    fi; \
    echo "Prisma CLI ${PRISMA_VERSION}: ${CLI}"; \
    ln -s "/app/${CLI}" node_modules/prisma; \
    node "${CLI}/build/index.js" generate --schema prisma/schema.prisma; \
    test -f "$(dirname "$(node -p "require.resolve('@prisma/client/package.json')")")/../../.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node"; \
    test -f node_modules/@everest/shared/dist/index.cjs

# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates tini \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=3000 \
    CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1

WORKDIR /app
COPY --from=build /prod/api /app

# Usuário sem privilégios (já existe na imagem oficial do Node, uid 1000).
USER node

EXPOSE 3000

# 503 quando o banco ou o Redis caem. start-period cobre as migrations no boot.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# tini repassa SIGTERM ao Node (o Nest fecha conexões e o worker BullMQ com enableShutdownHooks).
ENTRYPOINT ["/usr/bin/tini", "--"]
# Migrations primeiro; se falharem, o container não sobe (e a plataforma mantém a versão anterior).
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && exec node dist/main"]
