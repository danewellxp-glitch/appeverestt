# MEGA PROMPT — Everest Desafio (para o Cursor)

> **Para o humano: leia esta parte antes. O agente começa na seção "INSTRUÇÕES PARA O AGENTE".**

## Como usar

1. Instale **Node LTS**, **pnpm** (`corepack enable`), **Docker Desktop** e **Git**.
2. Crie uma pasta vazia `everest-desafio` e abra no Cursor.
3. Crie a pasta `docs/` e coloque dois arquivos nela:
   - `docs/SDD.md`: o SDD do projeto.
   - `docs/PROMPT_CURSOR.md`: este arquivo.
4. Coloque a logo em `apps/web/public/logo.png` depois da Fase 0, ou antes da Fase 9. Use PNG quadrado, com fundo transparente e pelo menos 1024 px.
5. Use o **modo Agent** com o modelo mais forte disponível no Cursor.
6. **Primeiro chat:**
   > Leia @docs/PROMPT_CURSOR.md e @docs/SDD.md por inteiro. Execute SOMENTE a FASE 0. Ao terminar, pare e me entregue o relatório de fase.
7. **Em cada fase seguinte, abra um chat NOVO** para ter contexto limpo, que é o que mais evita alucinação:
   > Leia @docs/PROMPT_CURSOR.md, @docs/SDD.md, @docs/PROGRESSO.md e @docs/DECISOES.md. Execute SOMENTE a FASE N. Ao terminar, pare e me entregue o relatório de fase.
8. Antes de pedir a próxima fase, **rode você mesmo** os comandos da "Definição de pronto". Se algo falhar, cole o erro no mesmo chat e peça a correção. Não avance com uma fase quebrada.
9. Faça um commit ao fim de cada fase: `git add -A && git commit -m "fase N: <resumo>"`. Se o agente bagunçar, `git reset --hard` volta ao último commit.

---

# INSTRUÇÕES PARA O AGENTE

## 1. Papel e contexto

Você é um engenheiro full-stack sênior. Sua tarefa é construir o **Desafio 30 Dias Everest** conforme `@docs/SDD.md`. Este arquivo complementa o SDD e, quando houver conflito, **este arquivo prevalece** (os ajustes estão na seção 3).

O produto é um SaaS mobile-first que funciona como app no navegador (PWA). Os participantes se inscrevem em um desafio com 50 vagas e fazem check-in diário de 5 requisitos, com 3 fotos de prova. O app tem ranking e uma tela de conferência manual para o embaixador.

## 2. Regras de trabalho (obrigatórias)

1. **Faça uma fase por vez.** Execute somente a fase pedida e, ao terminar, PARE. Nunca comece a próxima fase por conta própria.
2. **Leia antes de codar.** No início de cada fase, leia `docs/PROGRESSO.md` e `docs/DECISOES.md`, se existirem. Depois liste em 5 a 15 bullets os arquivos que vai criar ou alterar, e só então comece.
3. **Rode os comandos de verdade.** Não diga que algo funciona sem ter rodado o build, o teste ou o comando. Se não conseguir rodar, diga isso explicitamente no relatório.
4. **Escreva código completo.** É proibido usar `// ... resto do código`, `// implementar depois`, funções vazias ou mocks deixados em código de produção.
5. **Não invente decisões de produto.** Use os defaults da seção 4. Se faltar alguma decisão, crie uma configuração com um marcador `TODO_DECISAO(Qx)`, registre em `docs/DECISOES.md` e siga em frente.
6. **Use só as dependências da seção 5.** Para adicionar outra, justifique no relatório. Instale as versões estáveis atuais e siga a documentação **da versão instalada**. Se a API de uma lib mudou em relação ao que você lembra, confira o `node_modules`/README antes de usar.
7. **Use TypeScript strict.** Sem `any`: use `unknown` e valide com zod.
8. **Uma única fonte da verdade.** As regras de negócio ficam em `packages/shared` e são aplicadas no **servidor**. O front pode mostrar uma prévia, mas nunca decide o que é persistido.
9. **Não toque em arquivos fora do escopo da fase.** Não refatore o que já funciona sem que isso tenha sido pedido.
10. **Regra das 3 tentativas.** Se o mesmo erro persistir depois de 3 tentativas de correção, pare. Descreva o erro, suas hipóteses e o que já tentou.
11. **Atualize `docs/PROGRESSO.md`** ao fim da fase. Marque `[x]` somente o que foi **verificado**.
12. **Idioma:** a UI fica em pt-BR. As entidades de domínio usam os nomes do SDD (`Participante`, `DiaDesafio`, `vagaNumero`...). O código técnico genérico pode ficar em inglês.
13. **Segredos** nunca entram no código nem nos commits. Use só `.env` (que fica no gitignore) e `.env.example`.
14. **Nunca coloque dados fictícios no banco de produção.** O seed é só para desenvolvimento.

## 3. Ajustes ao SDD (prevalecem sobre ele)

| Ponto do SDD | Ajuste | Motivo |
|---|---|---|
| A estrutura 11.1 usa `.jsx` | **Tudo em TypeScript.** Vale a estrutura da seção 6 deste arquivo | A stack (seção 11) define TypeScript |
| Repositório único vs. monorepo | **Monorepo pnpm**: `apps/web`, `apps/api`, `packages/shared` | Permite compartilhar regras e tipos entre front e back |
| Roadmap: front publicado antes do backend | Ordem: **shared → backend → frontend → PWA → deploy**. Nenhuma versão "só front" é publicada | O SDD (seção 15) admite que vagas locais estouram e que fotos em base64 se perdem |
| `fotos: string[]` | Entidade **`FotoProva`** com `tipo` (AGUA, EXERCICIO, LEITURA), única por dia+tipo | Garante exatamente 1 foto de cada tipo, ou seja, 3 no total |
| Só `Participante` | Entidades **`Usuario`**, **`Desafio`** e **`Participante`** (a inscrição) | Prepara o multi-desafio (Q11) sem custo. No MVP há 1 desafio ativo |
| "Conferência manual pelo embaixador" | **Tela admin mínima** para ver as fotos e invalidar um dia | Sem ela, a mitigação do risco não existe |
| Vermelho `#dc2626` sobre preto | Contraste de ~4,3:1, que **reprova AA para texto pequeno**. Use `#dc2626` só como **fundo de botão** com texto branco (~4,8:1) e em **títulos grandes** (≥24px, ou ≥18,66px em negrito). Texto vermelho pequeno usa **`#ef4444`** (~5,6:1) | Requisito não funcional de WCAG AA |
| Fotos com metadados | **Remova o EXIF** (inclusive GPS) ao processar | Privacidade: uma foto de celular carrega a localização da pessoa |

## 4. Decisões assumidas (defaults para as questões em aberto do SDD, seção 16)

Implemente tudo de forma **configurável**. Os itens marcados como 🚫 **bloqueiam o lançamento** e precisam de uma resposta real do Anderson.

| Q | Questão | Default assumido | Onde configurar |
|---|---|---|---|
| Q1 | @ do Instagram | Sem default em produção. No seed de dev, `everest_dev` 🚫 | `Desafio.instagramHandle` (banco) |
| Q2 | Link de publicação | 🚫 | env `VITE_APP_URL` |
| Q3 | As 50 vagas incluem o embaixador? | **Sim** (é o comportamento atual) | `Desafio.embaixadorOcupaVaga` (default `true`) |
| Q4 | Critério de "melhor evolução" | **Mais dias concluídos e não invalidados.** O prêmio vai para o 1º do ranking no fim | função `ordenarRanking` em shared |
| Q5 | Desempate | 1) maior melhor sequência → 2) maior sequência atual → 3) inscrição mais antiga | função `ordenarRanking` |
| Q6 | Datas | Início em `Desafio.dataInicio`; fim = início + 29 dias | banco |
| Q7 | Dados coletados | Nome, e-mail e senha. Sem telefone | — |
| Q8 | Política de privacidade | Página `/privacidade` com o marcador `TODO_DECISAO(Q8)` e checkbox de aceite obrigatório no cadastro 🚫 | `apps/web/src/content/privacidade.ts` |
| Q9 | Participantes de exemplo | Só existem no seed de dev. Nunca em produção | — |
| Q10 | Modelo comercial | Gratuito, sem pagamento | — |
| Q11 | Multi-desafio | O modelo de dados suporta; a UI usa o único desafio `ativo` | — |
| Q12 | Login | **E-mail + senha** (argon2), sessão JWT em cookie httpOnly | — |
| Q13 | Fuso horário | `America/Sao_Paulo` para todos | `Desafio.timezone` |
| Q14 | Notificações | Fora do MVP | — |
| Q15 | Domínio | 🚫 | env |
| X1 | Editar dias anteriores? | **Não.** Só o dia atual é editável; dias passados ficam em leitura e dias futuros ficam bloqueados | env `PERMITIR_EDITAR_DIAS_ANTERIORES=false` |
| X2 | Até quando dá para se inscrever? | Enquanto `Desafio.inscricoesAbertas = true` e o desafio não terminou. O admin pode fechar | banco + endpoint admin |
| X3 | Recuperação de senha | Fora do MVP. O embaixador redefine a senha via script `redefinir-senha` | script na API |
| X4 | Sair do desafio libera a vaga? | **Não** no MVP. Não existe saída; a vaga é permanente | — |

## 5. Stack e dependências permitidas

**Raiz:** pnpm workspaces, TypeScript, ESLint (flat config), Prettier.

**packages/shared:** `zod`, `tsup` (build com formatos cjs + esm + dts) e `vitest`.
> Atenção: a API (NestJS) roda em CommonJS e o web em ESM. Por isso o `package.json` do shared precisa de `exports` com `import` → `dist/index.js`, `require` → `dist/index.cjs` e `types` → `dist/index.d.ts`.

**apps/api:**
- **Base:** NestJS, `@nestjs/config`, `@nestjs/swagger`, `@nestjs/throttler`, `@nestjs/jwt`.
- **Dados:** Prisma (`prisma` + `@prisma/client`).
- **Segurança:** `argon2`, `cookie-parser`, `helmet`.
- **Filas e cache:** `@nestjs/bullmq`, `bullmq`, `ioredis`.
- **Arquivos:** `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `sharp`.
- **Validação:** `zod` (via `@everest/shared`).
- **Testes:** Jest (o padrão do Nest) + `supertest`.
- O ZodValidationPipe deve ser **escrito à mão** (umas 20 linhas). Não use lib para isso.

**apps/web:**
- **Base:** React, Vite, TypeScript, Tailwind CSS.
  > Se for o Tailwind v4, use o plugin `@tailwindcss/vite` e defina os tokens com `@theme` no CSS. Não crie `tailwind.config.js` sem necessidade.
- **Rotas e dados:** `react-router`, `@tanstack/react-query`, `zod`.
- **PWA:** `vite-plugin-pwa` e `@vite-pwa/assets-generator`.
- **Fotos:** `browser-image-compression`.
- **Ícones:** `lucide-react`.
- **Testes:** `vitest`, `@testing-library/react`, `@playwright/test` e `@axe-core/playwright` (os dois últimos só na Fase 12).

**Infra local (docker-compose):** `postgres:16`, `redis:7` e `minio` (equivalente ao S3/R2 em desenvolvimento).

## 6. Estrutura do repositório

```text
everest-desafio/
├── .cursor/rules/everest.mdc
├── docs/
│   ├── SDD.md
│   ├── PROMPT_CURSOR.md
│   ├── PROGRESSO.md
│   └── DECISOES.md
├── docker-compose.yml
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── scripts/check-placeholders.mjs
├── packages/shared/
│   └── src/
│       ├── index.ts
│       ├── constantes.ts
│       ├── schemas.ts
│       ├── regras/
│       │   ├── conclusao.ts
│       │   ├── diaAtual.ts
│       │   ├── sequencias.ts
│       │   ├── evolucao.ts
│       │   └── ranking.ts
│       └── __tests__/
├── apps/api/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── scripts/
│   │   ├── criar-desafio.ts
│   │   ├── criar-admin.ts
│   │   └── redefinir-senha.ts
│   ├── Dockerfile
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── config/
│       ├── common/          # filtros, pipes, guards, decorators
│       ├── prisma/
│       ├── redis/
│       ├── storage/
│       └── modules/
│           ├── auth/
│           ├── desafios/
│           ├── inscricoes/
│           ├── dias/
│           ├── fotos/
│           ├── ranking/
│           ├── admin/
│           └── health/
└── apps/web/
    ├── public/
    │   └── logo.png
    ├── vercel.json
    └── src/
        ├── main.tsx
        ├── app/            # router, providers
        ├── pages/          # Entrada, Hoje, Progresso, Ranking, Regras, Login, Cadastro, Privacidade, Admin*
        ├── features/       # auth, desafio, checkin, fotos, ranking, pwa
        ├── components/
        │   ├── ui/
        │   └── layout/     # AppShell, BottomNav, Watermark
        ├── lib/            # api.ts, queryClient.ts, erros.ts
        ├── content/        # textos (regras, privacidade)
        └── styles/index.css
```

## 7. Modelo de dados (Prisma)

Ajuste os blocos `generator` e `datasource` conforme a versão do Prisma instalada. Os models são estes:

```prisma
enum Papel      { USUARIO ADMIN }
enum TipoFoto   { AGUA EXERCICIO LEITURA }
enum StatusFoto { PENDENTE ENVIADA CONFIRMADA REJEITADA }

model Usuario {
  id              String         @id @default(cuid())
  nome            String
  email           String         @unique   // sempre salvo em lowercase + trim
  senhaHash       String
  papel           Papel          @default(USUARIO)
  tokenVersao     Int            @default(0) // incrementar invalida todas as sessões
  aceitouTermosEm DateTime
  criadoEm        DateTime       @default(now())
  participacoes   Participante[]
}

model Desafio {
  id                   String         @id @default(cuid())
  slug                 String         @unique
  nome                 String
  dataInicio           DateTime       @db.Date
  totalDias            Int            @default(30)
  totalVagas           Int            @default(50)
  embaixadorOcupaVaga  Boolean        @default(true)
  inscricoesAbertas    Boolean        @default(true)
  timezone             String         @default("America/Sao_Paulo")
  instagramHandle      String         // sem "@"
  hashtag              String         @default("DESAFIO30EVEREST") // sem "#"
  ativo                Boolean        @default(false)
  criadoEm             DateTime       @default(now())
  participantes        Participante[]
}

model Participante {
  id            String       @id @default(cuid())
  desafioId     String
  usuarioId     String
  vagaNumero    Int?         // null somente para embaixador quando embaixadorOcupaVaga = false
  ehEmbaixador  Boolean      @default(false)
  dataInscricao DateTime     @default(now())
  desafio       Desafio      @relation(fields: [desafioId], references: [id])
  usuario       Usuario      @relation(fields: [usuarioId], references: [id])
  dias          DiaDesafio[]
  @@unique([desafioId, usuarioId])
  @@unique([desafioId, vagaNumero])
}

model DiaDesafio {
  id                String       @id @default(cuid())
  participanteId    String
  numeroDia         Int
  aguaMl            Int          @default(0)
  exercicio         Boolean      @default(false)
  paginasLidas      Int          @default(0)
  storyPostado      Boolean      @default(false)
  concluido         Boolean      @default(false) // DERIVADO: sempre recalculado no servidor
  invalidado        Boolean      @default(false)
  motivoInvalidacao String?
  invalidadoPorId   String?
  invalidadoEm      DateTime?
  atualizadoEm      DateTime     @updatedAt
  participante      Participante @relation(fields: [participanteId], references: [id])
  fotos             FotoProva[]
  @@unique([participanteId, numeroDia])
  @@index([participanteId, concluido])
}

model FotoProva {
  id           String     @id @default(cuid())
  diaId        String
  tipo         TipoFoto
  storageKey   String
  thumbKey     String?
  mimeType     String
  tamanhoBytes Int
  status       StatusFoto @default(PENDENTE)
  criadoEm     DateTime   @default(now())
  dia          DiaDesafio @relation(fields: [diaId], references: [id], onDelete: Cascade)
  @@unique([diaId, tipo])
}
```

Crie uma migration extra com `prisma migrate dev --create-only --name checks` e adicione as CHECK constraints à mão:

```sql
ALTER TABLE "Participante" ADD CONSTRAINT "vaga_numero_positiva" CHECK ("vagaNumero" IS NULL OR "vagaNumero" >= 1);
ALTER TABLE "DiaDesafio"   ADD CONSTRAINT "numero_dia_valido"    CHECK ("numeroDia" BETWEEN 1 AND 365);
ALTER TABLE "DiaDesafio"   ADD CONSTRAINT "agua_valida"          CHECK ("aguaMl" BETWEEN 0 AND 20000);
ALTER TABLE "DiaDesafio"   ADD CONSTRAINT "paginas_validas"      CHECK ("paginasLidas" BETWEEN 0 AND 2000);
ALTER TABLE "Desafio"      ADD CONSTRAINT "total_vagas_valido"   CHECK ("totalVagas" BETWEEN 1 AND 10000);
CREATE UNIQUE INDEX "um_desafio_ativo" ON "Desafio" ("ativo") WHERE "ativo" = true;
```

> Observação: o `@db.Date` volta do Prisma como um `Date` à meia-noite UTC. Para converter em `'YYYY-MM-DD'`, use `data.toISOString().slice(0, 10)`. **Nunca** use `toLocaleDateString` nem `getDate()` nesse campo.

## 8. Regras de negócio (`packages/shared`), com testes obrigatórios

```ts
// constantes.ts
export const METAS = { aguaMl: 3000, paginas: 10, fotos: 3 } as const;
export const TIPOS_FOTO = ['AGUA', 'EXERCICIO', 'LEITURA'] as const;
export type TipoFoto = (typeof TIPOS_FOTO)[number];
export type Requisito = 'AGUA' | 'EXERCICIO' | 'LEITURA' | 'FOTOS' | 'STORY';

// conclusao.ts
export interface RegistroDia {
  aguaMl: number;
  exercicio: boolean;
  paginasLidas: number;
  fotosValidas: TipoFoto[];   // tipos com status ENVIADA ou CONFIRMADA
  storyPostado: boolean;
  invalidado?: boolean;
}
export function requisitosPendentes(r: RegistroDia): Requisito[];
export function calcularConcluido(r: RegistroDia): boolean; // invalidado => false; fotos = 3 tipos DISTINTOS

// diaAtual.ts
export type StatusDesafio = 'NAO_INICIADO' | 'EM_ANDAMENTO' | 'ENCERRADO';
export function hojeNoFuso(agora: Date, timezone: string): string; // 'YYYY-MM-DD'
export function calcularDiaAtual(
  dataInicio: string, agora: Date, timezone: string, totalDias = 30,
): { status: StatusDesafio; numeroDia: number | null; diasParaInicio: number };

// sequencias.ts
export function calcularMelhorSequencia(concluidos: boolean[]): number;
export function calcularSequenciaAtual(concluidos: boolean[], diaAtual: number): number;
// Se o dia atual ainda NÃO foi concluído, conte a partir de ontem: a sequência não quebra antes do dia acabar.

// evolucao.ts
export function calcularEvolucao(diasConcluidos: number, totalDias = 30): number; // inteiro 0–100 (Math.round)

// ranking.ts
export interface ItemRanking {
  participanteId: string; nomeExibicao: string; ehEmbaixador: boolean;
  diasConcluidos: number; melhorSequencia: number; sequenciaAtual: number; dataInscricao: string;
}
export function ordenarRanking(itens: ItemRanking[]): (ItemRanking & { posicao: number })[];
export function nomeExibicao(nomeCompleto: string): string; // "Maria Souza Lima" -> "Maria L."
```

**Implementação de `hojeNoFuso`:** use `new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora)`, que devolve `YYYY-MM-DD`. Calcule a diferença de dias com `Date.UTC` sobre as duas strings. Isso dispensa lib de datas.

**`schemas.ts`:** schemas zod para os bodies da API, reutilizados no front:
- `cadastroSchema`: nome com 2 a 80 caracteres, e-mail, senha com 8 a 72 caracteres e `aceitouTermos: z.literal(true)`.
- `loginSchema`.
- `checkinSchema`: `aguaMl` int 0–20000, `exercicio` bool, `paginasLidas` int 0–2000, `storyPostado` bool.
- `uploadUrlSchema`: `tipo`, `mimeType` (image/jpeg, image/png ou image/webp) e `tamanhoBytes` (no máximo 5 MB).

**Casos de teste mínimos:**
- [ ] 2999 ml → não conclui; 3000 ml → conclui (com o resto cumprido)
- [ ] 9 páginas → não conclui; 10 → conclui
- [ ] 2 fotos → não conclui; `['AGUA','AGUA','LEITURA']` → não conclui (tipos repetidos)
- [ ] `invalidado: true` → não conclui, mesmo com tudo cumprido
- [ ] `requisitosPendentes` retorna exatamente o que falta
- [ ] `hojeNoFuso`: `2026-11-02T02:30:00Z` em São Paulo → `2026-11-01`
- [ ] `calcularDiaAtual`: antes do início → `NAO_INICIADO` com `diasParaInicio` correto; no dia de início → dia 1; no dia início+29 → dia 30; no dia início+30 → `ENCERRADO`
- [ ] Melhor sequência: `[T,T,F,T,T,T]` → 3; `[]` → 0; tudo F → 0
- [ ] Sequência atual: dia atual não concluído com os 2 anteriores concluídos → 2
- [ ] `ordenarRanking` aplica os 3 critérios de desempate da Q5, nessa ordem
- [ ] `nomeExibicao`: "Ana" → "Ana"; "  maria  souza " → "Maria S."

## 9. Contrato da API

- **Prefixo e documentação:** prefixo `/api`. O Swagger fica em `/api/docs`, só quando `NODE_ENV !== 'production'`.
- **Erros:** sempre no formato `{ "codigo": "VAGAS_ESGOTADAS", "mensagem": "texto pt-BR" }`.
- **Códigos de erro:** `VALIDACAO`, `NAO_AUTENTICADO`, `PROIBIDO`, `NAO_ENCONTRADO`, `EMAIL_EM_USO`, `CREDENCIAIS_INVALIDAS`, `VAGAS_ESGOTADAS`, `INSCRICOES_FECHADAS`, `NAO_INSCRITO`, `DESAFIO_NAO_INICIADO`, `DESAFIO_ENCERRADO`, `DIA_NAO_EDITAVEL`, `FOTO_INVALIDA`, `FOTO_GRANDE_DEMAIS`, `MUITAS_REQUISICOES`.

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/health` | — | `{ db: 'ok', redis: 'ok' }` |
| POST | `/api/auth/cadastro` | — | Cria o usuário e já abre sessão (cookie) |
| POST | `/api/auth/login` | — | Erro genérico `CREDENCIAIS_INVALIDAS`, sem revelar se o e-mail existe |
| POST | `/api/auth/logout` | sim | Limpa o cookie |
| GET | `/api/auth/me` | sim | Usuário + participação no desafio ativo (ou `null`) |
| GET | `/api/desafios/atual` | — | Público: nome, slug, datas, status, `diaAtual`, `totalVagas`, `vagasDisponiveis`, `inscricoesAbertas`, `instagramHandle`, `hashtag` |
| POST | `/api/desafios/:slug/inscricao` | sim | Inscrição com trava transacional. **Idempotente**: se já inscrito, retorna 200 com a inscrição existente |
| GET | `/api/desafios/:slug/meu-progresso` | inscrito | 30 dias (status de cada um), `diasConcluidos`, `evolucao`, `melhorSequencia`, `sequenciaAtual`, `diaAtual` |
| GET | `/api/desafios/:slug/dias/:n` | inscrito | Registro do dia + fotos (thumb e URL assinada) + `editavel` + `requisitosPendentes` |
| PUT | `/api/desafios/:slug/dias/:n` | inscrito | Upsert do check-in; recalcula `concluido` |
| POST | `/api/desafios/:slug/dias/:n/fotos/upload-url` | inscrito | Body `{tipo, mimeType, tamanhoBytes}` → `{ fotoId, uploadUrl, headers }`. Se já houver foto desse tipo, ela é substituída |
| POST | `/api/desafios/:slug/dias/:n/fotos/:fotoId/confirmar` | inscrito | `HeadObject` confere tamanho e tipo → `ENVIADA` → enfileira o processamento → recalcula o dia |
| DELETE | `/api/desafios/:slug/dias/:n/fotos/:tipo` | inscrito | Remove o objeto e o registro; recalcula o dia (RF12) |
| GET | `/api/desafios/:slug/ranking` | inscrito | `{ itens, minhaPosicao }` |
| GET | `/api/admin/desafios/:slug/participantes` | admin | Lista com dias concluídos e invalidados |
| GET | `/api/admin/desafios/:slug/participantes/:id/dias/:n` | admin | Dia completo com URLs assinadas das fotos em tamanho cheio |
| PATCH | `/api/admin/dias/:diaId/invalidacao` | admin | `{ invalidado: boolean, motivo?: string }` (registra quem e quando) |
| PATCH | `/api/admin/desafios/:slug` | admin | `{ inscricoesAbertas }` |

### 9.1 Inscrição: trava de vagas (crítico)

```ts
// dentro de prisma.$transaction(async (tx) => { ... }, { maxWait: 10_000, timeout: 10_000 })
const [d] = await tx.$queryRaw<{ id: string; totalVagas: number; inscricoesAbertas: boolean }[]>`
  SELECT id, "totalVagas", "inscricoesAbertas" FROM "Desafio" WHERE slug = ${slug} AND ativo = true FOR UPDATE`;
// valide: existe, inscricoesAbertas, status != ENCERRADO
// se já inscrito -> retorne a inscrição existente (idempotente)
const ocupadas = await tx.participante.count({ where: { desafioId: d.id, vagaNumero: { not: null } } });
if (ocupadas >= d.totalVagas) throw new ConflictException({ codigo: 'VAGAS_ESGOTADAS', ... });
return tx.participante.create({ data: { desafioId: d.id, usuarioId, vagaNumero: ocupadas + 1 } });
```

- O `FOR UPDATE` na linha do desafio serializa as inscrições concorrentes. Os índices únicos são a segunda linha de defesa.
- Se a criação der erro `P2002` em `(desafioId, usuarioId)`, trate como "já inscrito" e retorne a inscrição existente.
- Depois do commit, invalide o cache `vagas:{desafioId}` no Redis.

### 9.2 Sessão e segurança

- **Sessão:** JWT com payload `{ sub, papel, v: tokenVersao }`, validade de 30 dias, em cookie `everest_sessao` com `httpOnly`, `sameSite: 'lax'`, `secure` em produção e `path: '/'`. O guard confere se `v` bate com `Usuario.tokenVersao`.
- **Mesma origem em todo lugar:** em dev, o Vite faz proxy de `/api` → `http://localhost:3000`; em produção, o `vercel.json` faz rewrite de `/api/*` → API. Assim não há problema de CORS nem de cookie de terceiro.
- **Mutações:** valide o header `Origin` contra `WEB_ORIGIN` em toda requisição POST, PUT, PATCH ou DELETE (proteção extra contra CSRF).
- **Rate limit:** global de 100 req/min; `login` e `cadastro` com 5 req/min por IP; `upload-url` com 30 req/min. Configure `trust proxy` no Express.
- **Headers:** use `helmet`.

### 9.3 Fotos

- **Upload direto do navegador para o storage** via URL assinada de **PUT**. O R2 não suporta POST com policy. A assinatura inclui o `Content-Type`.
- **Chave do objeto:** `provas/{desafioId}/{participanteId}/{numeroDia}/{tipo}-{fotoId}.{ext}`.
- **Confirmação:** o `HeadObject` confere `ContentLength ≤ 5 MB` e o tipo. Se não bater, apague o objeto e retorne `FOTO_INVALIDA` ou `FOTO_GRANDE_DEMAIS`.
- **Worker BullMQ, fila `fotos`, job `processar-foto`:**
  1. Baixa o original.
  2. Valida o formato real com `sharp().metadata()`.
  3. Aplica `.rotate()` (orientação), redimensiona para no máximo 1600 px e salva em webp com qualidade 80. Isso **remove o EXIF**.
  4. Gera a thumb em 400 px.
  5. Sobe os dois arquivos, apaga o original, atualiza `storageKey`/`thumbKey` e marca `CONFIRMADA`.
  6. Se a imagem for inválida, marca `REJEITADA` e **recalcula o dia**.
- **Leitura:** só por URL assinada de GET com TTL de 10 minutos. O bucket é **privado**.
- **Limpeza:** um job repetível de hora em hora apaga as fotos `PENDENTE` com mais de 1 hora (objeto + registro).
- **Conexão do BullMQ:** precisa de `maxRetriesPerRequest: null` no ioredis, em uma conexão separada da usada pelo cache.

### 9.4 Cache (Redis)

- `vagas:{desafioId}`: TTL de 30 s, invalidado a cada inscrição.
- `ranking:{desafioId}`: TTL de 60 s, invalidado em todo check-in, mudança de foto ou invalidação de dia.

## 10. Frontend: telas e comportamento

**Base visual:**
- **Cores:** fundo `#000000`; superfícies `#0a0a0a`/`#171717`; borda `#262626`; texto `#ffffff`; texto secundário `#a3a3a3`; vermelho `#dc2626` para botões, barras e títulos grandes; vermelho para texto pequeno `#ef4444`.
- **Fonte:** stack do sistema (`system-ui, -apple-system, ...`), sem web font, por desempenho. Títulos em negrito; textos de apoio em caixa alta com `tracking-widest`.
- **Watermark:** a logo fica em uma `div` com `position: fixed`, centralizada, `opacity: .05`, `pointer-events-none`, `aria-hidden`, atrás de todo o conteúdo.
- **Layout:** mobile-first, conteúdo em `max-w-md mx-auto`. A bottom nav (Hoje, Progresso, Ranking, Regras) respeita `env(safe-area-inset-bottom)`.
- **Alvos de toque:** no mínimo 44×44 px. Foco visível em tudo.
- **Rotas:** todas as rotas, exceto a Entrada, usam `React.lazy` (code splitting).

| Rota | Conteúdo e comportamento |
|---|---|
| `/` **Entrada** | Logo, "A SUA MELHOR VERSÃO", "Construindo a sua melhor versão para 2027" e "**X de 50 vagas disponíveis**" com barra. **Estados:** carregando (skeleton) / vagas abertas → botão **"Entrar no desafio"** / esgotado → botão desabilitado **"Vagas esgotadas"** / já inscrito → **"Ir para o desafio"** / inscrições fechadas. Mostra a data de início, o botão **"Baixar o app"** e um link para as regras. As vagas são recarregadas a cada 30 s só com a aba visível. **Fluxo:** "Entrar" sem login → `/cadastro?acao=inscrever` → após cadastro, POST da inscrição → `/hoje`. Se vier `VAGAS_ESGOTADAS` nesse meio-tempo, mostre a mensagem e atualize o contador. |
| `/cadastro`, `/login` | Formulário validado com o schema do shared. Erros por campo, com `aria-describedby`. O checkbox "Li e aceito a política de privacidade" tem link para `/privacidade`. |
| `/privacidade` | Texto vindo de `content/privacidade.ts`. |
| `/hoje` | **Cabeçalho:** "Dia X de 30" + data. **Grid de 30 dias** (6 colunas): concluído = fundo vermelho + check; hoje = contorno vermelho; passado não concluído = cinza; futuro = esmaecido e desabilitado; invalidado = ícone de alerta. Tocar em um dia abre esse dia (em leitura, se não for editável). **Cards do checklist:** **Água** (barra ml/3000, botões +250, +500 e −250, atalho "Bati 3 L"); **Exercício** (toggle); **Leitura** (stepper +1/+5 com input, meta 10); **Fotos** (3 slots: Água, Exercício e Leitura, com preview, trocar, remover, progresso de upload e estados "processando"/"rejeitada"); **Story** (toggle "Postei o story" + botão "Copiar @handle #DESAFIO30EVEREST"). **Resumo:** "3 de 5 requisitos" e um banner "Dia concluído! 🔥" quando o dia fecha. **Salvamento:** automático com debounce de 800 ms, update otimista (TanStack mutation) e indicador "Salvando…/Salvo" com `aria-live="polite"`. **Offline:** banner e edição desabilitada. **Antes do início:** contagem regressiva. **Depois do fim:** resumo final. |
| `/progresso` | Cards com dias concluídos (X/30), evolução %, melhor sequência e sequência atual, mais o grid de 30 dias. |
| `/ranking` | Posição, nome de exibição, dias concluídos e melhor sequência. Sua linha fica destacada; o embaixador tem badge. Mostre o critério de desempate no rodapé. |
| `/regras` | Requisitos diários (tabela do SDD 5.1), vagas, premiação e desempate, com valores vindos do desafio (handle e hashtag dinâmicos). |
| `/admin`, `/admin/participantes/:id` | Só para ADMIN. Lista de participantes → grid do participante → dia com as fotos em tamanho cheio + valores + botões **Invalidar dia** (com motivo obrigatório) e **Revalidar**. Há também um toggle "Inscrições abertas". |

**Upload de foto no front:**
1. `<input type="file" accept="image/*">`, sem `capture`, para permitir escolher da galeria.
2. `browser-image-compression` com `maxWidthOrHeight: 1600`, `maxSizeMB: 1` e `fileType: 'image/jpeg'`.
3. Peça a `upload-url`, faça o `PUT` direto com `fetch` (o progresso pode vir de XHR, se quiser), depois chame `confirmar` e invalide a query do dia.

**Erros:** `lib/erros.ts` mapeia cada `codigo` para uma mensagem amigável em pt-BR. O cliente HTTP usa `credentials: 'include'` e base `/api`; em 401, limpa o estado de auth e redireciona para `/login`.

## 11. PWA e botão "Baixar o app"

- **`vite-plugin-pwa` com `registerType: 'prompt'`:** mostre um toast "Nova versão disponível — Atualizar", para ninguém ficar preso em uma versão velha.
- **Manifest:** `name: "Everest Desafio"`, `short_name: "Everest"`, `start_url: "/"`, `display: "standalone"`, `background_color: "#000000"`, `theme_color: "#000000"`, `lang: "pt-BR"`. Ícones de 192 e 512 px, mais 512 px `maskable`.
- **Ícones:** gere a partir de `public/logo.png` com `@vite-pwa/assets-generator`, incluindo o `apple-touch-icon` de 180 px. No `index.html`, adicione as meta tags de iOS (`apple-mobile-web-app-capable`, `status-bar-style: black-translucent`) e `viewport-fit=cover`.
- **Workbox:**
  - Faça precache do app shell.
  - `navigateFallback: '/index.html'` com `navigateFallbackDenylist: [/^\/api/]`.
  - **NUNCA** coloque `/api` em cache, nem URLs assinadas do storage.
- **Hook `useInstallPrompt`:**
  - Escute `beforeinstallprompt` (chame `preventDefault` e guarde o evento). Quando ele existir, o botão chama `prompt()`.
  - No iOS Safari, onde esse evento não existe, o botão abre um modal com o passo a passo: Compartilhar → "Adicionar à Tela de Início".
  - Se o app já roda instalado (`matchMedia('(display-mode: standalone)')`), esconda o botão.
  - Nos demais casos, abra ou copie o `VITE_APP_URL`.

## 12. Checklist de segurança e privacidade

- [ ] Senha com argon2, sem limite artificial além de 72 caracteres
- [ ] Login não revela se o e-mail existe
- [ ] Cookie httpOnly + secure em produção + SameSite=Lax
- [ ] Toda rota de participante confere se o usuário é dono da inscrição. Toda rota admin confere `papel === ADMIN`
- [ ] O `concluido` nunca vem do cliente. É sempre recalculado no servidor
- [ ] O servidor recusa edição fora da janela (X1) com `DIA_NAO_EDITAVEL`
- [ ] Bucket privado, URLs assinadas curtas e EXIF removido
- [ ] Ranking mostra só "Nome S.", sem e-mail
- [ ] Swagger desligado em produção
- [ ] Env validado com zod no boot. A API não sobe com variável faltando
- [ ] Nenhum segredo em código. O `.env.example` está completo

## 13. FASES

> Cada fase tem uma lista de **tarefas** e uma **definição de pronto (DoD)**. Copie estas listas para o `docs/PROGRESSO.md` na Fase 0 e vá marcando.

### FASE 0: Fundação do repositório
- [ ] `git init`, `.gitignore` (node_modules, dist, .env*, exceto .env.example), `.editorconfig`, `.nvmrc` (Node LTS)
- [ ] `pnpm-workspace.yaml` (`apps/*`, `packages/*`) + `package.json` raiz com os scripts `dev`, `build`, `lint`, `typecheck`, `test`, `check:launch`
- [ ] `tsconfig.base.json` strict, ESLint flat config + Prettier
- [ ] `docker-compose.yml`:
  - `postgres:16` (5432), `redis:7` (6379) e `minio` (9000/9001), todos com healthcheck
  - um serviço `minio-init` (imagem `minio/mc`) que cria o bucket privado `everest-provas`
- [ ] `.env.example` em `apps/api` e `apps/web`:
  - **API:** `NODE_ENV`, `PORT`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `WEB_ORIGIN`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE`, `PERMITIR_EDITAR_DIAS_ANTERIORES`
  - **Web:** `VITE_APP_URL`
- [ ] `scripts/check-placeholders.mjs`: varre `apps/*/src`, `apps/web/index.html` e `apps/web/public` procurando `[LINK_DO_APP]`, `@[SEU_@]` e `TODO_DECISAO`. Com `--strict`, sai com código 1 se encontrar algo; sem a flag, só avisa. O `check:launch` usa `--strict`
- [ ] `docs/PROGRESSO.md` (fases e checklists desta seção), `docs/DECISOES.md` (tabela da seção 4 com a coluna Status = ASSUMIDO/CONFIRMADO) e `.cursor/rules/everest.mdc` (conteúdo no Anexo A)
- **DoD:** `pnpm install` sem erro; `docker compose up -d` com os 3 serviços *healthy*; o bucket existe no console do MinIO (localhost:9001); `pnpm lint` passa.

### FASE 1: `packages/shared`
- [ ] Pacote `@everest/shared` com tsup (cjs + esm + dts) e `exports` corretos (seção 5)
- [ ] Constantes, schemas zod e todas as funções da seção 8
- [ ] Todos os testes da seção 8
- **DoD:** `pnpm --filter @everest/shared test` passa 100%; `pnpm --filter @everest/shared build` gera `dist/index.js`, `index.cjs` e `index.d.ts`.

### FASE 2: Base da API
- [ ] Projeto Nest em `apps/api` (`pnpm dlx @nestjs/cli new api --package-manager pnpm --skip-git --directory apps/api`), dependendo de `"@everest/shared": "workspace:*"`
- [ ] ConfigModule com validação zod do env (falha rápida no boot)
- [ ] Prisma: schema da seção 7, migration inicial + migration `checks`, `PrismaService`
- [ ] `RedisModule` (cliente ioredis para cache)
- [ ] `main.ts`: prefixo `/api`, `helmet`, `cookie-parser`, `trust proxy`, Swagger em dev, filtro global de exceções (formato `{codigo, mensagem}`), `ZodValidationPipe`, CORS só para `WEB_ORIGIN` em dev
- [ ] `GET /api/health` checando o banco (`SELECT 1`) e o Redis (`PING`)
- [ ] `prisma/seed.ts` (só dev): um admin ("Anderson Dev", `admin@everest.dev`) e um desafio ativo que começou há 3 dias, com handle `everest_dev`. O Anderson entra como participante embaixador, mais 5 participantes fictícios com dias variados
- [ ] Scripts `criar-desafio.ts` (args: slug, nome, dataInicio, handle, totalVagas), `criar-admin.ts` e `redefinir-senha.ts`
- **DoD:** `prisma migrate dev` aplica sem erro; `pnpm --filter api start:dev` sobe; `curl localhost:3000/api/health` retorna 200 com db ok e redis ok; `/api/docs` abre; o seed roda duas vezes sem duplicar dados (é idempotente); um INSERT manual com `vagaNumero = 0` falha por causa do CHECK.

### FASE 3: Autenticação
- [ ] `auth` module: cadastro, login, logout, me (seção 9.2)
- [ ] `JwtAuthGuard`, `AdminGuard`, decorator `@UsuarioAtual()`, middleware de checagem de `Origin` nas mutações
- [ ] `ThrottlerModule` com os limites da seção 9.2
- [ ] Testes e2e (supertest): cadastro → me (200) → logout → me (401); e-mail duplicado → `EMAIL_EM_USO`; senha errada → `CREDENCIAIS_INVALIDAS`; cadastro sem aceite → `VALIDACAO`; e-mail é salvo em lowercase
- **DoD:** `pnpm --filter api test:e2e` passa.

### FASE 4: Desafio e inscrição
- [ ] `GET /desafios/atual` com o cache de vagas (seção 9.4)
- [ ] `POST /desafios/:slug/inscricao` com a trava da seção 9.1
- [ ] A regra Q3 (`embaixadorOcupaVaga`) é aplicada no script/seed que inscreve o embaixador
- [ ] **Teste de concorrência:** desafio com `totalVagas = 50` e 0 ocupadas; 60 usuários diferentes se inscrevem **em paralelo** (`Promise.all`). Resultado esperado: exatamente 50 com 201, 10 com `VAGAS_ESGOTADAS`, nenhum `vagaNumero` repetido e todos entre 1 e 50
- [ ] Teste: o mesmo usuário se inscreve 2× em paralelo → 1 inscrição só, e as duas respostas têm sucesso
- [ ] Teste: `inscricoesAbertas = false` → `INSCRICOES_FECHADAS`
- **DoD:** testes passando. Se aparecer `P2024` (timeout do pool), ajuste `maxWait`/`timeout` e o `connection_limit` do `DATABASE_URL` em teste. Nunca afrouxe a asserção.

### FASE 5: Check-in diário e progresso
- [ ] `GET /meu-progresso`, `GET /dias/:n` e `PUT /dias/:n` (seção 9)
- [ ] O `PUT` valida a janela (X1 + `calcularDiaAtual`), faz o upsert e recalcula `concluido` com `calcularConcluido` (usando as fotos ENVIADA/CONFIRMADA do banco). Depois invalida o cache do ranking
- [ ] Testes: completar 4 requisitos não conclui; completar os 5 conclui; editar o dia anterior → `DIA_NAO_EDITAVEL`; dia futuro → `DIA_NAO_EDITAVEL`; antes do início → `DESAFIO_NAO_INICIADO`; não inscrito → `NAO_INSCRITO`; o body manda `concluido: true` e isso é ignorado
- **DoD:** testes passando; o Swagger mostra todos os endpoints com exemplos.

### FASE 6: Fotos (storage + fila)
- [ ] `StorageService` (S3 client com `forcePathStyle` configurável, presign de PUT e GET, head, delete, get, put)
- [ ] Endpoints `upload-url`, `confirmar` e `DELETE` (seção 9.3)
- [ ] `@nestjs/bullmq`: fila `fotos`, processor `processar-foto` e job repetível de limpeza
- [ ] O recálculo do dia é chamado após confirmar, rejeitar e deletar
- [ ] Testes de integração com o MinIO: fluxo completo de 3 fotos → dia concluído (com os outros requisitos ok); deletar 1 foto → dia volta a não concluído; arquivo de 6 MB → `FOTO_GRANDE_DEMAIS`; arquivo `.txt` renomeado como `.jpg` → `REJEITADA` após o worker
- [ ] Teste: a imagem final não tem EXIF (`sharp(...).metadata()` sem `exif`)
- **DoD:** testes passando; o objeto aparece no MinIO com o nome esperado; a URL assinada abre a imagem e expira.

### FASE 7: Ranking
- [ ] Consulta agregada (dias concluídos e não invalidados por participante, em SQL) + sequências calculadas em TS com o shared + `ordenarRanking` + `nomeExibicao`
- [ ] Cache e invalidação (seção 9.4); a resposta inclui `minhaPosicao`
- [ ] Testes: a ordem respeita os desempates da Q5; um dia invalidado não conta
- **DoD:** testes passando.

### FASE 8: Admin (embaixador)
- [ ] Endpoints admin (seção 9) com `AdminGuard`
- [ ] A invalidação grava `invalidadoPorId`/`invalidadoEm`, recalcula o dia e invalida o ranking
- [ ] Testes: um não admin recebe 403 em todas as rotas admin; invalidar remove o dia da contagem; revalidar devolve
- **DoD:** testes passando. **Ao fim desta fase o backend está completo:** rode `pnpm --filter api test && pnpm --filter api test:e2e` e reporte o total de testes.

### FASE 9: Base do frontend
- [ ] `pnpm create vite apps/web --template react-ts`, depender de `@everest/shared`
- [ ] Tailwind com os tokens da seção 10; `styles/index.css` com as cores, o foco visível e as safe areas
- [ ] Proxy do Vite `/api` → `http://localhost:3000`
- [ ] `lib/api.ts` (fetch wrapper tipado, tratamento do `{codigo, mensagem}`), `lib/erros.ts`, `queryClient`
- [ ] Auth: hook `useMe`, `RotaProtegida`, `RotaInscrito`, `RotaAdmin`
- [ ] `AppShell` + `BottomNav` + `Watermark` + páginas Login, Cadastro e Privacidade
- [ ] Root script `dev`: sobe em paralelo `shared` (tsup --watch), `api` e `web`
- **DoD:** `pnpm dev` sobe tudo; cadastro e login funcionam contra a API local; recarregar a página mantém a sessão; `pnpm --filter web build` e `typecheck` passam.

### FASE 10: Telas do produto
- [ ] Entrada, Hoje, Progresso, Ranking, Regras e Admin, exatamente como na seção 10
- [ ] Upload de fotos com compressão e progresso
- [ ] Autosave com update otimista e indicador
- [ ] Todos os estados: carregando, vazio, erro, offline, não iniciado, encerrado, esgotado
- **DoD (roteiro manual no DevTools, viewport 390×844):**
  1. Visitante vê as vagas
  2. Cadastro → inscrito automaticamente → cai em `/hoje`
  3. Completa os 5 requisitos com 3 fotos → banner "Dia concluído"
  4. Recarrega a página → os dados persistem
  5. Remove uma foto → o dia volta a "em andamento"
  6. O Progresso e o Ranking refletem tudo
  7. Admin invalida o dia → o ranking cai
  8. Com o desafio esgotado (mude o `totalVagas` no banco) → "Vagas esgotadas"

  Liste no relatório quais passos você executou e o resultado de cada um.

### FASE 11: PWA
- [ ] Tudo da seção 11, incluindo a geração de ícones a partir da logo. Se `logo.png` não existir, gere um placeholder, marque `TODO_DECISAO(LOGO)` e registre o bloqueio
- [ ] Toast de nova versão e banner de offline
- **DoD:** `pnpm --filter web build && pnpm --filter web preview`; no Chrome DevTools → Application, o manifest aparece sem erros, o SW está ativo e o app é instalável. Em modo offline, o shell carrega e mostra o banner. `/api` não aparece em Cache Storage.

### FASE 12: Qualidade
- [ ] Playwright (viewport mobile), smoke e2e: cadastro → inscrição → check-in completo com 3 fotos de fixture → dia concluído → ranking. Rodar `@axe-core/playwright` em todas as telas, com zero violações sérias ou críticas
- [ ] Contraste: confira os tokens (regra da seção 3) e corrija o que reprovar
- [ ] Lighthouse mobile no build de preview: Performance ≥ 85, Acessibilidade ≥ 95, Best Practices ≥ 95. O bundle inicial (rota `/`) deve ficar abaixo de 200 KB gzip
- [ ] Logo otimizada (webp ≤ 50 KB para a watermark e o cabeçalho)
- **DoD:** e2e passando; reporte os números do Lighthouse e o tamanho do bundle.

### FASE 13: Deploy
- [ ] `apps/api/Dockerfile` multi-stage (use `pnpm deploy --filter api` para isolar as dependências). O comando de start roda `prisma migrate deploy` e depois o servidor
- [ ] Documente em `docs/DEPLOY.md`:
  - **API e worker** em um container (Railway, Render, Fly ou uma VPS com Docker)
  - **PostgreSQL** gerenciado
  - **Redis** gerenciado
  - **Cloudflare R2** com bucket **privado** e CORS liberando `PUT` e `GET` só para o domínio do app, com o header `Content-Type`
  - **Vercel** com root `apps/web`
- [ ] `apps/web/vercel.json` com rewrite de `/api/:path*` → `https://<API_HOST>/api/:path*` e fallback SPA para `/index.html`
- [ ] Checklist de produção: envs preenchidos; `criar-desafio` e `criar-admin` executados no banco de produção (**sem seed**); `pnpm check:launch` passando
- **DoD:** o link público abre no Android (Chrome) e no iPhone (Safari); o login mantém a sessão através do rewrite (confira o cookie); uma foto sobe para o R2; o app instala nos dois sistemas.

### FASE 14 (futuro — NÃO EXECUTAR sem pedido): Lojas
Empacotamento com Capacitor (`apps/mobile`), câmera nativa e submissão nas lojas. Fica fora deste ciclo.

## 14. Relatório de fase (formato obrigatório ao terminar)

```text
## Relatório — FASE N
**Feito:** (bullets do que foi implementado)
**Arquivos criados/alterados:** (lista)
**Comandos executados e resultado:** (comando → passou/falhou + resumo da saída)
**Testes:** X passando / Y falhando
**Decisões tomadas:** (e se foram registradas em DECISOES.md)
**Pendências / TODO_DECISAO:** (lista)
**Riscos ou dúvidas:** (lista)
**Próximo passo sugerido:** FASE N+1
```

## 15. Checklist final de lançamento (critérios de aceite do SDD 13 + bloqueios)

- [ ] Inscrição funciona até 50 vagas e bloqueia a 51ª tentativa (teste da Fase 4 + checagem manual em produção)
- [ ] Um dia só aparece como concluído com os 5 requisitos
- [ ] O upload aceita exatamente 3 fotos por dia (1 de cada tipo)
- [ ] O Progresso e o Ranking refletem os dias concluídos
- [ ] O botão "Baixar o app" aponta para `VITE_APP_URL` / dispara a instalação
- [ ] O app abre no celular com a logo e os textos finais
- [ ] PWA instalável, publicado na Vercel
- [ ] `pnpm check:launch` passa: nenhum `[LINK_DO_APP]`, `@[SEU_@]` ou `TODO_DECISAO` restante
- [ ] 🚫 Q1 @ real, Q2 link, Q8 texto de privacidade, Q15 domínio e logo final, todos com Status CONFIRMADO em `DECISOES.md`
- [ ] Desafio de produção criado com `dataInicio` correta; o Anderson é admin e participante embaixador
- [ ] Banco de produção sem nenhum participante fictício
- [ ] Teste piloto com 5 a 10 pessoas feito (SDD, roadmap fase 5); regras congeladas antes do início

---

## Anexo A: conteúdo de `.cursor/rules/everest.mdc`

```markdown
---
description: Regras do projeto Everest Desafio
alwaysApply: true
---
- Fonte de requisitos: docs/SDD.md + docs/PROMPT_CURSOR.md (o PROMPT prevalece em conflitos).
- Antes de qualquer tarefa, leia docs/PROGRESSO.md e docs/DECISOES.md.
- Execute só a fase pedida; ao terminar, entregue o relatório de fase e PARE.
- Monorepo pnpm: apps/web (React+Vite+TS+Tailwind), apps/api (NestJS+Prisma+Redis/BullMQ), packages/shared (regras + zod).
- Regras de negócio ficam em packages/shared e são aplicadas no servidor. `concluido` nunca vem do cliente.
- TypeScript strict, sem any. Sem código incompleto, sem "// resto do código".
- Não invente decisões de produto: use os defaults da seção 4 do PROMPT; o que faltar vira TODO_DECISAO(Qx) + registro em DECISOES.md.
- Não adicione dependências fora da lista da seção 5 sem justificar.
- Rode build/test/typecheck antes de dizer que terminou. Mesmo erro 3x: pare e explique.
- UI em pt-BR, mobile-first, preto/vermelho; texto vermelho pequeno usa #ef4444, nunca #dc2626.
- Fotos: bucket privado, URL assinada, EXIF removido. Nunca cachear /api no service worker.
```
