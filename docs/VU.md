# Simulador de usuários virtuais (VUs)

O simulador cria **usuários virtuais (VUs)** que se inscrevem no desafio de **teste** (`teste-vu`) e,
ao longo do dia, fazem as tarefas pelo **sistema de verdade**: login no Firebase, cookie de sessão da
API pública, check-ins (`PUT /api/desafios/:slug/dias/:n`) e upload das 3 fotos de prova pelo mesmo
fluxo do celular. Serve para testar o app ponta a ponta e para alimentar o painel de indicadores do
admin com dados parecidos com os de gente real.

> **Antes do lançamento real**, rode `limpar --remover-desafio` (seção [Antes do lançamento](#antes-do-lançamento-real)).

- Código: `apps/api/scripts/vu.ts` e `apps/api/scripts/vu/*` (compilados para `dist/cli/scripts/vu.js`
  na imagem da API).
- Serviço: `vu` no `docker-compose.prod.yml`, com `profiles: [vu]` (**desligado por padrão**).

## O que cada VU faz

|           |                                                                                                                                                                                                                                         |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Conta     | `vu-NN@vu.everestt.app.br` (e-mail verificado, sem caixa de entrada), nome "VU NN Nome Sobrenome"                                                                                                                                       |
| Cadastro  | dados fictícios válidos: instagram `vu_NN`, 18–59 anos, WhatsApp `DDD 90000-NNNN`, bairro/cidade de todos os estados                                                                                                                    |
| Pagamento | ~75% avisam o Pix e o "admin" confirma direto no banco; ~15% ficam **INFORMADO** (fila do painel, para você testar); ~10% **PENDENTE** (de vez em quando um deles avisa que pagou)                                                      |
| Persona   | fixa por VU (sorteio estável pelo e-mail): **dedicado** (~90% de chance de cumprir cada requisito no dia), **regular** (~70%), **irregular** (~45%), **desistente** (como regular até um dia sorteado entre 3 e 10; depois para de vez) |

O plano de cada dia é sorteado por VU + dia (todas as rodadas do dia enxergam o mesmo plano). A cada
rodada (15 min), conforme a hora de Brasília, cada VU pago faz 0–2 tarefas pendentes:

| Horário               | Tarefas                                                                               |
| --------------------- | ------------------------------------------------------------------------------------- |
| 0h–5h59 e 23h50–23h59 | nada                                                                                  |
| manhã (6h–11h59)      | água (porções de 250–750 ml), exercício, fotos de água/exercício                      |
| tarde (12h–17h59)     | água, leitura (3–15 páginas por vez), fotos                                           |
| noite (18h–21h59)     | leitura, story, foto de leitura                                                       |
| 22h–23h49 ("corrida") | 2 tarefas por rodada de quem deixou para o fim (água e leitura completam o que falta) |

A foto vem depois da atividade (a de água só depois de beber alguma coisa, etc.). As fotos são JPEGs
de ~35 KB com fundo da cor do requisito e o texto "VU 07 / DIA 1 / ÁGUA / 31/10 14:32" — passam pelo
fluxo real: `POST .../fotos/upload-url` → `PUT` na URL assinada (`arquivos.…`) → `POST .../confirmar`
→ o worker da API converte para webp e marca CONFIRMADA. De vez em quando o VU também abre o
progresso, o ranking ou o feed.

Cada rodada escreve **uma linha** no log, por exemplo:

```text
[14:30 Brasília] teste-vu · dia 2/30 · tarde · 30 VUs (23 pagos) · 8 agiram · 11 tarefas (água 4, exercício 0, leitura 3, story 0, fotos 4) · 3 concluíram hoje · 0 aviso(s) de Pix · 1 desistente(s) parado(s) · 0 login(s) · 27 req · 0 erro(s) · 44s
```

## Pré-requisitos

1. Imagem da API atualizada (o script vem dentro dela): `docker compose -f docker-compose.prod.yml build api`.
2. Desafio de teste **ativo** com slug começando por `teste` (ex.: `teste-vu`) e inscrições abertas.
   O simulador **recusa** qualquer slug que não comece com `teste` (a menos de `--forcar`).
3. No `.env` do servidor já existem as variáveis usadas (as mesmas da API + `VITE_FIREBASE_API_KEY`,
   a chave **pública** do app web, usada para logar os VUs).
4. Pelo menos um usuário ADMIN no banco (ele aparece como "confirmado por" nos pagamentos dos VUs).

## Comandos

Todos aceitam `--desafio <slug>`. O jeito mais simples é usar o serviço `vu` com `run --rm` (ele já tem
todas as variáveis, mesmo com o loop desligado):

```bash
cd ~/projetos/app-tt
DC="docker compose -f docker-compose.prod.yml"

# 1) Cria 30 VUs: conta no Firebase, login pela API, cadastro, inscrição, aviso de Pix, confirmação.
#    Idempotente: rodar de novo não duplica nada (com --quantidade maior, só acrescenta).
#    Leva uns 5 min (a troca de sessão da API aceita ~10 logins/min por IP).
$DC run --rm vu node dist/cli/scripts/vu.js preparar --desafio teste-vu --quantidade 30

# 2) Uma rodada agora (útil para testar antes de ligar o loop).
$DC run --rm vu node dist/cli/scripts/vu.js rodada --desafio teste-vu

# 2b) R23: roteiro das rotas da turma (Hoje, cutucadas, pose, visibilidade, Treinos) com >= 5 VUs pagos.
#     Para teste avulso, use outro desafio de teste e números fora dos VUs do loop:
#     --direto: a API só inscreve no desafio ATIVO (o real); com o de teste inativo, inscreve no banco já pago.
$DC run --rm vu node dist/cli/scripts/criar-desafio.js --slug teste-r23 --nome "Teste R23" --dataInicio AAAA-MM-DD --handle everest --totalVagas 10 --ativar false
$DC run --rm vu node dist/cli/scripts/vu.js preparar --desafio teste-r23 --quantidade 5 --inicio 101 --direto
$DC run --rm vu node dist/cli/scripts/vu.js turma --desafio teste-r23
$DC run --rm vu node dist/cli/scripts/vu.js limpar --desafio teste-r23 --remover-desafio   # não toca nos VUs do loop

# 3) Resumo: personas, pagamentos, check-ins e fotos de hoje, última rodada.
$DC run --rm vu node dist/cli/scripts/vu.js status --desafio teste-vu

# 4) Apaga tudo dos VUs (fotos no storage, dias, inscrições, usuários, contas do Firebase, sessões).
$DC run --rm vu node dist/cli/scripts/vu.js limpar --desafio teste-vu
#    ... e também o desafio de teste (só se não sobrar participante que não seja VU):
$DC run --rm vu node dist/cli/scripts/vu.js limpar --desafio teste-vu --remover-desafio
```

Também dá para rodar no container da API (`exec api`). `status` e `limpar` funcionam direto;
`preparar` e `rodada` precisam da chave pública do Firebase, que o container da API não tem:

```bash
$DC exec api node dist/cli/scripts/vu.js status --desafio teste-vu
$DC exec api node dist/cli/scripts/vu.js limpar --desafio teste-vu
$DC exec -e VU_FIREBASE_API_KEY="$(grep '^VITE_FIREBASE_API_KEY=' .env | cut -d= -f2-)" \
  api node dist/cli/scripts/vu.js preparar --desafio teste-vu --quantidade 30
```

## Ligar e desligar o loop

O serviço `vu` roda `loop --desafio teste-vu --intervalo 15` (uma rodada a cada 15 min, para sempre).

```bash
# Ligar só agora (sem mexer no .env):
$DC --profile vu up -d vu
$DC logs -f vu

# Desligar:
$DC stop vu        # ou: $DC rm -sf vu
```

Para ele subir junto com o resto em todo `up -d` (e após reiniciar o servidor), acrescente o profile no
`.env` do servidor — junto com o do túnel, se você usa:

```bash
COMPOSE_PROFILES=tunnel,vu
```

Para desligar de vez, tire o `vu` de `COMPOSE_PROFILES` e rode `$DC rm -sf vu`.

Duas rodadas nunca acontecem ao mesmo tempo (trava no Redis): um `rodada` manual com o loop ligado
só roda se o loop não estiver no meio de uma.

## Variáveis

| Variável                                                 | Padrão                    | Para quê                                                                                                           |
| -------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `VU_BASE_URL`                                            | `https://everestt.app.br` | endereço público do app (a API é `…/api`). No compose: `https://${DOMINIO_APP}`                                    |
| `VU_FIREBASE_API_KEY`                                    | —                         | chave **pública** do app web (`VITE_FIREBASE_API_KEY`); só `preparar`/`rodada`                                     |
| `VU_MAX_RPM`                                             | `40`                      | teto de requisições por minuto à API (todos os VUs saem do mesmo IP)                                               |
| `DATABASE_URL`, `REDIS_URL`                              | —                         | banco (leitura do estado, confirmação do "admin", limpeza) e Redis (sessões dos VUs, trava, última rodada, caches) |
| `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_BASE64` | —                         | criar/apagar as contas dos VUs e emitir o custom token do login                                                    |
| `S3_*`                                                   | —                         | só o `limpar` (apaga as fotos no MinIO)                                                                            |

## Segurança e limites

- **Só desafios `teste*`** (sem `--forcar`) e **só usuários com e-mail `vu-NN@vu.everestt.app.br`**:
  o `limpar` filtra pelo e-mail em toda consulta e nunca apaga ADMIN. Contas de pessoas reais no
  desafio de teste (ex.: o embaixador) ficam intactas — e por isso impedem o `--remover-desafio`.
- **Ritmo:** no máximo `VU_MAX_RPM` chamadas/min à API, 8 logins/min e 20 pedidos de upload/min (abaixo
  dos limites da API por IP). Em 429/5xx/falha de rede, tenta de novo com espera crescente (2 s, 4 s,
  8 s…, respeitando `Retry-After`); erros de regra (ex.: `DIA_NAO_EDITAVEL`) não são repetidos. Todo
  fetch tem timeout (20 s; 60 s no upload).
- **Login:** `createCustomToken` (firebase-admin) → `accounts:signInWithCustomToken` (REST pública do
  Firebase, a mesma do SDK web) → `POST /api/auth/sessao` → cookie. O cookie fica no Redis
  (`everest-vu:sessao:*`) e é reaproveitado enquanto valer (30 dias); em 401, o VU loga de novo.
- O "admin" só age no `preparar` (confirma ~75% dos pagamentos direto no banco, como o painel faria,
  e limpa os caches de vagas/ranking/feed). Todo o resto passa pela API pública.

## Antes do lançamento real

```bash
$DC stop vu                     # 1) para o loop (e tire "vu" do COMPOSE_PROFILES no .env)
$DC run --rm vu node dist/cli/scripts/vu.js limpar --desafio teste-vu --remover-desafio
$DC run --rm vu node dist/cli/scripts/vu.js status --desafio teste-vu   # deve dizer que o desafio não existe e 0 usuários VU
```

Se o desafio de teste era o ativo, ative o desafio real em seguida (painel do admin ou
`criar-desafio ... --ativar true`). Se o `limpar` disser que sobraram participantes que não são VUs,
remova-os pelo painel e rode de novo.

## Problemas comuns

| Sintoma                                               | Causa provável / o que fazer                                                                                                                                                                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `firebase signInWithCustomToken → 403 … referer`      | a chave do app web tem restrição de referenciador: o simulador manda `Referer: VU_BASE_URL/`; confira se o domínio do app está liberado na chave (Google Cloud → Credenciais)                                                              |
| `POST auth/sessao → 401 … precisa ter um e-mail`      | o idToken veio sem e-mail: confira a conta `vu-NN@…` no console do Firebase (precisa ter e-mail verificado) e rode `preparar` de novo (ele recria/corrige as contas)                                                                       |
| `→ 403` com HTML (`Just a moment…`)                   | a Cloudflare barrou o tráfego automático do servidor: libere o IP do servidor (WAF) ou use `VU_BASE_URL=http://api:3000` (fala com a API pela rede interna; o upload das fotos continua indo para `arquivos.…`, que também precisa passar) |
| `DIA_NAO_EDITAVEL` perto da meia-noite                | normal: a virada do dia fecha o dia anterior (o simulador para às 23h50)                                                                                                                                                                   |
| VUs não fazem nada                                    | `status`: veja se estão CONFIRMADO, se o desafio está EM_ANDAMENTO e a hora (madrugada = parado)                                                                                                                                           |
| `Outra rodada (ou um limpar) ainda está em andamento` | normal com `rodada` manual + loop; se o processo morreu no meio, a trava expira em 20 min                                                                                                                                                  |

## Desenvolvimento

```bash
pnpm --filter api exec jest --rootDir scripts      # testes das partes puras (personas, sorteio, horários, dados, imagem, http)
pnpm --filter api exec tsc --noEmit -p tsconfig.scripts.json
```

Para rodar local contra o emulador do Firebase (`pnpm emu`): `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`,
`VU_BASE_URL=http://localhost:3000` e `pnpm --filter api exec ts-node -T scripts/vu.ts preparar --desafio teste-vu --quantidade 5`.
