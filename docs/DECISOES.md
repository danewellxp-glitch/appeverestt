# Decisões do produto

Status: **ASSUMIDO** = default do PROMPT (seção 4), ainda não confirmado pelo Anderson. **CONFIRMADO** = resposta real.
🚫 = bloqueia o lançamento até virar CONFIRMADO.

| Q | Questão | Default assumido | Onde configurar | Status |
|---|---|---|---|---|
| Q1 🚫 | @ do Instagram | Sem default em produção. No seed de dev, `everest_dev` | `Desafio.instagramHandle` (banco) | ASSUMIDO |
| Q2 🚫 | Link de publicação | — | env `VITE_APP_URL` | ASSUMIDO |
| Q3 | As 50 vagas incluem o embaixador? | Sim | `Desafio.embaixadorOcupaVaga` (default `true`) | ASSUMIDO |
| Q4 | Critério de "melhor evolução" | Mais dias concluídos e não invalidados; prêmio para o 1º do ranking no fim | `ordenarRanking` (shared) | ASSUMIDO |
| Q5 | Desempate | 1) maior melhor sequência → 2) maior sequência atual → 3) inscrição mais antiga | `ordenarRanking` (shared) | ASSUMIDO |
| Q6 | Datas | Início em `Desafio.dataInicio`; fim = início + 29 dias | banco | ASSUMIDO |
| Q7 | Dados coletados | Nome, e-mail e senha. Sem telefone | — | ASSUMIDO |
| Q8 🚫 | Política de privacidade | Página `/privacidade` com `TODO_DECISAO(Q8)` + checkbox obrigatório no cadastro | `apps/web/src/content/privacidade.ts` | ASSUMIDO |
| Q9 | Participantes de exemplo | Só no seed de dev. Nunca em produção | — | ASSUMIDO |
| Q10 | Modelo comercial | Gratuito | — | ASSUMIDO |
| Q11 | Multi-desafio | Modelo de dados suporta; UI usa o único desafio `ativo` | — | ASSUMIDO |
| Q12 | Login | E-mail + senha (argon2), JWT em cookie httpOnly | — | ASSUMIDO |
| Q13 | Fuso horário | `America/Sao_Paulo` | `Desafio.timezone` | ASSUMIDO |
| Q14 | Notificações | Fora do MVP | — | ASSUMIDO |
| Q15 🚫 | Domínio | — | env | ASSUMIDO |
| X1 | Editar dias anteriores? | Não. Só o dia atual é editável | env `PERMITIR_EDITAR_DIAS_ANTERIORES=false` | ASSUMIDO |
| X2 | Até quando dá para se inscrever? | Enquanto `inscricoesAbertas = true` e o desafio não terminou | banco + endpoint admin | ASSUMIDO |
| X3 | Recuperação de senha | Fora do MVP; script `redefinir-senha` | script na API | ASSUMIDO |
| X4 | Sair do desafio libera a vaga? | Não; vaga permanente | — | ASSUMIDO |
| LOGO 🚫 | Logo final | Placeholder até receber `apps/web/public/logo.png` | `apps/web/public/logo.png` | ASSUMIDO |

## Decisões técnicas tomadas durante a construção

| Data | Fase | Decisão | Motivo |
|---|---|---|---|
| 2026-10-27 | 0 | pnpm instalado via `npm i -g pnpm@10` em vez de `corepack enable` | `corepack enable` falhou com EPERM (sem permissão de escrita em `C:\Program Files\nodejs`). `packageManager` fixado em `pnpm@10.34.9` |
| 2026-10-27 | 0 | TypeScript fixado em **5.9.3** (não 7.x/6.x) | TS 7.0 (port nativo) não é suportado por typescript-eslint, tsup (dts) e Nest; 6.0 deprecia opções usadas pelos templates. 5.9 é a versão estável com suporte amplo |
| 2026-10-27 | 0 | MinIO via imagens `bitnamilegacy/minio:2025.5.24` e `bitnamilegacy/minio-client:2025.5.21` (em vez de `minio/minio` e `minio/mc`) | A MinIO removeu as imagens oficiais do Docker Hub e do Quay (pull negado). As builds Bitnami congeladas funcionam como S3 local; uso só em desenvolvimento (produção usa R2) |
| 2026-10-27 | 0 | `name: everest-desafio` fixo no docker-compose | A pasta do projeto tem espaços ("desafio 30 d"); nome explícito evita nomes de projeto derivados estranhos |
| 2026-10-27 | — | `docs/SDD.md` não foi fornecido | Construção segue o `PROMPT_CURSOR.md` (que prevalece). Textos que dependem do SDD (ex.: tabela 5.1 em `/regras`) são derivados das regras do PROMPT (seção 8) |
| 2026-10-27 | 2 | **NestJS 11** (não 12) | Nest 12 virou ESM-only (`"type": "module"`); o PROMPT pede API em CommonJS e Jest/ts-jest com ESM é frágil. Nest 11.x segue mantido |
| 2026-10-27 | 2 | **Prisma 6.19** (não 7) | Prisma 7 exige driver adapter + `prisma.config.ts` + novo gerador; 6.19 é estável, CJS e sem dependências extras |
| 2026-10-27 | 2 | **BullMQ 5 + ioredis 5** (não 6) | Versões 6 são recentes demais; 5.x é a linha estável compatível com `@nestjs/bullmq` 11 |
| 2026-10-27 | 2 | Projeto Nest escrito à mão (sem `nest new`) | Mesmo resultado sem arquivos de exemplo/ESLint/Prettier duplicados no subprojeto |
| 2026-10-27 | 2 | `ts-node` (do template padrão do Nest) roda seed e scripts | Evita dependência extra (tsx) |
| 2026-10-27 | 2 | `WEB_ORIGIN` aceita várias origens separadas por vírgula | Dev precisa de `localhost:5173` (dev) e `:4173` (preview) |
| 2026-10-27 | 3 | Rate limit em memória (storage padrão do `@nestjs/throttler`); `THROTTLE_ATIVO=false` só nos testes | Um único container no MVP; storage Redis exigiria dependência extra |
| 2026-10-27 | 3 | Checagem de `Origin`: bloqueia se presente e fora da lista; ausente passa | Navegadores sempre enviam `Origin` em mutações; clientes sem navegador não são vetor de CSRF |
| 2026-10-27 | 5 | Situação `INVALIDADO` tem prioridade sobre `CONCLUIDO` no grid | Dia invalidado nunca conta |
| 2026-10-27 | 6 | Foto em status `ENVIADA` já conta para conclusão; `REJEITADA` deixa de contar | Conforme seção 8 (`fotosValidas` = ENVIADA ou CONFIRMADA); o worker recalcula o dia ao rejeitar |
| 2026-10-27 | 6 | Pedir nova `upload-url` para um tipo já enviado apaga a foto anterior na hora | Restrição única (dia, tipo); o front só pede a URL quando já tem o arquivo comprimido |
| 2026-10-27 | 6 | Versões processadas: `{tipo}-{id}.full.webp` e `.thumb.webp` (mesma pasta do original) | Evita colisão quando o original já é .webp |
| 2026-10-27 | 6 | Presign de PUT assina o header `content-type` (`signableHeaders`) e o cliente S3 usa checksums `WHEN_REQUIRED` | Sem isso o storage aceita outro Content-Type; checksums automáticos do SDK quebram PUT direto do navegador e o R2 |
| 2026-10-27 | 8 | Endpoint extra `GET /api/admin/desafios/:slug/participantes/:id` (progresso do participante) | A tela admin precisa do grid do participante; não havia rota para isso no contrato |
