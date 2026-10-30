# syntax=docker/dockerfile:1
#
# Imagem do app (PWA) para servidor próprio (Contabo): build do Vite + Caddy.
# O Caddy serve os arquivos estáticos, faz o HTTPS (Let's Encrypt) e repassa:
#   /api/*  → container da API
#   /__/*   → <projeto>.firebaseapp.com (login com Google no iPhone instalado)
#   subdomínio de arquivos → MinIO (fotos de prova, URLs assinadas)
# Build a partir da RAIZ do repositório:
#   docker build -f apps/web/Dockerfile -t everest-web .
# As variáveis VITE_* entram no bundle (são públicas); passe-as como build args.

ARG NODE_VERSION=24
ARG PNPM_VERSION=10.34.9

FROM node:${NODE_VERSION}-bookworm-slim AS build
ARG PNPM_VERSION
ENV CI=true
RUN npm install -g "pnpm@${PNPM_VERSION}" && npm cache clean --force
WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter "web..."

COPY packages/shared packages/shared
COPY apps/web apps/web

ARG VITE_APP_URL
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_APP_ID
# Produção nunca usa o emulador.
ENV VITE_APP_URL=${VITE_APP_URL} \
    VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY} \
    VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN} \
    VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID} \
    VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID} \
    VITE_FIREBASE_EMULADOR=

RUN test -n "$VITE_FIREBASE_API_KEY" && test -n "$VITE_FIREBASE_PROJECT_ID" \
      || (echo "Faltam os build args VITE_FIREBASE_* (veja deploy/env.producao.example)" && exit 1)
# Sem o .env de dev do web (ignorado no contexto): só os VITE_* acima valem.
RUN pnpm --filter @everest/shared build && pnpm --filter web exec vite build

# ---------------------------------------------------------------------------
FROM caddy:2.10-alpine AS runtime
COPY --from=build /repo/apps/web/dist /srv
COPY deploy/Caddyfile /etc/caddy/Caddyfile
