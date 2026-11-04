# Deploy no servidor próprio (Contabo)

Tudo roda num servidor só, com Docker Compose (`docker-compose.prod.yml`):

```text
celular ──HTTPS──► Caddy (container "web", portas 80/443)
                    ├─ /            → app (PWA, arquivos do build do Vite)
                    ├─ /api/*       → API (NestJS + worker, container "api")
                    ├─ /__/*        → <projeto>.firebaseapp.com (login com Google)
                    └─ arquivos.…   → MinIO (fotos de prova, URLs assinadas)
API ──► Postgres, Redis, MinIO (rede interna, sem porta publicada)
```

- **HTTPS automático:** o Caddy pede o certificado ao Let's Encrypt sozinho. Precisa dos dois
  domínios (app e arquivos) apontando para o IP do servidor e das portas 80/443 livres.
- **Sem domínio ainda?** Use o sslip.io com o IP: `app.203-0-113-10.sslip.io` e
  `arquivos.203-0-113-10.sslip.io` já resolvem para `203.0.113.10` e aceitam certificado.
- **Servidor que já tem um proxy nas portas 80/443** (nginx, outro Caddy, Traefik): descomente o bloco
  "Modo de rede" do `.env`; o container web passa a ouvir só em `127.0.0.1:8088` (HTTP) e o proxy
  existente encaminha os dois domínios para lá, mantendo o `Host` original (a assinatura das fotos depende dele).

## Requisitos

- Ubuntu 22.04/24.04 (ou Debian 12), 4 GB de RAM ou mais (o build do app usa ~2 GB), 20 GB livres.
- Docker Engine com o plugin `docker compose` (v2).
- Portas 80 e 443 liberadas no firewall (e a do SSH, claro).

## Primeira instalação

```bash
mkdir -p ~/projetos && cd ~/projetos
git clone https://github.com/danewellxp-glitch/appeverestt.git app-tt
cd app-tt
cp deploy/env.producao.example .env
chmod 600 .env
# Preencha o .env (domínios, senhas com `openssl rand -hex 32`, Firebase, Pix).
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps        # todos "healthy"/"running"; minio-init "exited (0)"
docker compose -f docker-compose.prod.yml logs -f api web
```

A API roda as migrations sozinha ao subir. **Não rode o seed em produção** (só tem dados fictícios).

### Conta de serviço do Firebase (segredo)

Envie o JSON do seu computador para o servidor e converta lá, sem colar em chat:

```bash
# no seu computador
scp conta-servico.json usuario@IP:~/projetos/app-tt/
# no servidor
cd ~/projetos/app-tt
echo "FIREBASE_SERVICE_ACCOUNT_BASE64=$(base64 -w0 conta-servico.json)" >> .env   # apague a linha vazia antiga
shred -u conta-servico.json
```

### Desafio e admin

```bash
C="docker compose -f docker-compose.prod.yml exec api"
$C node dist/cli/scripts/criar-desafio.js --slug desafio-30-everest --nome "Desafio 30 Dias Everest" \
   --dataInicio 2026-12-01 --handle <instagram_sem_arroba> --totalVagas 50
$C node dist/cli/scripts/criar-admin.js --nome "Anderson Hudacz" --email <gmail_do_embaixador> --embaixador
```

O embaixador entra no app com **"Continuar com Google" usando esse mesmo e-mail**.

### Firebase e Google (uma vez, com o domínio pronto)

1. Firebase → Authentication → Settings → **Domínios autorizados**: adicionar `DOMINIO_APP`.
2. console.cloud.google.com → APIs e serviços → Credenciais → "Web client (auto created by Google Service)"
   → **URIs de redirecionamento autorizados**: `https://<DOMINIO_APP>/__/auth/handler`.

### Verificação

```bash
docker run --rm -v "$PWD":/repo -w /repo node:24-slim \
  node scripts/verificar-producao.mjs https://<DOMINIO_APP> --contabo
docker run --rm -v "$PWD":/repo -w /repo node:24-slim \
  node scripts/check-placeholders.mjs --strict --contabo
```

Depois, no celular: criar conta, garantir a vaga, **ler o QR do Pix no app do banco** (confere nome,
chave e R$ 50,00, sem pagar), "Já fiz o pagamento", confirmar no painel do embaixador, fazer um
check-in com as 3 fotos e instalar o app (Android e iPhone).

## Atualizar (nova versão do código)

```bash
cd ~/projetos/app-tt
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker image prune -f
```

A API aplica as migrations sozinha ao subir (`prisma migrate deploy` antes do `node dist/main`).

Uma vez, depois da atualização que trouxe o sinal de foto parecida (R20, X20), calcule o hash das fotos
já enviadas. Pode repetir: só mexe em foto sem hash.

```bash
docker compose -f docker-compose.prod.yml exec api node dist/cli/scripts/hash-fotos.js
```

## Backup

```bash
sh deploy/backup.sh                      # banco (pg_dump) + fotos, em deploy/backups/ (14 dias)
crontab -e                               # adicione:
0 3 * * * cd $HOME/projetos/app-tt && sh deploy/backup.sh >> deploy/backups/backup.log 2>&1
```

Copie `deploy/backups/` para fora do servidor de vez em quando (ex.: `scp` para o seu computador).

## Fotos no Cloudflare R2 em vez do MinIO (opcional)

No `docker-compose.prod.yml`, no serviço `api`, troque `S3_ENDPOINT` pelo endpoint do R2, apague
`S3_PUBLIC_ENDPOINT`, use as chaves do R2 em `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` e
`S3_FORCE_PATH_STYLE: 'false'`; configure o CORS do bucket com o domínio do app (docs/DEPLOY.md §5).
O subdomínio de arquivos deixa de ser necessário.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| `web` reinicia e o log fala em "challenge" / "certificate" | DNS dos dois domínios ainda não aponta para o IP, ou porta 80 fechada no firewall |
| `api` não sobe: "PIX_COPIA_E_COLA" | O código Pix está incompleto ou sem aspas no `.env` |
| `api` não sobe: "FIREBASE_SERVICE_ACCOUNT_BASE64" | Faltou a conta de serviço (seção acima) |
| Foto não envia (erro de CORS ou 403) | `DOMINIO_APP`/`DOMINIO_ARQUIVOS` errados, ou o proxy existente não repassa o `Host` |
| Login com Google fecha sem entrar | Domínio não autorizado no Firebase ou URI de redirecionamento faltando no Google Cloud |
