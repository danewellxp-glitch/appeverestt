# Deploy em produção — Desafio 30 Dias Everest

Guia passo a passo para colocar o app no ar. Foi escrito para quem **não é especialista**:
siga na ordem, sem pular etapas. Onde aparecer `<algo>` entre sinais de menor/maior, troque
pelo seu valor (sem os sinais).

> **Antes de começar, confira os bloqueios de lançamento em `docs/DECISOES.md`:**
> Q1 (@ do Instagram), Q2 (link do app), Q8 (texto de privacidade), Q15 (domínio) e LOGO.
> Você pode fazer o deploy técnico antes, mas **não divulgue o link** enquanto eles não estiverem
> com Status CONFIRMADO e `pnpm check:launch` não passar.

---

## 1. Visão geral (arquitetura)

```text
                    celular (Chrome / Safari) — PWA instalado
                                   │  https://<domínio-do-app>
                                   ▼
             ┌───────────────────────────────────────────────┐
             │ VERCEL  (projeto com Root Directory = apps/web)│
             │  • arquivos estáticos do app (SPA + PWA)       │
             │  • rewrite  /api/*  ──────────────┐            │
             └───────────────────────────────────┼────────────┘
                 mesma origem → cookie de sessão │ (proxy HTTPS)
                 fica no domínio do app          ▼
             ┌───────────────────────────────────────────────┐
             │ RAILWAY  — 1 container Docker (apps/api)       │
             │  NestJS (API)  +  worker BullMQ (mesmo processo)│
             │  start: prisma migrate deploy → node dist/main │
             └───────┬──────────────────┬──────────────┬─────┘
                     │                  │              │ S3 API (assina URLs)
                     ▼                  ▼              ▼
             PostgreSQL gerenciado   Redis gerenciado   CLOUDFLARE R2 (bucket PRIVADO)
             (dados)                 (fila + cache)        ▲
                                                           │ PUT / GET diretos do navegador
                     celular ──────────────────────────────┘ via URL assinada (10 min)
```

Por que assim:

- **Mesma origem:** o navegador só fala com `https://<domínio-do-app>`. A Vercel repassa `/api/*`
  para a API. Por isso o cookie `everest_sessao` é "primário" (funciona no Safari/iOS) e não
  existe CORS entre app e API.
- **Fotos não passam pela API:** o celular envia direto para o R2 com uma URL assinada. A API só
  confere e processa (worker).
- **Uma instância só da API.** O rate limit (proteção contra abuso de login/cadastro) fica em
  memória. Duas instâncias dividiriam os contadores. **Não escale horizontalmente** (réplicas = 1).

Provedores escolhidos neste guia (o caminho principal):

| Peça         | Provedor principal                   | Alternativas                               |
| ------------ | ------------------------------------ | ------------------------------------------ |
| API + worker | **Railway** (Docker)                 | Render, Fly.io, VPS com Docker (seção 6.4) |
| PostgreSQL   | **Railway Postgres** (mesmo projeto) | Neon, Supabase (seção 3.2)                 |
| Redis        | **Railway Redis** (mesmo projeto)    | Upstash (com ressalvas, seção 4.2)         |
| Fotos        | **Cloudflare R2**                    | —                                          |
| App (web)    | **Vercel**                           | —                                          |

---

## 2. Domínio (Q15)

Defina **um** domínio para o app, por exemplo `https://desafio.everest.com.br`. Ele será usado em:

- `WEB_ORIGIN` da API (seção 7);
- `AllowedOrigins` do CORS do R2 (seção 5);
- `VITE_APP_URL` na Vercel (Q2);
- domínio do projeto na Vercel (seção 8).

A API **não precisa de domínio próprio**: o endereço gerado pelo Railway
(`<algo>.up.railway.app`) basta, porque o usuário nunca acessa a API diretamente.

> Dica: se o domínio ainda não existir, faça tudo com o endereço `https://<projeto>.vercel.app`
> e troque depois (lembre de atualizar os 4 lugares acima).

---

## 3. PostgreSQL gerenciado

### 3.1 Railway Postgres (recomendado)

1. Crie uma conta em <https://railway.com> e um **projeto novo** (ex.: `everest`).
   Escolha a região **US East** (mais perto do Brasil entre as opções do Railway).
2. No projeto: **+ Create → Database → PostgreSQL**.
3. Abra o serviço Postgres → aba **Variables** → copie `DATABASE_URL`
   (formato `postgresql://postgres:<senha>@postgres.railway.internal:5432/railway`).
   Esse endereço `*.railway.internal` só funciona de dentro do projeto (o que é bom: o banco não
   fica exposto).
4. A URL final da API terá parâmetros extras (seção 7):

   ```text
   postgresql://postgres:<senha>@postgres.railway.internal:5432/railway?schema=public&connection_limit=10
   ```

   `connection_limit=10` limita as conexões que a API abre (o padrão do Prisma depende do número
   de CPUs e pode estourar planos pequenos).

> No Railway você pode referenciar a variável em vez de copiar:
> `DATABASE_URL=${{Postgres.DATABASE_URL}}?schema=public&connection_limit=10`.

### 3.2 Alternativas: Neon ou Supabase

O schema do Prisma usa **uma única URL** (`DATABASE_URL`) tanto para as migrations quanto para o
app. Por isso use sempre a conexão **direta** (ou pooler em modo _session_), nunca o pooler em
modo _transaction_ — ele quebra o `prisma migrate deploy`.

- **Neon:** crie o projeto na região **AWS São Paulo (sa-east-1)** ou **US East**, a mesma
  região/continente da API. Em _Connection string_, **desligue "Connection pooling"** (o host
  não pode ter `-pooler`). Adicione `&sslmode=require&connection_limit=5` se ainda não houver.
  No plano gratuito o banco "dorme" quando ocioso; a primeira requisição depois disso demora
  alguns segundos.
- **Supabase:** use a string **Session pooler** (porta **5432**) ou a conexão direta.
  **Não use** a porta 6543 (transaction pooler / `pgbouncer=true`). Adicione
  `?sslmode=require&connection_limit=5`.

---

## 4. Redis gerenciado

A API usa o Redis para a **fila BullMQ** (processamento das fotos + limpeza de hora em hora) e
para **cache**. O código já configura `maxRetriesPerRequest: null` na conexão do BullMQ (exigência
da lib) e entende `rediss://` (TLS) automaticamente.

### 4.1 Railway Redis (recomendado)

1. No mesmo projeto: **+ Create → Database → Redis**.
2. Copie `REDIS_URL` (formato `redis://default:<senha>@redis.railway.internal:6379`).
   Rede privada: não precisa de TLS e não é exposta à internet.
3. **Atenção a ambientes antigos:** projetos/ambientes do Railway criados **antes de
   16/10/2025** só têm IPv6 na rede privada, e a conexão do BullMQ desta API não aceita o
   parâmetro `?family=0`. Se o `/api/health` mostrar `"redis":"erro"` com `ENOTFOUND` nos logs,
   crie um ambiente/projeto novo ou use a URL pública do Redis (`REDIS_PUBLIC_URL`, via TCP
   proxy).

### 4.2 Alternativa: Upstash (com ressalvas)

- Use a URL **`rediss://`** (com dois "s": TLS obrigatório no Upstash):
  `rediss://default:<senha>@<nome>.upstash.io:6379`.
- **Custo/limite de comandos:** o worker do BullMQ fica consultando a fila o tempo todo, mesmo
  sem fotos (comandos bloqueantes + checagem de jobs travados + job repetível de limpeza). Isso
  consome centenas de milhares de comandos por mês **parado**, o que estoura o plano gratuito e
  encarece o "pay as you go". Se for usar Upstash, escolha um plano **fixo** (sem cobrança por
  comando) e na mesma região da API. Por isso o Railway Redis é o recomendado.
- Não use Redis "serverless/HTTP" (REST): o BullMQ precisa de conexão TCP.

---

## 5. Cloudflare R2 (fotos) — bucket privado

1. Painel da Cloudflare → **R2 Object Storage** → ative o R2 (pede cartão, mas o uso do MVP cabe
   no plano gratuito).
2. **Create bucket**:
   - Nome: `everest-provas`
   - Location: _Automatic_ ou dica **ENAM** (leste da América do Norte, a mais perto do Brasil).
   - **Não** ative "Public access" / r2.dev / domínio público. O bucket deve ficar **privado**:
     todas as leituras são por URL assinada que expira em 10 minutos.
3. Anote o **Account ID** (aparece na página inicial do R2, lado direito).
4. **Token de API:** R2 → **Manage R2 API Tokens → Create API token**:
   - Permissions: **Object Read & Write**
   - Specify bucket(s): **apenas** `everest-provas`
   - TTL: sem expiração (ou anote a data para renovar)
   - Copie **Access Key ID** e **Secret Access Key** (o segredo só aparece uma vez).
5. **CORS** do bucket: `everest-provas` → **Settings → CORS Policy → Add CORS policy** e cole
   (troque pelo seu domínio — só esquema + host, **sem barra no final**):

   ```json
   [
     {
       "AllowedOrigins": ["https://desafio.everest.com.br"],
       "AllowedMethods": ["PUT", "GET"],
       "AllowedHeaders": ["Content-Type"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

   - `PUT`: o celular envia a foto direto para o R2.
   - `GET`: leitura das fotos/miniaturas pelas URLs assinadas.
   - `Content-Type` é o único header que o app envia (e ele faz parte da assinatura: o R2 recusa
     um tipo diferente do que a API autorizou).
   - Se usar também o endereço `*.vercel.app`, inclua-o na lista `AllowedOrigins`.

Valores para a API (seção 7):

| Variável               | Valor                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `S3_ENDPOINT`          | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`                                    |
| `S3_REGION`            | `auto`                                                                             |
| `S3_BUCKET`            | `everest-provas`                                                                   |
| `S3_ACCESS_KEY_ID`     | Access Key ID do token                                                             |
| `S3_SECRET_ACCESS_KEY` | Secret Access Key do token                                                         |
| `S3_FORCE_PATH_STYLE`  | `false` (formato padrão documentado pela Cloudflare; `true` também funciona no R2) |

---

## 6. API + worker (container Docker)

A imagem é definida em `apps/api/Dockerfile` e **sempre é construída a partir da raiz do
repositório** (ela precisa do workspace pnpm e do `packages/shared`).

O que a imagem faz:

- compila `@everest/shared` e a API, isola as dependências de produção com `pnpm deploy`;
- gera o Prisma Client para Linux e inclui o Prisma CLI (só para as migrations);
- inclui os scripts administrativos já compilados em `dist/cli/scripts/*.js` (seção 9);
- roda como usuário **não-root** (`node`), com `NODE_ENV=production`;
- ao iniciar: `prisma migrate deploy` → `node dist/main`. Se a migration falhar, o container não
  sobe (o Railway mantém a versão anterior no ar);
- `HEALTHCHECK` em `/api/health` (responde 503 se banco ou Redis caírem).

Teste local (opcional, precisa de Docker):

```bash
docker build -f apps/api/Dockerfile -t everest-api .
```

### 6.1 Railway (caminho principal)

1. Suba o repositório para o GitHub (privado).
2. No projeto do Railway: **+ Create → GitHub Repo** → escolha o repositório.
3. No serviço criado → **Settings**:
   - **Root Directory:** deixe **vazio** (raiz do repositório — é o contexto do Docker).
   - **Builder:** Dockerfile. Para apontar o arquivo, crie a variável
     `RAILWAY_DOCKERFILE_PATH=apps/api/Dockerfile` (aba Variables).
   - **Watch Paths** (opcional, evita rebuild quando só o web muda):
     `apps/api/**`, `packages/shared/**`, `pnpm-lock.yaml`.
   - **Healthcheck Path:** `/api/health`.
   - **Replicas:** **1**. **Serverless / App Sleeping:** **desligado** (o worker e a limpeza de
     hora em hora precisam ficar rodando).
   - **Region:** a mesma do Postgres/Redis.
   - **Restart policy:** On Failure.
4. Aba **Variables**: preencha todas as variáveis da seção 7.
5. **Settings → Networking → Generate Domain** (porta **3000**). Anote o host gerado, ex.:
   `everest-api-production.up.railway.app`. Esse é o `<API_HOST>` da seção 8.
6. **Deploy**. Acompanhe em _Deployments → View logs_. Você deve ver as migrations
   (`All migrations have been successfully applied` ou `No pending migrations to apply`) e depois
   `API ouvindo em ...`.
7. Teste: abra `https://<API_HOST>/api/health` → deve mostrar `{"db":"ok","redis":"ok"}`.

### 6.2 Render (alternativa)

_New → Web Service_ → repositório → **Runtime: Docker**, **Dockerfile Path:**
`apps/api/Dockerfile`, **Docker Build Context Directory:** `.` (raiz). **Health Check Path:**
`/api/health`. Use um plano pago (o gratuito "dorme" e para o worker). 1 instância. Para os
scripts administrativos use a aba **Shell** do serviço.

### 6.3 Fly.io (alternativa)

`fly launch --dockerfile apps/api/Dockerfile --no-deploy` na raiz do repositório; no `fly.toml`
use `internal_port = 3000`, `auto_stop_machines = "off"`, `min_machines_running = 1` e mantenha
**uma** máquina (`fly scale count 1`). Variáveis com `fly secrets set CHAVE=valor`. Scripts:
`fly ssh console -C "node dist/cli/scripts/criar-admin.js ..."`.

### 6.4 VPS com Docker (alternativa)

`docker build -f apps/api/Dockerfile -t everest-api .` e
`docker run -d --restart unless-stopped --env-file api.env -p 3000:3000 everest-api`, atrás de um
proxy HTTPS (Caddy/Nginx) com certificado válido. A Vercel exige HTTPS no destino do rewrite.

---

## 7. Variáveis de ambiente

### 7.1 API (Railway → serviço da API → Variables)

A API **não sobe** se faltar alguma variável obrigatória ou se o formato estiver errado (validação
com zod no boot — os logs dizem qual variável).

| Variável                          | O que colocar                                                                                           | Exemplo                                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                        | `production` (já vem na imagem; pode repetir)                                                           | `production`                                                                                         |
| `PORT`                            | `3000` (porta do domínio gerado no Railway)                                                             | `3000`                                                                                               |
| `DATABASE_URL`                    | URL do Postgres + `?schema=public&connection_limit=10` (seção 3)                                        | `postgresql://postgres:***@postgres.railway.internal:5432/railway?schema=public&connection_limit=10` |
| `REDIS_URL`                       | URL do Redis (seção 4)                                                                                  | `redis://default:***@redis.railway.internal:6379`                                                    |
| `JWT_SECRET`                      | Segredo aleatório **forte**, ≥ 32 caracteres (comando abaixo). **Nunca** reutilize o de desenvolvimento | `k3J...` (64 caracteres)                                                                             |
| `WEB_ORIGIN`                      | Domínio do app, **exato**, sem barra no final. Várias origens separadas por vírgula                     | `https://desafio.everest.com.br`                                                                     |
| `S3_ENDPOINT`                     | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`                                                         |                                                                                                      |
| `S3_REGION`                       | `auto`                                                                                                  | `auto`                                                                                               |
| `S3_BUCKET`                       | `everest-provas`                                                                                        |                                                                                                      |
| `S3_ACCESS_KEY_ID`                | do token R2                                                                                             |                                                                                                      |
| `S3_SECRET_ACCESS_KEY`            | do token R2                                                                                             |                                                                                                      |
| `S3_FORCE_PATH_STYLE`             | `false`                                                                                                 | `false`                                                                                              |
| `PERMITIR_EDITAR_DIAS_ANTERIORES` | `false` (decisão X1)                                                                                    | `false`                                                                                              |
| `TRUST_PROXY_HOPS` | `2` (Vercel + borda do Railway; veja "Riscos conhecidos") | `1` |
| `RAILWAY_DOCKERFILE_PATH`         | `apps/api/Dockerfile` (só Railway)                                                                      |                                                                                                      |

**Não** defina `THROTTLE_ATIVO` em produção (ele existe só para testes; o padrão `true` mantém o
rate limit ligado).

Gerar o `JWT_SECRET` (qualquer computador com Node):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

(ou `openssl rand -base64 48`). Trocar o `JWT_SECRET` depois **desloga todo mundo**.

Sobre o `WEB_ORIGIN`: a API recusa POST/PUT/PATCH/DELETE cujo header `Origin` não esteja nessa
lista (proteção contra CSRF). Se o app abrir pelo domínio próprio **e** por `*.vercel.app`,
liste os dois: `https://desafio.everest.com.br,https://everest-desafio.vercel.app`.

### 7.2 Web (Vercel → Project → Settings → Environment Variables)

| Variável                       | O que colocar                                                            |
| ------------------------------ | ------------------------------------------------------------------------ |
| `VITE_APP_URL`                 | Link público do app (Q2), ex.: `https://desafio.everest.com.br`          |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` — faz a Vercel usar o pnpm fixado no `package.json` (`pnpm@10.34.9`) |

Variáveis `VITE_*` entram no build: depois de mudar, faça **Redeploy**.

---

## 8. Vercel (app web / PWA)

1. **Antes**, edite `apps/web/vercel.json` e troque `API_HOST_AQUI` pelo host da API (só o host,
   sem `https://` e sem barra), ex.:

   ```json
   {
     "source": "/api/:path*",
     "destination": "https://everest-api-production.up.railway.app/api/:path*"
   }
   ```

   Faça commit e push. ⚠️ O `pnpm check:launch` **não** verifica o `vercel.json`; use
   `node scripts/verificar-producao.mjs` (seção 11), que acusa se o marcador ainda estiver lá.

2. <https://vercel.com> → **Add New → Project** → importe o repositório.
3. Configuração:
   - **Root Directory:** `apps/web`
   - Mantenha marcado **"Include files outside the Root Directory in the Build Step"** (o app
     usa `packages/shared`).
   - Framework: **Vite**. Os comandos já vêm do `apps/web/vercel.json`:
     - Install: `pnpm install --frozen-lockfile --filter "web..."`
     - Build: `pnpm --filter "web..." run build` (compila `@everest/shared` e depois o web)
     - Output: `dist`
4. Variáveis da seção 7.2 → **Deploy**.
5. **Settings → Domains** → adicione o domínio (Q15) e configure o DNS conforme a Vercel mostrar.
   O HTTPS é automático.

O que o `vercel.json` faz:

- `/api/*` → API (proxy). Fica na mesma origem do app, então o cookie de sessão funciona.
- Qualquer outra rota que não seja um arquivo real → `/index.html` (SPA). Arquivos reais
  (`/assets/...`, `/logo.png`, `/sw.js`) são servidos antes do fallback.
- Cache: `/assets/*` (nomes com hash) por 1 ano `immutable`; `sw.js`, `registerSW.js`,
  `index.html` e `manifest.webmanifest` com `no-cache` (sempre revalidados — senão o aviso
  "Nova versão disponível" demora a aparecer).
- Segurança: `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY` e
  `Permissions-Policy` que bloqueia microfone, localização, pagamento e USB. A câmera fica
  permitida para o próprio site (`camera=(self)`), para não atrapalhar o envio de foto pelo
  `<input type="file">`. A Vercel já envia HSTS.

---

## 9. Primeiro deploy (ordem) e dados iniciais

### 9.1 Ordem

1. Domínio definido (seção 2).
2. Postgres e Redis criados (seções 3 e 4).
3. Bucket R2 + token + CORS (seção 5).
4. API no Railway com todas as variáveis; `/api/health` ok (seção 6). As migrations rodam
   sozinhas no start.
5. `vercel.json` com o host da API; projeto na Vercel; domínio (seção 8).
6. Criar o desafio e o admin (9.2).
7. Verificações (seção 11) e checklist (seção 14).

### 9.2 Criar o desafio e o administrador (NUNCA rode o seed)

> 🚫 **Nunca rode `pnpm --filter api seed` / `prisma db seed` em produção.** O seed cria
> participantes fictícios (Q9). O banco de produção só recebe dados pelos dois scripts abaixo.

Os scripts estão compilados dentro da imagem em `dist/cli/scripts/`. Em produção eles leem as
variáveis do próprio container (não existe arquivo `.env` na imagem — isso é esperado). Eles só
precisam do `DATABASE_URL`.

**Como abrir um terminal dentro do container no Railway:** instale a CLI
(`npm i -g @railway/cli`), rode `railway login`, `railway link` (escolha o projeto e o serviço
da API) e depois `railway ssh`. Você cai em `/app` dentro do container. (Render: aba **Shell**;
Fly: `fly ssh console`.)

1. **Criar o desafio** (troque os valores reais — Q1 e Q6):

   ```bash
   node dist/cli/scripts/criar-desafio.js \
     --slug desafio-30-everest \
     --nome "Desafio 30 Dias Everest" \
     --dataInicio 2026-11-01 \
     --handle <@-real-do-instagram> \
     --totalVagas 50
   ```

   Opções: `--hashtag DESAFIO30EVEREST` (padrão), `--embaixadorOcupaVaga true` (padrão, Q3),
   `--timezone America/Sao_Paulo` (padrão), `--ativar true` (padrão). Rodar de novo com o mesmo
   `--slug` **atualiza** o desafio (útil para corrigir data ou @).

2. **Criar o admin (Anderson) já como participante embaixador:**

   ```bash
   node dist/cli/scripts/criar-admin.js \
     --nome "Anderson <Sobrenome>" \
     --email <email-do-anderson> \
     --senha '<senha-forte-com-8+-caracteres>' \
     --embaixador
   ```

   Se o e-mail já tiver conta (ele se cadastrou pelo app), o script só promove a ADMIN
   (`--senha` vira opcional e, se informada, troca a senha e encerra as sessões antigas).

Sem terminal no container? Duas alternativas, rodando do seu computador **contra o banco de
produção** (exige a URL **pública** do Postgres — Railway: variável `DATABASE_PUBLIC_URL`):

```bash
# a) com Docker, usando a mesma imagem da produção
docker run --rm -e DATABASE_URL='<url-publica-do-postgres>' everest-api \
  node dist/cli/scripts/criar-desafio.js --slug ... (mesmos argumentos)

# b) com o repositório (Node + pnpm instalados): a variável do terminal tem prioridade sobre o apps/api/.env
DATABASE_URL='<url-publica-do-postgres>' pnpm --filter api criar-desafio --slug ... (mesmos argumentos)
```

Cuidado com a opção b: confira **duas vezes** que a URL é a de produção e nunca rode o `seed`
nesse terminal.

> Senhas digitadas na linha de comando ficam no histórico do terminal. Ao terminar, rode
> `history -c` (bash) ou feche a sessão do `railway ssh`.

### 9.3 Redefinir senha de um participante (X3)

Não existe "esqueci minha senha" no MVP. O participante pede ao embaixador, que roda (mesmo
terminal da 9.2):

```bash
node dist/cli/scripts/redefinir-senha.js --email maria@exemplo.com --senha '<nova-senha-temporaria>'
```

O script troca a senha **e encerra todas as sessões** daquela pessoa (ela precisa entrar de novo
em todos os aparelhos). Envie a senha nova por um canal privado e peça para ela não compartilhar.

---

## 10. Atualizações, migrations e rollback

**Atualizar:** faça push na branch conectada. Railway reconstrói a imagem e só troca o
container quando o novo responde em `/api/health`. A Vercel publica o web sozinha.

**Migrations:** são aplicadas no start (`prisma migrate deploy`) — só as que ainda não rodaram.
Regras de ouro:

- Faça **backup antes** de qualquer deploy que tenha migration nova (seção 12).
- Prefira migrations **aditivas** (criar coluna/tabela). Remover ou renomear coluna em produção
  deve ser feito em duas etapas (deploy que para de usar → deploy que remove).

**Rollback:**

- **Web:** Vercel → _Deployments_ → deploy anterior → **Instant Rollback** (ou _Promote to
  Production_).
- **API:** Railway → _Deployments_ → deploy anterior → **Rollback** (ou _Redeploy_).
- ⚠️ Rollback de código **não desfaz migrations**. Se a versão nova aplicou uma migration que a
  versão antiga não entende, restaure o backup do banco (seção 12) ou corrija "para frente" com
  um novo deploy.

---

## 11. Verificação depois do deploy

### 11.1 Automática

Na raiz do repositório (Node 22+):

```bash
node scripts/verificar-producao.mjs https://desafio.everest.com.br
```

Ele confere: `vercel.json` sem `API_HOST_AQUI`; `/api/health` com `{"db":"ok","redis":"ok"}`
**passando pelo rewrite** da Vercel; `/api/docs` com 404 (Swagger desligado); SPA abrindo em
rotas profundas; headers de segurança/cache; e se existe um desafio ativo.

### 11.2 Manual (faça no celular e no computador)

1. **Health direto na API:** `https://<API_HOST>/api/health` → `{"db":"ok","redis":"ok"}`.
2. **Swagger desligado:** `https://<API_HOST>/api/docs` → 404.
3. **Cookie através do rewrite:** no computador, abra o app → cadastre-se ou faça login → DevTools
   (F12) → _Application_ → _Cookies_ → `https://<domínio-do-app>`. Deve existir
   `everest_sessao` com **HttpOnly ✓, Secure ✓, SameSite Lax**, no domínio do app (não no da
   API). Recarregue a página: você continua logado.
4. **Upload de foto:** em _Hoje_, envie uma foto. Em DevTools → _Network_: um `PUT` para
   `<ACCOUNT_ID>.r2.cloudflarestorage.com` com status 200 e depois `POST .../confirmar` com 200.
   Em alguns segundos a miniatura aparece (o worker processou). Se o `PUT` falhar com erro de
   CORS, revise a seção 5 (origem exata, sem barra).
5. **Android (Chrome):** abra o link → botão "Baixar o app" (ou menu ⋮ → _Instalar app_) → o ícone
   aparece na tela inicial e abre sem barra do navegador. Login continua valendo.
6. **iPhone (Safari):** abra o link no **Safari** → "Baixar o app" mostra o passo a passo →
   Compartilhar → **Adicionar à Tela de Início**. Abra pelo ícone, faça login e envie uma foto.
7. **Vagas:** a tela inicial mostra "X de 50 vagas disponíveis" e o embaixador aparece no ranking
   com o selo.

---

## 12. Backups

- **Railway Postgres:** no serviço do Postgres → aba **Backups** (disponível nos planos pagos) →
  ative backups automáticos diários/semanais. Restaure por ali.
- **Neon/Supabase:** têm restauração para um ponto no tempo (janela depende do plano).
- **Backup manual (recomendado antes de cada migration e no dia da largada).** Use a URL
  **pública** do banco **sem** os parâmetros do Prisma (`?schema=public&connection_limit=...` não
  são aceitos pelo `pg_dump`):

  ```bash
  docker run --rm -v "$PWD:/backup" postgres:16 \
    pg_dump "postgresql://postgres:<senha>@<host-publico>:<porta>/railway" -Fc -f /backup/everest-$(date +%F).dump
  ```

  Restaurar (num banco vazio): `pg_restore --clean --if-exists -d "<url>" everest-AAAA-MM-DD.dump`.
  Guarde os arquivos fora do computador (são dados pessoais: nome e e-mail — LGPD).

- **Fotos (R2):** não há backup automático. As fotos são provas temporárias do desafio; se quiser
  cópia, use `rclone sync` para outro bucket.
- **Redis:** não precisa de backup (fila e cache são recriáveis).

---

## 13. Problemas comuns

| Sintoma                                                      | Causa provável                                                  | O que fazer                                                                                            |
| ------------------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Container reinicia; log "Variáveis de ambiente inválidas"    | variável faltando/errada                                        | O log lista qual. Corrija na aba Variables                                                             |
| `/api/health` → `"db":"erro"`                                | URL do banco errada, pooler em modo transaction, banco dormindo | Seção 3. Use conexão direta/sessão                                                                     |
| `/api/health` → `"redis":"erro"`, `ENOTFOUND`                | rede privada só IPv6 (ambiente antigo)                          | Seção 4.1, item 3                                                                                      |
| Migration falha no start (`P3009`, advisory lock)            | pooler transaction (porta 6543/`pgbouncer=true`)                | Use a conexão direta                                                                                   |
| Login funciona mas a sessão "cai" ao recarregar              | app acessado por um domínio e API por outro (sem rewrite)       | Sempre acesse pelo domínio da Vercel; confira o `vercel.json`                                          |
| Erro 403 em cadastro/inscrição (`PROIBIDO`)                  | `WEB_ORIGIN` diferente do domínio aberto no navegador           | Ajuste `WEB_ORIGIN` (exato, sem barra; vários com vírgula)                                             |
| `PUT` da foto bloqueado por CORS                             | CORS do R2 sem a origem certa                                   | Seção 5                                                                                                |
| Muitos usuários recebendo "muitas requisições" no lançamento | rate limit vendo o IP do proxy em vez do IP do usuário          | Veja "Riscos conhecidos" abaixo                                                                        |
| App instalado não pega a versão nova                         | cache do service worker                                         | Os headers `no-cache` do `vercel.json` resolvem; feche e abra o app — aparece "Nova versão disponível" |

### Riscos conhecidos

- **IP real atrás de dois proxies.** O Express confia em `TRUST_PROXY_HOPS` proxies (padrão 1).
  Em produção o caminho é navegador → Vercel → borda do Railway → API (dois saltos): defina
  **`TRUST_PROXY_HOPS=2`** na API. Se o valor estiver errado, o rate limit por IP (5/min em login e
  cadastro) passa a ver o IP da Vercel e pode bloquear pessoas diferentes ao mesmo tempo no pico de
  inscrições. Teste antes da divulgação: em 2 redes diferentes (ex.: Wi-Fi e 4G), faça 5 tentativas
  de login erradas na primeira; a segunda rede deve continuar conseguindo tentar. Se for bloqueada,
  ajuste `TRUST_PROXY_HOPS` (sem mudar código) e reinicie a API.
- **Uma instância só.** Não aumente réplicas: o rate limit é em memória.

---

## 14. Checklist de produção (antes de divulgar o link)

Infra e configuração:

- [ ] Todas as variáveis da seção 7 preenchidas (API e Vercel); `JWT_SECRET` novo e forte
- [ ] `apps/web/vercel.json` sem `API_HOST_AQUI`
- [ ] `node scripts/verificar-producao.mjs https://<domínio>` passando
- [ ] Bucket R2 privado (sem acesso público) e CORS só com o domínio do app
- [ ] API com 1 réplica e sem "sleep"
- [ ] Backup automático do Postgres ativo + um backup manual feito
- [ ] `criar-desafio` e `criar-admin --embaixador` executados no banco de produção (**sem seed**)
- [ ] `pnpm check:launch` passando (nenhum `[LINK_DO_APP]`, `@[SEU_@]` ou `TODO_DECISAO`)

Critérios de aceite (PROMPT, seção 15):

- [ ] Inscrição funciona até 50 vagas e bloqueia a 51ª tentativa (teste da Fase 4 + checagem manual em produção)
- [ ] Um dia só aparece como concluído com os 5 requisitos
- [ ] O upload aceita exatamente 3 fotos por dia (1 de cada tipo)
- [ ] O Progresso e o Ranking refletem os dias concluídos
- [ ] O botão "Baixar o app" aponta para `VITE_APP_URL` / dispara a instalação
- [ ] O app abre no celular com a logo e os textos finais
- [ ] PWA instalável, publicado na Vercel (Android/Chrome e iPhone/Safari)
- [ ] Login mantém a sessão através do rewrite (cookie conferido — 11.2 item 3)
- [ ] Uma foto sobe para o R2 e a miniatura aparece (11.2 item 4)
- [ ] 🚫 Q1 @ real, Q2 link, Q8 texto de privacidade, Q15 domínio e logo final, todos com Status CONFIRMADO em `docs/DECISOES.md`
- [ ] Desafio de produção criado com `dataInicio` correta; o Anderson é admin e participante embaixador
- [ ] Banco de produção sem nenhum participante fictício
- [ ] Teste piloto com 5 a 10 pessoas feito; regras congeladas antes do início

Depois do piloto, se quiser zerar os participantes de teste antes da largada, faça um backup e
peça ajuda técnica — não apague linhas "na mão" sem backup.
