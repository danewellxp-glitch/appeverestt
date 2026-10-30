# FRONTEND v2: novo design do Everest Desafio

> **O que é este documento:** o plano de execução para levar o `apps/web` atual ao design validado no protótipo (`docs/prototipo/everest-prototipo.html`). Isso inclui login com Firebase (Google + e-mail/senha), tema claro/escuro, rotas novas, home no estilo "desafio", check-in reformulado, escalada simbólica e animações.
>
> **Retrato do código atual:** o retrato que estava neste arquivo foi movido para `docs/FRONTEND-ESTADO-ATUAL.md`. Leia lá as seções §4 (rotas e auth), §5 (camada de dados) e §6 (design system) antes de mexer em qualquer coisa.
>
> **Precedência:** este arquivo > `docs/PROMPT_CURSOR.md` > `docs/SDD.md`, sempre que tratarem do frontend, da autenticação ou dos endpoints listados aqui. Para o resto (vagas, check-in, fotos, ranking, admin), o `PROMPT_CURSOR.md` continua valendo.
>
> **Como operar:** `docs/PROMPT_FRONTEND.md` traz as mensagens prontas para cada fase.

---

## 0. Regras de trabalho para o agente

1. **Faça uma fase por vez** (seção 12). Ao terminar, entregue o relatório no formato da seção 14 e **pare**.
2. **Comece cada fase lendo** este arquivo, `docs/PROGRESSO.md`, `docs/DECISOES.md` e as seções citadas de `docs/FRONTEND-ESTADO-ATUAL.md`. Liste os arquivos que vai criar ou alterar antes de escrever código.
3. **O protótipo é a referência visual.** Abra `docs/prototipo/everest-prototipo.html` no navegador. Cada tela tem um hash (`#entrada`, `#desafio`, `#dia`…) e o painel da direita mostra a rota e as chamadas. Copie layout, hierarquia, espaçamentos, raios, cores e textos. **Não copie o JavaScript do protótipo**: ele é vanilla e usa dados falsos. O app real usa React, os hooks existentes e a API.
4. **Reaproveite o que já funciona.** Os hooks de dados (`useCheckin`, `useFotosDia`, `usePollingFotos`, `useMe`, `useMeuProgresso`, `useRanking`, as consultas de admin), o cliente `api.ts`, as `chaves` de cache e a lógica de PWA **não** são reescritos. Só a camada visual, as rotas e a autenticação mudam.
5. **Regras de negócio continuam em `@everest/shared`** e são decididas no servidor. O front nunca envia `concluido`.
6. **Rode de verdade** `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm --filter web build` e `pnpm --filter api test:e2e` antes de dizer que terminou.
7. **Regra das 3 tentativas:** se o mesmo erro aparecer 3 vezes, pare e descreva o erro, as hipóteses e o que já tentou.
8. **Sem código pela metade:** nada de `// TODO implementar`, nem de stubs, nem de `any`.
9. **Dependências novas** só as da seção 2. Qualquer outra precisa de justificativa no relatório.
10. **Commit ao fim de cada fase**, com mensagem `frontend-v2 R<N>: <resumo>`.

---

## 1. O que muda, em uma tabela

| Área | Hoje | Depois (v2) |
|---|---|---|
| Login | E-mail + senha na API (argon2) | **Firebase Auth** (Google + e-mail/senha). A API troca o `idToken` pelo **mesmo cookie httpOnly** de hoje |
| Recuperar senha | Fora do MVP (script) | `sendPasswordResetEmail` do Firebase |
| Primeiro acesso | Cadastro já pede nome e aceite | Tela **`/bem-vindo`**: nome completo, dados de cadastro (Instagram, nascimento, WhatsApp, bairro, cidade, UF), aceite e consentimento de marketing opcional. **Obrigatória para todos** antes da vaga (seção 4.4) |
| Rotas | `/login`, `/cadastro`, `/hoje?dia=N` | `/entrar`, `/criar-conta`, `/recuperar-senha`, `/bem-vindo`, `/desafio`, `/desafio/dia/:n`, `/perfil`. As rotas antigas **redirecionam** |
| Home do inscrito | `/hoje` (check-in direto) | **`/desafio`**: faixa dos 30 dias, carrossel de destaque, card "Seu dia", atividade do grupo e CTA fixo |
| Check-in | Na `/hoje` | **`/desafio/dia/:n`**, que abre com animação a partir do card ou do dia tocado |
| Navegação | Bottom nav: Hoje · Progresso · Ranking · Regras | Bottom nav em pílula: **Desafio · Progresso · Ranking · Perfil**. Regras vira atalho |
| Tema | Só escuro | **Claro / Escuro / Sistema**, escolhido no Perfil |
| Tipografia | Fonte do sistema | **Big Shoulders Display** (títulos e números) + **Onest** (texto), auto-hospedadas |
| Narrativa | Progresso em % | **Escalada simbólica:** cada dia concluído sobe 295 m até 8.848 m (cume = prêmio) |
| Movimento | Quase nenhum | View Transitions entre rotas, container transform, toque com mola, entrada em cascata e contadores |
| Admin | Lista + invalidar | Também **fila de conferência** ("para revisar") com o botão Aprovar |

---

## 2. Dependências

| Onde | Pacote | Para quê | Observação |
|---|---|---|---|
| web | `firebase` | Auth no navegador | **Importe só `firebase/app` e `firebase/auth`, e sempre com `import()` dinâmico** (seção 5.2). A rota `/` não pode carregar Firebase |
| web | `@fontsource-variable/onest` | Fonte de texto | Se o nome do pacote mudou, procure no npm "fontsource onest" |
| web | `@fontsource/big-shoulders-display` (pesos 700, 800, 900) | Fonte de títulos e números | Se não existir no npm, baixe os `.woff2` do Google Fonts para `apps/web/src/assets/fonts/` e declare `@font-face` |
| api | `firebase-admin` | Validar o `idToken` e excluir usuário | — |
| raiz (dev) | `firebase-tools` | Emulador de Auth local (`demo-everest`) | Só desenvolvimento e testes |

**Não adicione** `motion`/`framer-motion`, `clsx`, `tailwind-merge`, nem lib de toast ou de bottom sheet. As animações usam View Transitions + CSS (seção 7), e os componentes saem do zero (seção 8).

Use as versões estáveis atuais e siga a documentação **da versão instalada**. A API do react-router 8 para `viewTransition` deve ser conferida no `node_modules/react-router` antes de usar.

---

## 3. Mapa de telas, rotas e endpoints

| # | Rota | Arquivo | Guard | Layout | Endpoints / SDK | Protótipo |
|---|---|---|---|---|---|---|
| 1 | `/` | `pages/Entrada.tsx` (refazer) | — | sem shell | `GET /desafios/atual` | `#entrada` |
| 2 | `/entrar` | `pages/Entrar.tsx` (novo, substitui `Login`) | `RotaVisitante` | `TelaAuth` | Firebase `signInWithEmailAndPassword` / Google → `POST /auth/sessao` | `#entrar` |
| 3 | `/criar-conta` | `pages/CriarConta.tsx` (novo, substitui `Cadastro`) | `RotaVisitante` | `TelaAuth` | Firebase `createUserWithEmailAndPassword` / Google → `POST /auth/sessao` | `#criar-conta` |
| 4 | `/recuperar-senha` | `pages/RecuperarSenha.tsx` (novo) | — | `TelaAuth` | Firebase `sendPasswordResetEmail` | `#recuperar-senha` |
| 5 | `/bem-vindo` | `pages/BemVindo.tsx` (novo) | `RotaProtegida` (sem exigir perfil completo) | sem shell | `PATCH /me` → `POST /desafios/:slug/inscricao` | `#bem-vindo` |
| 6 | `/desafio` | `pages/Desafio.tsx` (novo) | `RotaProtegida` → `RotaPerfilCompleto` → `RotaInscrito` | `AppShell` + tabs | `GET /auth/me`, `GET /desafios/:slug/meu-progresso`, **`GET /desafios/:slug/feed`** (novo) | `#desafio` |
| 7 | `/desafio/dia/:n` | `pages/Dia.tsx` (refatora `Hoje.tsx`) | idem | `AppShell`, sem tabs | `GET`/`PUT /dias/:n`, fotos (inalterado) | `#dia` |
| 8 | `/progresso` | `pages/Progresso.tsx` (refazer) | idem | tabs | `GET /meu-progresso` | `#progresso` |
| 9 | `/ranking` | `pages/Ranking.tsx` (refazer) | idem | tabs | `GET /ranking` | `#ranking` |
| 10 | `/regras` | `pages/Regras.tsx` (refazer) | — | sem tabs, com "voltar" | `GET /desafios/atual` | `#regras` |
| 11 | `/perfil` | `pages/Perfil.tsx` (novo) | `RotaProtegida` | tabs (se inscrito) | `GET /auth/me`, `POST /auth/logout`, **`DELETE /me`** (novo) | `#perfil` |
| 12 | `/privacidade` | `pages/Privacidade.tsx` (refazer) | — | com "voltar" | — | `#privacidade` |
| 13 | `/admin` | `pages/Admin.tsx` (refazer) | `RotaProtegida` → `RotaAdmin` | com "voltar" | `GET /admin/.../participantes`, `PATCH /admin/desafios/:slug`, **`GET /desafios/:slug/feed`** | `#admin` |
| 14 | `/admin/participantes/:id` | `pages/AdminParticipante.tsx` (refazer) | idem | com "voltar" | `GET .../dias/:n`, `PATCH /admin/dias/:diaId/invalidacao`, **`PATCH /admin/dias/:diaId/conferencia`** (novo) | `#admin-participante` |
| — | `*` | `pages/NaoEncontrada.tsx` (restyle) | — | — | — | — |

**Redirecionamentos das rotas antigas** (sempre com `replace`, preservando a query):

| Antiga | Nova |
|---|---|
| `/login` | `/entrar` |
| `/cadastro` | `/criar-conta` |
| `/hoje` | `/desafio/dia/<diaAtual>`, ou `/desafio` se o desafio não estiver em andamento |
| `/hoje?dia=N` | `/desafio/dia/N` |

**Novos guards** (em `features/auth/rotas.tsx`):

| Guard | Condição para passar | Destino quando barra |
|---|---|---|
| `RotaVisitante` | `!me` | Se `me.usuario.perfilCompleto` é falso → `/bem-vindo`; senão o destino de `usePosAutenticacao` (`volta` ou `/desafio`) |
| `RotaPerfilCompleto` | `me.usuario.perfilCompleto` | `/bem-vindo?volta=…` |
| `RotaInscrito` (existente) | `me.participacao` | `/` |
| `RotaAdmin` (existente) | `papel === 'ADMIN'` | **`/desafio`** (antes era `/hoje`) |

**Parâmetro `:n` de `/desafio/dia/:n`:** valide com `numeroDiaSchema`. Se for maior que `min(diaAtual, totalDias)`, menor que 1 ou não numérico, redirecione para `/desafio/dia/<diaAtual>` com `replace`. A lógica atual de `useDiaSelecionado` passa a ler `useParams` em vez de `?dia=`.

**Bottom nav:** aparece nas rotas `/desafio`, `/progresso`, `/ranking` e `/perfil`, e só quando o usuário é inscrito. No `/perfil` de quem não é inscrito, ela não aparece. Muda de "depende do usuário" para "depende da rota **e** do usuário".

---

## 4. Backend: o que precisa mudar

> Faça na **Fase R1**, antes de qualquer tela. Todos os 52 e2e atuais precisam continuar passando, adaptados ao novo fluxo de sessão.

### 4.1 Prisma

```prisma
model Usuario {
  id              String         @id @default(cuid())
  nome            String
  email           String         @unique          // lowercase + trim
  firebaseUid     String?        @unique          // NOVO
  fotoUrl         String?                         // NOVO: foto do Google (pode ser null)
  senhaHash       String?                         // AGORA OPCIONAL: só usuários legados/seed
  papel           Papel          @default(USUARIO)
  tokenVersao     Int            @default(0)
  aceitouTermosEm DateTime?                       // AGORA OPCIONAL: null = perfil incompleto
  instagram          String?                      // NOVO (R1.1): sem "@", minúsculo
  dataNascimento     DateTime? @db.Date           // NOVO (R1.1)
  whatsapp           String?                      // NOVO (R1.1): só dígitos com DDD, sem +55
  bairro             String?                      // NOVO (R1.1)
  cidade             String?                      // NOVO (R1.1)
  uf                 String?   @db.Char(2)        // NOVO (R1.1)
  aceitouMarketingEm DateTime?                    // NOVO (R1.1): consentimento de marketing (X9); null = não/revogado
  excluidoEm      DateTime?                       // NOVO: conta excluída (anonimizada)
  criadoEm        DateTime       @default(now())
  participacoes   Participante[]
}

model DiaDesafio {
  // ... campos atuais ...
  conferidoEm     DateTime?                       // NOVO: aprovado pelo embaixador
  conferidoPorId  String?                         // NOVO
}
```

- Faça a migration com `prisma migrate dev --name firebase_auth_conferencia`.
- **Perfil completo:** `aceitouTermosEm != null && excluidoEm == null` **e** nome com sobrenome **e** todos os dados de cadastro preenchidos (`instagram`, `dataNascimento`, `whatsapp`, `bairro`, `cidade`, `uf`). Ver seção 4.4.
- **Regra da conferência:** qualquer `PUT /dias/:n`, confirmação de foto, exclusão de foto ou rejeição pelo worker zera `conferidoEm` e `conferidoPorId` daquele dia. Invalidar também zera; revalidar não marca como conferido.

### 4.2 Contrato novo e alterado

| Método | Rota | Auth | Body | Resposta | Erros |
|---|---|---|---|---|---|
| POST | `/auth/sessao` | público, 10/min | `sessaoSchema`: `{ idToken: string }` (até 4096 caracteres) | `MeResposta` e grava o cookie `everest_sessao` (mesmas opções de hoje) | `NAO_AUTENTICADO` (token inválido, revogado ou com `auth_time` > 5 min), `EMAIL_EM_USO`, `VALIDACAO`, 429 |
| GET | `/auth/me` | logado | — | `MeResposta` com **`usuario.fotoUrl`** e **`usuario.perfilCompleto`** | 401 |
| PATCH | `/me` | logado | `atualizarPerfilSchema` (seção 4.4) | `MeResposta` | `VALIDACAO` (erros por campo) |
| POST | `/desafios/:slug/inscricao` (alterado) | logado | — | igual | **novo:** `403 PERFIL_INCOMPLETO` se o perfil não estiver completo (não gasta vaga) |
| DELETE | `/me` | logado | — | `{ ok: true }` e limpa o cookie | — |
| GET | `/desafios/:slug/feed` | inscrito **ou** admin | — | `FeedResposta` (abaixo) | 403, 404 |
| PATCH | `/admin/dias/:diaId/conferencia` | admin | `conferenciaSchema`: `{ conferido: boolean }` | `{ diaId, conferidoEm }` | 404; 409 `VALIDACAO` se o dia não estiver concluído ou estiver invalidado |
| GET | `/admin/desafios/:slug/participantes` | admin | — | cada participante ganha **`paraRevisar: number`**; a resposta ganha **`totalParaRevisar`** | — |
| GET | `/admin/.../participantes/:id` e `/dias/:n` | admin | — | `DiaResumo.situacao` ganha **`'AGUARDANDO_CONFERENCIA'`** só nas respostas de admin; `AdminDiaDetalhe` ganha `conferidoEm` | — |

```ts
// packages/shared/src/tipos.ts
interface UsuarioMe {
  id; nome; email; papel; fotoUrl: string | null; perfilCompleto: boolean;
  // R1.1: dados de cadastro (null até a /bem-vindo)
  instagram: string | null; dataNascimento: string | null /* 'YYYY-MM-DD' */; whatsapp: string | null;
  bairro: string | null; cidade: string | null; uf: string | null; aceitouMarketing: boolean;
}
interface FeedResposta {
  diaAtual: number | null;
  fecharamHoje: number;                                   // dias concluídos e não invalidados no diaAtual
  avataresHoje: { nomeExibicao: string; iniciais: string; fotoUrl: string | null }[]; // até 4, mais recentes primeiro
  maiorSequenciaAtiva: { nomeExibicao: string; dias: number } | null;
  vagasOcupadas: number;
  totalVagas: number;
}
```

- **Cache do feed:** chave `feed:{desafioId}` com TTL de 60 s, invalidada nos mesmos pontos do ranking.
- **Lógica do `POST /auth/sessao`**, em `auth.service.ts`:
  1. `verificador.verificar(idToken)` devolve `{ uid, email, emailVerificado, nome?, foto?, provedor, authTime }`. Recuse se faltar e-mail ou se `agora - authTime > 300 s`, com `401 NAO_AUTENTICADO` e a mensagem "Sua sessão expirou. Entre de novo.".
  2. Procure o `Usuario` por `firebaseUid`.
  3. Se não achar, procure por `email` **somente se `emailVerificado`**. Achando, vincule o `firebaseUid` (isso liga contas legadas e do seed).
  4. Se não achar, crie com `nome = nome do token ?? parte local do e-mail`, `fotoUrl = foto`, `aceitouTermosEm = null`. Se o e-mail existir sem verificação, responda `409 EMAIL_EM_USO`.
  5. Atualize `fotoUrl` quando vier diferente. Se `excluidoEm != null`, responda `401` "Conta excluída".
  6. Emita o JWT atual (`{ sub, papel, v }`), grave o cookie e retorne `me()`.
- **Verificador injetável.** Crie o provider `VERIFICADOR_FIREBASE` com a interface `VerificadorFirebase { verificar(idToken): Promise<DadosToken>; excluir(uid): Promise<void> }`.
  - A implementação real usa `firebase-admin`: `getAuth().verifyIdToken(idToken, true)` e `deleteUser`.
  - **Nos testes**, um `VerificadorFalso` aceita tokens no formato `teste:<uid>:<email>:<verificado>` e é usado no `overrideProvider`.
- **Foto do Google:** gravada no 1º acesso e atualizada quando o token traz uma URL diferente; um login sem foto (e-mail/senha) não apaga a foto existente.
- **`DELETE /me`**, numa transação:
  1. Apague os objetos de foto no storage e as `FotoProva` do usuário.
  2. Anonimize o `Usuario`: `nome = 'Participante removido'`, `email = removido+<id>@everest.invalid`, `firebaseUid = null`, `fotoUrl = null`, `senhaHash = null`, **todos os dados de cadastro e `aceitouMarketingEm` = null**, `excluidoEm = now()`, `tokenVersao + 1`.
  3. **Mantenha o `Participante` e os `DiaDesafio`.** Apagá-los liberaria o `vagaNumero` e quebraria a numeração `count + 1` da inscrição (decisão X4 e nova X5).
  4. Depois do commit, chame `verificador.excluir(uid)` e invalide os caches de ranking, feed e vagas.
  5. O ranking mostra "Participante removido".
- **Endpoints legados** `POST /auth/cadastro` e `POST /auth/login`:
  - Ficam ativos **só** com `AUTH_SENHA_LEGADO=true` (padrão `false`; responda 404 quando desligado).
  - Os e2e migram para `/auth/sessao` com o verificador falso. Quando todos passarem, deixe o legado ligado apenas para scripts de dev.
  - O argon2 continua instalado por enquanto.
- **Env da API** (validado com zod no boot):
  - `FIREBASE_PROJECT_ID` (obrigatório);
  - `FIREBASE_SERVICE_ACCOUNT_BASE64` (obrigatório em produção; é o JSON da conta de serviço em base64);
  - `FIREBASE_AUTH_EMULATOR_HOST` (opcional em dev; com ele, o admin SDK aceita tokens do emulador);
  - `AUTH_SENHA_LEGADO` (padrão `false`).
- **Seed:** o script `pnpm --filter api seed:firebase` cria no emulador os mesmos usuários do seed (`admin@`, `maria@`… com senha `everest-dev-123` e `emailVerified: true`), usando `firebase-admin` com `FIREBASE_AUTH_EMULATOR_HOST`.

### 4.4 Dados de cadastro e consentimento (R1.1: Q7, X9, X10, X11)

Coletados na `/bem-vindo` e **obrigatórios para garantir a vaga** (a inscrição responde `403 PERFIL_INCOMPLETO` sem eles). O consentimento de marketing é **separado e opcional**.

| Campo (`atualizarPerfilSchema`) | Regra | Guardado como | Mensagem de erro |
|---|---|---|---|
| `nome` | 2–80, **nome e sobrenome** | como digitado (trim) | Informe nome e sobrenome. |
| `instagram` | tira o `@`, minúsculo; 1–30 de `a-z 0-9 . _`, sem ponto no início/fim nem `..` | `maria.souza` | @ inválido. Use letras, números, "." ou "_". |
| `dataNascimento` | `YYYY-MM-DD` válida; **idade ≥ 18** (`IDADE_MINIMA`, X10) no fuso de SP; ≤ 120 anos | `@db.Date` | O desafio é para maiores de 18 anos. |
| `whatsapp` | celular/fixo BR com DDD (aceita `+55`, parênteses, traços) | só dígitos, sem +55: `11987654321` | WhatsApp inválido. Use DDD + número. |
| `bairro`, `cidade` | 2–80 | trim | Informe o bairro / a cidade. |
| `uf` | uma das 27 UFs (`UFS`) | maiúsculo | Escolha o estado. |
| `aceitouTermos` | `true` | `aceitouTermosEm` (mantém a 1ª data) | Aceite a política de privacidade para continuar. |
| `aceitouMarketing` | boolean **opcional** | `aceitouMarketingEm`: `true` grava a data do 1º consentimento; `false` revoga; **omitido mantém** | — |

- Helpers em `@everest/shared` (`regras/perfil.ts`): `UFS`, `IDADE_MINIMA`, `idadeEm`, `idadeHoje`, `ehDataValida`, `normalizarInstagram`, `ehInstagramValido`, `normalizarTelefone`, `ehNomeCompleto`. O front usa os mesmos para validar e formatar.
- O `PATCH /me` também serve para **editar** os dados depois (tela `/perfil`): o front reenvia tudo com `aceitouTermos: true`.
- Os dados de cadastro **não aparecem** no ranking, no feed nem em nenhuma rota de outro participante. Exportação para marketing (só de quem consentiu) fica para quando for pedida.

### 4.3 Testes novos (e2e)

- [ ] `POST /auth/sessao`:
  - com token de uid novo → cria usuário com `perfilCompleto: false` e grava o cookie;
  - repetir → não duplica;
  - e-mail verificado de um usuário do seed → vincula;
  - e-mail **não** verificado igual a um existente → `409 EMAIL_EM_USO`;
  - `authTime` antigo → 401.
- [ ] `PATCH /me` com `aceitouTermos: true` → `perfilCompleto: true`. Sem o aceite → `VALIDACAO`.
- [ ] `DELETE /me` → cookie limpo, `me` dá 401, o ranking mostra "Participante removido", a vaga continua ocupada e as fotos somem do MinIO.
- [ ] `GET /feed` → `fecharamHoje` bate com o seed; não inscrito e não admin → 403.
- [ ] Conferência:
  - aprovar dia concluído → `paraRevisar` diminui;
  - editar o dia depois → volta para revisão;
  - aprovar dia não concluído → erro.
- [ ] Todos os e2e antigos passando com a sessão via verificador falso.

---

## 5. Autenticação no front (Firebase)

### 5.1 Config e env do web

```
VITE_APP_URL=http://localhost:5173
VITE_FIREBASE_API_KEY=demo-key
VITE_FIREBASE_AUTH_DOMAIN=localhost
VITE_FIREBASE_PROJECT_ID=demo-everest
VITE_FIREBASE_APP_ID=demo-app
VITE_FIREBASE_EMULADOR=http://127.0.0.1:9099     # vazio em produção
```

- Tipe as variáveis em `src/vite-env.d.ts`.
- **Em produção, `VITE_FIREBASE_AUTH_DOMAIN` é o domínio do próprio app** (Q15), por causa do proxy da seção 5.4.

### 5.2 `src/lib/firebase.ts`: carregamento preguiçoso

```ts
import type { Auth } from 'firebase/auth';

let promessa: Promise<Auth> | null = null;

export function obterAuth(): Promise<Auth> {
  promessa ??= (async () => {
    const [{ initializeApp }, fa] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
    const app = initializeApp({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    });
    const auth = fa.initializeAuth(app, {
      persistence: fa.browserSessionPersistence,          // necessário para o redirect do iOS
      popupRedirectResolver: fa.browserPopupRedirectResolver,
    });
    auth.languageCode = 'pt-BR';
    const emu = import.meta.env.VITE_FIREBASE_EMULADOR;
    if (emu) fa.connectAuthEmulator(auth, emu, { disableWarnings: true });
    return auth;
  })();
  return promessa;
}
```

- Faça **prefetch** com `void obterAuth()` no `onPointerDown`/`onFocus` dos botões "Entrar" e "Entrar no desafio" da `/`, para o SDK já estar carregado quando a tela de auth abrir.
- **Orçamento:** o chunk do Firebase não pode entrar no bundle da rota `/`. Confira com `vite build` e reporte o tamanho dos chunks.

### 5.3 `src/features/auth/firebaseAuth.ts`

| Função | O que faz |
|---|---|
| `entrarComGoogle()` | Usa `GoogleAuthProvider` + `signInWithPopup`. **Se for iOS em modo standalone** (`navigator.standalone === true` ou `matchMedia('(display-mode: standalone)')` no iOS) ou se der `auth/popup-blocked`, usa `signInWithRedirect` |
| `concluirRedirect()` | Chama `getRedirectResult(auth)` no mount de `/entrar` e `/criar-conta`. Se houver usuário, segue para `trocarPorSessao` |
| `entrarComEmail(email, senha)` | `signInWithEmailAndPassword` |
| `criarContaComEmail(nome, email, senha)` | `createUserWithEmailAndPassword` + `updateProfile({ displayName: nome })` |
| `enviarRecuperacao(email)` | `sendPasswordResetEmail`. **Sempre** mostra a mesma confirmação, exista ou não a conta |
| `trocarPorSessao(user)` | `const idToken = await user.getIdToken(true)` → `POST /auth/sessao` → `limparDadosDeSessaoAnterior(qc)` → `qc.setQueryData(chaves.me, me)` → **`signOut(auth)`**. A sessão do app é o cookie, então o Firebase não guarda nada |

**Erros do Firebase em pt-BR** (`features/auth/errosFirebase.ts`):

| Código | Mensagem | Onde |
|---|---|---|
| `auth/invalid-credential`, `auth/wrong-password`, `auth/user-not-found` | E-mail ou senha incorretos. | alerta geral |
| `auth/invalid-email` | Informe um e-mail válido. | campo e-mail |
| `auth/email-already-in-use` | Este e-mail já tem conta. Entre com ele. | campo e-mail + link para `/entrar` |
| `auth/weak-password` | Use pelo menos 8 caracteres. | campo senha |
| `auth/account-exists-with-different-credential` | Esse e-mail já entrou de outro jeito. Use Google ou sua senha. | alerta |
| `auth/popup-closed-by-user`, `auth/cancelled-popup-request` | (silencioso) | — |
| `auth/popup-blocked` | (cai no redirect) | — |
| `auth/too-many-requests` | Muitas tentativas seguidas. Espere um minuto e tente de novo. | alerta |
| `auth/network-request-failed` | Sem conexão. Verifique sua internet. | alerta |
| outros | Algo deu errado. Tente novamente. | alerta |

**Validação local:** antes de chamar o Firebase, valide com zod usando `entrarSchema` (`email`, `senha` 8–72) e `criarContaSchema` (`nome`, `email`, `senha` 8–72, `aceitouTermos: true`), ambos em `@everest/shared`. **Todos** passam pela `/bem-vindo` para preencher os dados de cadastro (seção 4.4); quem criou conta por e-mail chega lá com o nome preenchido e o aceite já marcado.

### 5.4 Fluxos

1. **E-mail, conta nova** (`/criar-conta`):
   1. valida;
   2. `criarContaComEmail`;
   3. `trocarPorSessao`;
   4. navega para `/bem-vindo` (preservando `acao`/`volta`), com o nome e o aceite pré-preenchidos.
2. **E-mail, login** (`/entrar`): `entrarComEmail`, depois `trocarPorSessao`. A partir daí, `usePosAutenticacao` decide:
   - perfil incompleto → `/bem-vindo`;
   - `acao=inscrever` → inscreve e vai para `/bem-vindo?etapa=vaga`;
   - `volta` → volta;
   - inscrito → `/desafio`;
   - não inscrito → `/`.
3. **Google** (nas duas telas): `entrarComGoogle`, depois `trocarPorSessao`. No primeiro acesso, `perfilCompleto` é falso → `/bem-vindo`.
4. **`/bem-vindo`:**
   1. mostra avatar (foto ou iniciais) e "Boas-vindas, {primeiro nome}";
   2. campo "Nome completo" com prévia ao vivo `nomeExibicao(nome)` ("Os outros participantes veem: Maria L.");
   3. campos de cadastro (seção 4.4): "@ do Instagram" (prefixo `@` fixo), "Data de nascimento" (`type="date"`), "WhatsApp" (`type="tel"`, `inputMode="tel"`, máscara `(11) 98765-4321`), "Bairro", "Cidade" e "Estado" (`<select>` com as 27 UFs), com `autocomplete` adequado (`bday`, `tel-national`, `address-level3`, `address-level2`, `address-level1`);
   4. checkbox de aceite (obrigatório) e, **separado**, o checkbox opcional de marketing (desmarcado por padrão);
   5. botão **"Garantir minha vaga"** → `PATCH /me` → `POST /inscricao` → revelação animada do número da vaga ("Nº 37 de 50 vagas") → "Ir para o desafio".
   - Se as vagas acabaram (`VAGAS_ESGOTADAS`), mostra a mensagem e o botão "Voltar ao início", e a pessoa fica logada.
   - Com `?etapa=vaga`, pula direto para a revelação.
5. **Logout** (`/perfil`): `POST /auth/logout`, depois a limpeza atual. Não precisa chamar `signOut` do Firebase, que já foi feito na troca.
6. **Excluir conta** (`/perfil`): folha de confirmação → `DELETE /me` → limpeza igual à do logout → `/` com toast "Conta excluída.".

### 5.5 Produção (Fase R12)

- **Firebase Console:** ative os provedores **Google** e **E-mail/senha**. Ative a **proteção contra enumeração de e-mail**. Coloque os modelos de e-mail em pt-BR. Em domínios autorizados, inclua o domínio do app (Q15).
- **Proxy do `authDomain`**, para o redirect do iOS funcionar com o particionamento de storage do Safari. Em `apps/web/vercel.json`, antes do rewrite do SPA:
  ```json
  { "source": "/__/auth/:path*", "destination": "https://<FIREBASE_PROJECT_ID>.firebaseapp.com/__/auth/:path*" }
  ```
  e mude o fallback do SPA para `"/((?!api/|__/).*)"`.
- **Google Cloud → Credenciais → cliente OAuth do Firebase:** adicione `https://<DOMINIO>/__/auth/handler` em "URIs de redirecionamento autorizados".
- **Sem COOP restritivo no web.** Se um dia houver `Cross-Origin-Opener-Policy`, use `same-origin-allow-popups`, porque o popup do Google precisa disso.
- **Conta de serviço:** gere a chave da conta de serviço do Firebase e grave em `FIREBASE_SERVICE_ACCOUNT_BASE64` na API (nunca no repositório).

---

## 6. Tema, tokens e tipografia

### 6.1 Como o tema funciona

- A preferência fica em `localStorage['everest-tema']`, com o valor `'claro' | 'escuro' | 'sistema'` (padrão `'sistema'`; ver X7).
- O valor **resolvido** vai em `<html data-tema="claro|escuro">`, e a preferência, em `data-tema-pref`.
- **Script inline no `<head>` do `index.html`**, antes de qualquer CSS, para não piscar:
  ```html
  <script>
    (function () {
      try {
        var p = localStorage.getItem('everest-tema') || 'sistema';
        var e = p === 'escuro' || (p === 'sistema' && matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.dataset.tema = e ? 'escuro' : 'claro';
        document.documentElement.dataset.temaPref = p;
      } catch (_) { document.documentElement.dataset.tema = 'escuro'; }
    })();
  </script>
  ```
- **`src/lib/tema.ts`** expõe `useTema(): { preferencia, resolvido, definir(p) }`:
  - grava no `localStorage` (com try/catch);
  - atualiza `data-tema` e `data-tema-pref`;
  - com `'sistema'`, escuta `matchMedia(...).addEventListener('change')`;
  - atualiza `<meta name="theme-color">` para o valor de `--fundo`.
- **Troca suave:** em `definir`, se houver `document.startViewTransition` e não houver reduced motion, troque o tema dentro de `startViewTransition` (crossfade de 300 ms). Sem suporte, troque direto.
- **Manifest do PWA:** `theme_color` e `background_color` continuam `#000000` (splash da marca).

### 6.2 Tokens (`src/styles/index.css`, Tailwind v4)

Os nomes atuais foram mantidos (`fundo`, `superficie`…) para não quebrar as classes existentes. Os novos são `laranja`, `sobre-vermelho` e `pop-*`.

```css
@import 'tailwindcss';
@import '@fontsource-variable/onest';
@import '@fontsource/big-shoulders-display/700.css';
@import '@fontsource/big-shoulders-display/800.css';
@import '@fontsource/big-shoulders-display/900.css';

@custom-variant escuro (&:where([data-tema='escuro'], [data-tema='escuro'] *));

@theme inline {
  --color-fundo: var(--fundo);
  --color-superficie: var(--superficie);
  --color-superficie-2: var(--superficie-2);
  --color-borda: var(--borda);
  --color-texto: var(--texto);
  --color-texto-2: var(--texto-2);
  --color-vermelho: var(--vermelho);
  --color-vermelho-texto: var(--vermelho-texto);
  --color-laranja: var(--laranja);
  --color-sobre-vermelho: var(--sobre-vermelho);
  --color-pop: var(--pop);
  --color-pop-texto: var(--pop-texto);
  --color-pop-texto-2: var(--pop-texto-2);
  --color-pop-trilho: var(--pop-trilho);
  --color-sucesso: var(--sucesso);
  --font-sans: 'Onest Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-display: 'Big Shoulders Display', 'Arial Narrow', Impact, sans-serif;
  --ease-saida: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ease-mola: cubic-bezier(0.3, 0.7, 0.4, 1.5);
}

:root {                       /* CLARO */
  --fundo: #f7f6f6; --superficie: #ffffff; --superficie-2: #efecec; --borda: #e1dcdc;
  --texto: #141111; --texto-2: #5e5757;
  --vermelho: #dc2626; --vermelho-texto: #c21d1d; --laranja: #f97316; --sobre-vermelho: #ffffff;
  --pop: #141111; --pop-texto: #ffffff; --pop-texto-2: #b8b0b0; --pop-trilho: #3a3131;
  --sucesso: #15803d;
  color-scheme: light;
}
:root[data-tema='escuro'] {   /* ESCURO */
  --fundo: #000000; --superficie: #110e0e; --superficie-2: #1e1919; --borda: #2d2626;
  --texto: #ffffff; --texto-2: #a9a1a1;
  --vermelho: #dc2626; --vermelho-texto: #f05252; --laranja: #fb7a2d; --sobre-vermelho: #ffffff;
  --pop: #f4f1f1; --pop-texto: #141111; --pop-texto-2: #5e5757; --pop-trilho: #dcd5d5;
  --sucesso: #22c55e;
  color-scheme: dark;
}
```

**Regras de cor**, com o contraste conferido:

| Uso | Token | Contraste |
|---|---|---|
| Fundo de botão primário, dia concluído, switch ligado, barras, títulos ≥ 24 px | `vermelho` (`#dc2626`) | branco sobre ele: 4,8:1 ✅ |
| Texto vermelho pequeno, foco e erro | `vermelho-texto` | claro `#c21d1d` sobre branco: 6,0:1 ✅; escuro `#f05252` sobre preto: 6,0:1 ✅ |
| Cards "pop", invertidos em relação ao tema (faixa dos dias, cards de atividade, "Sua posição") | `pop`, `pop-texto`, `pop-texto-2`, `pop-trilho` | ✅ nos dois temas |
| Gradiente da marca (borda do botão principal de auth, linha ondulada, barras de progresso) | `vermelho` → `laranja` | decorativo |
| Neutros | levemente quentes, puxados para o vermelho | — |

- **Nunca** escreva hex nos componentes. Use só classes de token.
- Os estados semânticos atuais (`red-950`, `amber-*`, `green-*`) precisam funcionar nos dois temas. Troque cada um por um par `bg-amber-100 text-amber-900 escuro:bg-amber-950 escuro:text-amber-100` (e o equivalente para os outros), ou crie tokens `--aviso*` e `--erro*`.

### 6.3 Tipografia

| Papel | Classes | Exemplo |
|---|---|---|
| Hero da Entrada | `font-display font-black uppercase leading-[0.88] text-[min(76px,18vw)]` | "A SUA MELHOR VERSÃO" (VERSÃO em `text-vermelho`) |
| Título de auth | `font-display font-black uppercase text-[64px] leading-[0.9] text-center` | "ENTRAR" |
| h1 de página | `font-display font-black uppercase text-[38px] leading-[0.9]` | "PROGRESSO", "BORA, MARINA." |
| Números grandes | `font-display font-extrabold tabular-nums` (52–64 px) | "4.129 m", "37" |
| Eyebrow | utilitário `rotulo` (atualizar: `text-[11px] font-semibold uppercase tracking-[0.16em] text-texto-2`) | "DIA 17 DE 30 · QUA, 19/11" |
| Texto | `font-sans text-[15px] leading-normal` | — |
| Botão | `font-sans font-semibold text-base` (**sem caixa alta**; o v2 abandona o `uppercase` dos botões) | "Fazer check-in de hoje" |

- O `font-display` só entra em títulos e números, nunca em texto corrido.
- Use `text-wrap: balance` nos títulos.

### 6.4 Formas e espaçamento

| Elemento | Raio | Observação |
|---|---|---|
| Botões, inputs, chips de status, tab bar | `rounded-full` | altura 54 px (grande) ou 42 px (pequeno) |
| Cards grandes (destaque, atividade, faixa, "Seu dia") | `rounded-[28px]`–`rounded-[30px]` | — |
| Cards de requisito, listas, folhas | `rounded-3xl` (24 px) | Folha: `rounded-t-[30px]` |
| Células do grid 30 | `rounded-xl` | — |
| Chips da faixa de dias | `rounded-[18px]`, 46×62 px | — |

- Padding horizontal da tela: 20 px.
- Gap vertical entre blocos: 16 px.
- Conteúdo em `max-w-md mx-auto`.
- Borda de card: `shadow-[inset_0_0_0_1px_var(--borda)]`, não `border`, para não somar ao box.

---

## 7. Movimento

### 7.1 Princípios

- **Uma técnica principal:** a **View Transitions API** para toda troca de rota e para o container transform. O resto é CSS (`transition`/`@keyframes`) mais um hook pequeno para os contadores.
- **Sem lib de animação.** Isso protege o orçamento de bundle da rota `/`.
- **Fallback:** sem `document.startViewTransition` (navegadores antigos), a navegação é instantânea. Nada quebra.
- **`prefers-reduced-motion: reduce`:** sem View Transitions, sem cascata, sem contador animado (mostra o valor final) e sem mola. Mantém só fades de no máximo 150 ms. O bloco global de reduced motion que já existe continua.

### 7.2 Tabela de especificação

| Interação | Duração | Easing | Implementação |
|---|---|---|---|
| Toque em botão ou card | 220 ms | `--ease-mola` | utilitário `press`: `transition-transform active:scale-[0.965]` |
| Toque em chip de dia | 220 ms | `--ease-mola` | `active:scale-[0.92]` |
| Troca de aba (tabs) | 220 ms | `ease-out` | View Transition padrão (`root`): o antigo sai com fade e o novo entra com fade + `translateY(10px → 0)` |
| Avançar (push) | novo: 320 ms; antigo: 170 ms | `--ease-saida` | `html[data-nav='avancar']`: o novo vem de `translateX(30px)` e o antigo vai para `translateX(-18px)` com fade |
| Voltar | igual, invertido | `--ease-saida` | `html[data-nav='voltar']` |
| **Container transform** (card → tela) | 440 ms | `--ease-saida` | `view-transition-name` compartilhado (seção 7.3) |
| Entrada em cascata | 440 ms; delay `70 + i×40` ms | `--ease-saida` | utilitário `surgir` com `animation-delay: calc(70ms + var(--i) * 40ms)`; de `opacity:0; translateY(14px)` para o normal; `fill-mode: backwards`. **Só no primeiro mount da página**, não em refetch |
| Contadores (vagas, altitude, %, dias) | 800 ms | ease-out cúbico | hook `useContador(valor)` com `requestAnimationFrame`; só anima na primeira exibição |
| Barras de progresso | 600 ms | `--ease-saida` | `transition: width`; começa em 0 no mount |
| Indicador da tab bar | 420 ms | `cubic-bezier(.3,.8,.3,1.15)` | pílula vermelha absoluta; `translateX` + `width` medidos no botão ativo |
| Switch | 300 ms | `cubic-bezier(.3,.8,.3,1.3)` | `translateX(20px)` do botão |
| Folha (bottom sheet) | entrada: 420 ms; saída: 260 ms | `cubic-bezier(.2,.9,.25,1)` / `ease-in` | `@keyframes` com `translateY(100% → 0)`; véu com fade de 240 ms |
| Toast | 260 ms | `--ease-saida` | do topo, `translateY(-10px → 0)`; some depois de 2,4 s |
| Banner "Dia concluído" | check: 600 ms com 150 ms de delay; banner: 420 ms | `--ease-saida` | `stroke-dashoffset 30 → 0`; banner com `scale(.96) → 1` |
| Montanha (Progresso) | 1200 ms com 200 ms de delay | ease-out cúbico | `stroke-dasharray` do trecho vermelho + marcador por `getPointAtLength` |
| Revelação da vaga | 520 ms | `cubic-bezier(.2,1.2,.3,1)` | `scale(.92) → 1` + contador até o número |
| Foto adicionada | 450 ms | `--ease-saida` | `scale(1.08) → 1` + fade |
| Dia futuro tocado | 300 ms | linear | `shake` horizontal de 4 px + toast "O dia N abre amanhã/em X dias, à meia-noite." |

### 7.3 Container transform com View Transitions

O objetivo é que o card "Seu dia", os chips da faixa e o CTA "Fazer check-in" se expandam e virem a tela `/desafio/dia/:n`. O card preto de atividade se expande e vira `/ranking`.

```ts
// src/lib/transicoes.ts
export type Direcao = 'avancar' | 'voltar' | 'aba';

export function marcarDirecao(d: Direcao) {
  document.documentElement.dataset.nav = d;
}

/** Dá o nome de transição ao elemento clicado e navega com viewTransition. */
export function abrirComTransformacao(el: HTMLElement, nome: string, navegar: () => void) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return navegar();
  el.style.viewTransitionName = nome;            // só UM elemento com esse nome por vez
  marcarDirecao('avancar');
  navegar();                                     // navigate(to, { viewTransition: true, state: { vt: nome } })
  // limpe depois que a transição terminar (o elemento já saiu da tela)
}
```

- **Na página de destino**, o contêiner raiz recebe `style={{ viewTransitionName: location.state?.vt }}` **apenas** quando `state.vt` existe.
- **Nomes usados:** `abrir-dia` e `abrir-ranking`.
- **Navegações normais:** use `<Link viewTransition>` ou `navigate(to, { viewTransition: true })` em todas, com `marcarDirecao` antes. A tab bar usa `'aba'`, o botão voltar usa `'voltar'` e os links que aprofundam usam `'avancar'`.
- **A tab bar fica fora da transição:** dê a ela `view-transition-name: tabbar` para que não pisque.
- **CSS:**
  ```css
  ::view-transition-group(*) { animation-duration: 440ms; animation-timing-function: var(--ease-saida); }
  ::view-transition-old(root) { animation: 170ms ease-in both sair; }
  ::view-transition-new(root) { animation: 320ms var(--ease-saida) both entrar-baixo; }
  html[data-nav='avancar']::view-transition-old(root) { animation-name: sair-esquerda; }
  html[data-nav='avancar']::view-transition-new(root) { animation-name: entrar-direita; }
  html[data-nav='voltar']::view-transition-old(root) { animation-name: sair-direita; }
  html[data-nav='voltar']::view-transition-new(root) { animation-name: entrar-esquerda; }
  @media (prefers-reduced-motion: reduce) { ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; } }
  ```
- **Suspense e lazy:** a página de destino é lazy. Para a transição capturar o estado novo já pronto, faça **prefetch do chunk** (`import('../pages/Dia')`) no `onPointerDown` do card, e mantenha o `<Suspense>` do `AppShell`. Se o chunk ainda não chegou, a transição mostra o fallback, o que é aceitável.

---

## 8. Componentes novos e alterados

### 8.1 UI genérica (`src/components/ui/`)

| Componente | Props | Notas |
|---|---|---|
| `Botao` (alterar) | adicionar a variante `'gradiente'` (borda 2 px vermelho→laranja, fundo `fundo`) e `'google'` (fundo `superficie`, borda `borda`); tamanho `'md' \| 'sm'` | `rounded-full`; altura 54/42; sem caixa alta; mantém `carregando` (spinner no lugar do conteúdo, mesma largura) |
| `CampoTexto` (alterar) | inalterado | visual em pílula: `h-[54px] rounded-full bg-superficie-2 px-[22px]`; label centralizada **nas telas de auth** (`alinhamento='centro'`) e à esquerda nas demais; borda vermelha no foco e no erro |
| `Avatar` (novo) | `{ nome; fotoUrl?: string \| null; tamanho?: 'sm' \| 'md' \| 'xl' }` | Foto com `referrerPolicy="no-referrer"` (fotos do Google) e `alt=""`. Sem foto: iniciais sobre uma cor determinística a partir do nome (8 cores; branco por cima) |
| `PilhaAvatares` (novo) | `{ pessoas; max = 4 }` | Sobreposição de −8 px com anel `pop` |
| `Contador` (novo) | `{ valor: number; formato?: Intl.NumberFormat }` | Usa `useContador`; `aria-live` fica no contêiner pai quando fizer sentido |
| `FolhaInferior` (novo) | `{ aberta; aoFechar; titulo; children }` | `role="dialog"` com `aria-modal`, foco no primeiro botão, Esc e toque no véu fecham, focus trap simples, devolve o foco ao gatilho |
| `Toast` + `ToastProvider` + `useToast()` (novo) | `toast(texto)` | `role="status"`, um por vez. **Unifique** com os toasts do `PwaGlobais` (atualização e offline) |
| `Segmentado` (novo) | `{ opcoes; valor; aoMudar; rotulo }` | `role="group"` com botões `aria-pressed`; usado no seletor de tema e no "iPhone / Android" |
| `Interruptor` (mover para `ui/`) | inalterado | visual do protótipo: trilho 52×32, botão branco 26 px com mola |
| `Barra` (substitui `BarraProgresso`) | `{ valor; maximo; rotulo; tom?: 'normal' \| 'pop' }` | preenchimento em gradiente vermelho→laranja; anima a largura |

### 8.2 Layout (`src/components/layout/`)

- **`AppShell` (alterar):**
  - Remove o header fixo atual. **Cada página tem o seu topo**, como no protótipo: eyebrow + h1, e o botão "voltar" circular quando não é aba.
  - Mantém o `Suspense`, o banner de offline (um só) e o `Watermark`.
  - O padding inferior depende de a tab bar estar visível.
- **`BarraAbas` (substitui `BottomNav`):**
  - Pílula flutuante: `left/right 14 px`, `bottom 14 px + safe-area`, altura 64 px, fundo `superficie`, sombra.
  - Indicador vermelho animado (seção 7.2) e itens com ícone + rótulo de 11 px.
  - **Abas:** Desafio (`Flag`), Progresso (`ChartLine`), Ranking (`Trophy`), Perfil (`User`).
  - Some com `translateY(120%)` nas rotas sem abas.
- **`BotaoVoltar`:** círculo de 44 px, `aria-label="Voltar"`. Usa `navigate(-1)` se houver histórico interno; senão vai para a rota pai.
- **`Watermark`:** inalterado; a cor segue o `texto` com 5% de opacidade.

### 8.3 Domínio (`src/features/...`)

| Componente | Onde | Descrição |
|---|---|---|
| `TelaAuth` | `features/auth/` | Layout das telas 2–4: linha superior (voltar + link alternativo "Criar conta"/"Entrar"), título grande, a **linha ondulada** SVG (`viewBox 0 0 390 190`, path `M-10 150 C 70 92 120 196 205 152 S 330 52 400 74`, stroke 2,5 com gradiente vermelho→laranja via `style="stop-color:var(--vermelho)"`) atrás do título, e os slots de formulário e Google |
| `BotaoGoogle` | `features/auth/` | "Continuar com Google" com o logo G oficial (SVG de 4 cores, conforme as diretrizes de marca do Google) |
| `FaixaDias` | `features/desafio/` | Card `pop`, `rounded-[30px]`. Cabeçalho "SUA JORNADA" / "N DE 30 CONCLUÍDOS". Scroll horizontal com `scroll-snap` e **auto-scroll centralizando o dia atual** no mount. Os chips seguem a seção 8.4. Um chip futuro chama `shake` + toast; um passado ou atual chama `abrirComTransformacao(el, 'abrir-dia', …)` |
| `CarrosselDestaque` | `features/desafio/` | Dois cards de 100% de largura com `scroll-snap-type: x mandatory` e pontos indicadores (o ativo vira uma pílula de 18 px). Card 1 = `CardEscalada`, card 2 = `CardStoryDoDia` |
| `CardEscalada` | `features/desafio/` | Fundo `vermelho`. Eyebrow "SUA ESCALADA", altitude `Contador` em `font-display` 48 px + " M", "de 8.848 m até o cume · N dias concluídos" e o prêmio com ícone de troféu. Uma mini-montanha SVG no canto com o trilho percorrido e o ponto na posição `dias/30` |
| `CardStoryDoDia` | `features/desafio/` | Borda em gradiente. "Poste um story marcando **@{handle}** e usando **#{hashtag}**" (vindos do `DesafioAtual`). Botões "Copiar @ e hashtag" (clipboard com fallback) e "Marcar como postado"/"Postado". O segundo dispara o mesmo `useCheckin` do dia atual (`storyPostado`) |
| `CardSeuDia` | `features/desafio/` | `superficie`, `rounded-[28px]`. "HOJE · DIA N", "k de 5", barra de 5 segmentos e tags do que falta ("Água 1.500/3.000 ml", "Leitura 6/10 pág.", "Fotos 0/3", "Story") ou "Dia concluído". Botão redondo vermelho com seta. Abre `abrir-dia` |
| `CardsAtividade` | `features/desafio/` | Grid de 2 cards `pop`. (a) `Contador fecharamHoje` + "pessoas fecharam o dia hoje" + `PilhaAvatares` + "maior sequência: N dias" + botão redondo; abre `abrir-ranking`. (b) `vagasOcupadas` + "de 50 vagas preenchidas" + barra `pop` + "N vagas restantes" |
| `CtaFixo` | `features/desafio/` | Botão primário fixo acima da tab bar com degradê do fundo para transparente: "Fazer check-in de hoje" ou "Ver check-in de hoje" |
| `Montanha` | `features/progresso/` | SVG `viewBox 0 0 320 222`. Cume no ponto `(300,20)` com bandeira vermelha. Crista tracejada em `borda`, trecho percorrido em `vermelho` (stroke 4), marcador com halo. Acampamentos em 0/25/50/75/100% ("Base", "C1", "C2", "C3", "Cume"). Path da crista: `M10 200 L50 168 L78 178 L118 128 L146 140 L186 94 L210 104 L244 58 L266 70 L300 20`. `role="img"` com `aria-label` "Você está a X metros, N de 30 dias concluídos" |
| `BannerDiaConcluido` | `features/checkin/` | Fundo `vermelho`, check SVG desenhado, "Dia concluído" + "Mais 295 m na sua escalada." Aparece só quando `dia.concluido && pendentes.length === 0` (regra atual) e anima **apenas** na transição de não concluído para concluído |
| `CardRequisito` (alterar) | `features/checkin/` | Ícone em "bolha" de 42 px (`superficie-2`, ícone `vermelho-texto`), título + meta, e um selo à direita: "Feito" (pílula vermelha com check) ou o texto do que falta. Cumprido = anel interno de 1,5 px `vermelho` |
| `CardAgua` | `features/checkin/` | Número grande `x / 3.000 ml`, barra e botões "−250", "+250 ml", "+500 ml" e **"Bati 3 L"** (primário) |
| `CardLeitura` | `features/checkin/` | Stepper com − e `output` grande `/ 10 páginas`, mais os botões +1 e +5 |
| `CardFotos` / `SlotFoto` | `features/fotos/` | Grid de 3 slots com proporção 3:4 e `rounded-[18px]`. Vazio: borda tracejada, ícone, rótulo e "Adicionar foto". Cheio: imagem, selo "✓ Água" e botão × para remover. Enviando: selo com spinner "Enviando" e a porcentagem do XHR. Rejeitada: selo vermelho "Foto recusada · trocar" |
| `CardStory` | `features/checkin/` | Linha copiável "@handle #HASHTAG" + botão Copiar, mais o switch "Postei o story de hoje" |
| `PainelDiaAdmin` (alterar) | `features/admin/` | Pílula de status (Conferido / Aguardando conferência / Invalidado / Incompleto / Em andamento), fotos em tamanho cheio, `dl` com os valores e as ações: Aprovar + Invalidar (aguardando), Invalidar (conferido), Revalidar com o motivo exibido (invalidado). O formulário de invalidação é inline, com textarea e motivo obrigatório (5 caracteres no mínimo) |

### 8.4 Estados visuais dos dias

| Situação | Chip da faixa | Célula do grid |
|---|---|---|
| `CONCLUIDO` | fundo `vermelho`, texto `sobre-vermelho`, check em cima | fundo `vermelho` |
| `HOJE` (não concluído) | anel interno de 2 px `vermelho`, "HOJE" em cima | anel de 2 px `vermelho` |
| `HOJE` concluído | vermelho + anel `pop-texto` | vermelho + anel |
| `NAO_CONCLUIDO` | texto `pop-texto-2`, "×" em cima | `superficie-2` / `texto-2` |
| `INVALIDADO` | texto `vermelho-texto` + ícone de alerta | anel de 1,5 px `vermelho-texto` |
| `FUTURO` | 40% de opacidade, sem ação de abrir | 45% de opacidade |
| `AGUARDANDO_CONFERENCIA` (só admin) | — | vermelho + ponto `laranja` no canto |

---

## 9. Especificação por tela

> O protótipo é a fonte da verdade visual. Aqui fica o que o protótipo **não** mostra: dados reais, estados e regras.

### 9.1 `/` Entrada
- **Topo:** marca (logo + "EVEREST", tracking largo) e o link "Entrar" à direita (ou "Ir para o desafio" se estiver inscrito).
- **Arte:** montanha SVG de 150 px (três camadas de serra + pico com neve + trilha tracejada vermelha + bandeira).
- **Textos:** eyebrow "DESAFIO 30 DIAS · INÍCIO dd/mm", hero e lede.
- **Card de vagas:** `Contador vagasDisponiveis` + "vagas restantes", barra e "X de 50 vagas preenchidas". Recarrega a cada 30 s (como hoje).
- **Ações:** CTA conforme o estado (a lógica do `AcaoPrincipal` atual continua), "Baixar o app" (secundário, abre a folha de instalação) e o link "Ver as regras".
- **Estados:** carregando (skeleton do card), esgotado (botão desabilitado "Vagas esgotadas" + texto), inscrições fechadas, encerrado e erro com "Tentar de novo".
- **Sem Firebase no bundle desta rota.**

### 9.2 `/entrar`, `/criar-conta`, `/recuperar-senha`
- Seguem o layout `TelaAuth` e os campos do protótipo.
- **Em `/entrar`:** a ordem é formulário → "Esqueci a senha" → botão gradiente "Entrar" → divisor "ou entre com" → Google.
- **Em `/criar-conta`:** o Google vem **primeiro**, depois o divisor "ou com e-mail", o formulário com aceite e o botão "Criar conta".
- **`?acao=inscrever`** muda o título auxiliar para "Passo 1 de 2" (como hoje).
- **Foco:** vai para o primeiro campo com `aria-invalid` depois da validação.
- **Recuperar:** troca o formulário pelo card de confirmação "Confira seu e-mail" (texto neutro) e o botão "Voltar para o login".

### 9.3 `/bem-vindo`
Segue a seção 5.4, item 4, e os campos da seção 4.4. **Diferença do protótipo:** o protótipo só tem nome e aceite; os campos de cadastro entram entre eles, no mesmo estilo de `CampoTexto` em pílula (label à esquerda), e o formulário rola dentro da tela. Também precisa de:
- skeleton enquanto o `me` carrega;
- erro de `PATCH` em alerta;
- `VAGAS_ESGOTADAS` com a mensagem e o botão para a `/`;
- quem já é inscrito e tem perfil completo é redirecionado para `/desafio`;
- quem já é inscrito mas tem perfil incompleto (dados novos da R1.1) preenche e volta para `/desafio` sem nova inscrição;
- erros por campo vindos do servidor (`campos`) aparecem no campo certo; `PERFIL_INCOMPLETO` na inscrição volta o foco ao 1º campo vazio.

### 9.4 `/desafio` (home)
- **Topo:** eyebrow "DIA {diaAtual} DE 30 · {dia da semana}, {dd/mm}", h1 "BORA, {PRIMEIRO NOME}." e o `Avatar` à direita (link para `/perfil`).
- **Blocos, em ordem:** `FaixaDias`, `CarrosselDestaque`, seção "SEU DIA" (`CardSeuDia`), seção "ATIVIDADE" (`CardsAtividade`), link "Regras do desafio" e `CtaFixo`.
- **Desafio `NAO_INICIADO`:**
  - a faixa mostra os 30 dias como futuros;
  - o card "Seu dia" vira a contagem regressiva ("Começa em N dias · dd/mm");
  - o CTA fica oculto;
  - reaproveite o conteúdo de `TelaAntesInicio`.
- **Desafio `ENCERRADO`:**
  - o card "Seu dia" vira o resumo final (dias, altitude final e posição);
  - o CTA "Ver ranking final" leva ao `/ranking`;
  - reaproveite o conteúdo de `TelaEncerrado`.
- **Dados:**
  - `meu-progresso` dá a faixa, a altitude e o "Seu dia" (as tags vêm do `dia` atual, via `useDia(slug, diaAtual)`);
  - `feed` dá a atividade;
  - `desafioAtual` dá o handle e a hashtag.

### 9.5 `/desafio/dia/:n` (check-in)
- **Cabeçalho:** `BotaoVoltar` → `/desafio`; eyebrow "HOJE · qua, 19/11" ou "DIA ENCERRADO"; h1 "DIA N"; e o `IndicadorSalvamento` à direita ("Salvando…" com spinner, "Salvo" com check, "Sem conexão", "Erro · tentar de novo").
- **Dia não editável:** aviso com cadeado: "Só o dia de hoje pode ser editado. Este dia ficou concluído/incompleto." Todos os controles ficam desabilitados, e as fotos aparecem sem o botão de remover.
- **Card resumo:** "k de 5 requisitos", "fecha às 23:59" e a barra de 5 segmentos, com o `BannerDiaConcluido` dentro.
- **Cards na ordem:** Água, Exercício, Leitura, Prova do dia e Story.
- **Comportamento:** o `useCheckin`, o upload e o polling atuais continuam como estão; só o visual muda.
- **Dia invalidado:** alerta no topo com o motivo do embaixador.

### 9.6 `/progresso`
- Topo "DIA N DE 30" / "PROGRESSO".
- Card da montanha: `Contador` da altitude + "m" e "cume a 8.848 m", a `Montanha` e a legenda "Cada dia concluído sobe 295 m. Dia perdido não desce, só não sobe."
- 4 tiles em grid 2×2: dias concluídos `x/30`, evolução `%`, melhor sequência e sequência atual (com chama).
- Card "Os 30 dias": `GridDias` restyle, com legenda. Tocar num dia passado ou no atual navega para `/desafio/dia/N`.

### 9.7 `/ranking`
- Topo "{N} PARTICIPANTES · DIA N" / "RANKING".
- Card `pop` "Sua posição": número gigante com "º" sobrescrito e a frase explicativa:
  - empate → "Empatada com X em dias; você passa na {critério}.";
  - senão → "{X} está N dias à frente.";
  - 1º lugar → "Você lidera o desafio."
- Lista de linhas `rounded-[20px]`: posição (`font-display`, em `vermelho-texto` no top 3), `Avatar`, nome (ou "Você"), selo "Embaixador", "melhor sequência N · atual N" e dias à direita. A sua linha leva anel vermelho de 2 px. Faça `scrollIntoView` da sua linha, como hoje.
- Rodapé com o critério de desempate.

### 9.8 `/regras`
- Seções "TODOS OS DIAS" (5 regras com bolha de ícone) e "VAGAS E PRÊMIO" (vagas, prêmio, desempate e conferência). Os textos vêm de `content/regras.ts`, que deve ser atualizado com os textos do protótipo.
- O handle e a hashtag são dinâmicos.
- O CTA "Quero participar" continua para quem não é inscrito.

### 9.9 `/perfil`
- **Cabeçalho:** `Avatar xl`, nome, e-mail e a tag "Vaga nº N · inscrita em dd/mm" (só para inscritos).
- **Card "Meus dados":** os campos da seção 4.4 editáveis (o mesmo formulário da `/bem-vindo`, botão "Salvar") e o switch **"Receber novidades e ofertas da Everest"** (consentimento de marketing; desligar revoga na hora).
- **Card "Aparência":** `Segmentado` Claro / Escuro / Sistema + a nota "Sistema segue o modo do seu celular.".
- **Lista:** Instalar o app (folha), Regras, Política de privacidade e Painel do embaixador (só ADMIN).
- **Lista de conta:** Sair e "Excluir minha conta" (em `vermelho-texto`, abre a folha de confirmação).

### 9.10 `/privacidade`
- Mantém `content/privacidade.ts`, com o texto atualizado conforme o protótipo. O protótipo menciona: a foto do Google, os dados escondidos removidos das imagens, quem vê o quê, a retenção de 90 dias após o fim e o caminho para excluir a conta.
- O aviso "Rascunho (Q8)" continua até o Anderson aprovar o texto.
- **R1.1:** o texto precisa listar os dados de cadastro (seção 4.4), a finalidade de cada um, o uso para marketing **só com consentimento** (e como revogar no Perfil) e a idade mínima de 18 anos.

### 9.11 `/admin`
- **Topo:** voltar → `/perfil` (ou `/desafio`), "EMBAIXADOR" / "PAINEL".
- **3 tiles:** vagas `x/50`, "fecharam hoje" (do feed) e "para revisar" (`totalParaRevisar`, em `vermelho-texto`).
- **Switch de inscrições** no estilo `toggle-row`, mantendo a confirmação atual ao fechar.
- **Busca** (mantém a busca sem acento + `useDeferredValue`) e a lista com `Avatar`, nome completo, "Vaga nº N · N dias concluídos" e a pílula laranja "N para revisar".
- **Ordem da lista:** quem tem mais itens para revisar primeiro; depois, a ordem do ranking.

### 9.12 `/admin/participantes/:id`
- Topo com nome e "Vaga nº N · N dias".
- Card "Dias" com o grid 30 clicável (`?dia=N` como hoje) e a legenda (aguardando conferência, invalidado).
- Abre por padrão no **último dia aguardando conferência** e, se não houver, no último dia passado.
- O `PainelDiaAdmin` segue a seção 8.3.

---

## 10. Textos (pt-BR)

Use estes textos exatamente. Eles já estão no protótipo.

| Onde | Texto |
|---|---|
| Entrada, hero | A SUA / MELHOR / **VERSÃO** |
| Entrada, lede | Construindo a sua melhor versão para 2027. Água, treino, leitura, prova do dia e story, todos os dias, por 30 dias. |
| Auth, divisor | ou entre com · ou com e-mail |
| Auth, aceite | Li e aceito a política de privacidade, incluindo o uso das minhas fotos de prova. |
| Bem-vindo, marketing (opcional) | Quero receber novidades e ofertas da Everest por e-mail, WhatsApp e Instagram. Posso desistir quando quiser no meu perfil. |
| Bem-vindo, idade | O desafio é para maiores de 18 anos. |
| Bem-vindo, por que pedimos | Usamos esses dados para conferir sua participação e falar com você sobre o desafio. |
| Erro do aceite | Aceite a política de privacidade para continuar. |
| Recuperar, instrução | Informe o e-mail da conta. Enviamos um link para você criar uma senha nova. |
| Recuperar, confirmação | Se existir uma conta com {email}, o link para criar uma senha nova já chegou. Ele vale por 1 hora. |
| Boas-vindas | Boas-vindas, {nome} · Falta pouco para garantir sua vaga. · Os outros participantes veem: {nome exibição} |
| Vaga | SUA VAGA · Nº {n} · de 50 vagas · inscrição confirmada |
| Home | BORA, {NOME}. · SUA JORNADA · SUA ESCALADA · No cume: camiseta de treino, whey e creatina · STORY DO DIA · SEU DIA · ATIVIDADE · pessoas fecharam o dia hoje · de 50 vagas preenchidas |
| CTA | Fazer check-in de hoje · Ver check-in de hoje |
| Dia futuro | O dia {n} abre amanhã, à meia-noite. / O dia {n} abre em {x} dias, à meia-noite. |
| Dia concluído | Dia concluído · Mais 295 m na sua escalada. · (toast) Dia {n} concluído. +295 m na escalada. |
| Progresso | Cada dia concluído sobe 295 m. Dia perdido não desce, só não sobe. |
| Excluir conta | Excluir sua conta? · Apaga seu perfil, seus check-ins e suas fotos. A vaga não volta para a fila e essa ação não pode ser desfeita. |
| Instalar, iPhone | No Safari, toque em Compartilhar · Escolha "Adicionar à Tela de Início" · Toque em Adicionar |

**Altitude:** `altitudeSimbolica(dias, totalDias = 30) = Math.round(dias / totalDias * 8848)`. Fica em `@everest/shared` (`regras/altitude.ts`) com testes: 0 → 0; 30 → 8848; 14 → 4129; 15 → 4424. Exporte também `ALTITUDE_CUME = 8848` e `METROS_POR_DIA = (totalDias) => Math.round(8848 / totalDias)` (295 para 30 dias).

---

## 11. Acessibilidade e qualidade (vale para todas as fases)

- As regras de §6.4 de `FRONTEND-ESTADO-ATUAL.md` continuam: alvos ≥ 44 px, foco visível, uma `h1` por página, `aria-live` para salvamento e uploads, `role="alert"` só para erro.
- **Contraste nos dois temas:** rode o axe nos dois (Playwright com `page.emulateMedia({ colorScheme })` + `localStorage` do tema).
- **Carrossel:** cada card é um `article` com `aria-label`; os pontos indicadores são `aria-hidden` (o scroll é nativo). Se colocar botões de navegação, dê `aria-label`.
- **Faixa de dias:** os chips são `button`s com `aria-label` "Dia N, concluído/hoje/não concluído/ainda não abriu".
- **Container transform:** não quebra o foco. Depois de navegar, mova o foco para o `h1` da página nova (`tabIndex={-1}`).
- **Orçamento de desempenho:**
  - bundle da rota `/` < 200 KB gzip, **sem Firebase**;
  - fontes com `font-display: swap`, subset latin;
  - preload só do peso 900 da Big Shoulders;
  - Lighthouse mobile: Performance ≥ 85, Acessibilidade ≥ 95, Best Practices ≥ 95.

---

## 12. Fases

> Copie estas listas para o fim de `docs/PROGRESSO.md` na R0, numa seção "Frontend v2", e marque `[x]` só o que foi verificado.

### R0: Linha de base
- [ ] `pnpm install`, `pnpm --filter @everest/shared build`, `pnpm typecheck`, `pnpm lint`, `pnpm --filter web build` e `pnpm --filter api test:e2e`. Registre o que passa e o que falha **antes** de mudar qualquer coisa
- [ ] Corrija só o que impede o build. A `Hoje.tsx` foi feita às pressas e o build dela nunca foi verificado
- [ ] Commit das alterações pendentes que já estão no working tree, numa mensagem separada ("chore: estado antes do frontend v2"), depois de conferir que nenhuma tem segredo (`.env` não entra)
- [ ] Atualize `docs/DECISOES.md`:
  - Q12 → "Firebase Auth (Google + e-mail/senha) com cookie da API", status CONFIRMADO;
  - X3 → "Firebase sendPasswordResetEmail", CONFIRMADO;
  - nova **X5** "Excluir conta anonimiza; a vaga continua ocupada";
  - nova **X6** "Narrativa da escalada: 295 m por dia";
  - nova **X7** "Tema padrão = Sistema" (ASSUMIDO);
  - nova **X8** "Fila de conferência do embaixador"
- [ ] Adicione ao `.cursor/rules/everest.mdc` a linha: "Frontend v2: siga docs/FRONTEND.md; referência visual em docs/prototipo/everest-prototipo.html."
- **DoD:** o relatório lista o estado de cada comando; `pnpm --filter web build` passa.

### R1: Backend (Firebase, perfil, feed, conferência)
- [ ] `firebase-tools` (dev) e o script raiz `pnpm emu` = `firebase emulators:start --only auth --project demo-everest`. O arquivo `firebase.json` define só a porta 9099 do emulador de auth
- [ ] Migration Prisma da seção 4.1
- [ ] `firebase-admin` + provider `VERIFICADOR_FIREBASE` (real + falso) + env (seção 4.2)
- [ ] `POST /auth/sessao`, `PATCH /me`, `DELETE /me`, `GET /desafios/:slug/feed`, `PATCH /admin/dias/:diaId/conferencia`, e `paraRevisar`/`totalParaRevisar`/`AGUARDANDO_CONFERENCIA` nas rotas de admin
- [ ] Zerar a conferência em toda edição do dia (seção 4.1)
- [ ] Legado `cadastro`/`login` atrás de `AUTH_SENHA_LEGADO`
- [ ] Helpers de e2e migrados para `/auth/sessao` com o verificador falso, mais os testes da seção 4.3
- [ ] Script `seed:firebase` para o emulador
- [ ] Swagger com exemplos dos endpoints novos
- **DoD:** `pnpm --filter api test` e `test:e2e` 100% verdes (reporte o total). Com `pnpm emu` rodando, um `curl` no `accounts:signInWithPassword` do emulador devolve um `idToken` que funciona no `POST /auth/sessao`.

### R2: Shared
- [ ] Tipos `UsuarioMe` (+`fotoUrl`, `perfilCompleto`), `FeedResposta`, `AdminParticipante.paraRevisar`, `DiaResumo.situacao` (+`AGUARDANDO_CONFERENCIA`)
- [ ] Schemas `sessaoSchema`, `atualizarPerfilSchema`, `entrarSchema`, `criarContaSchema` e `conferenciaSchema`, com mensagens em pt-BR
- [ ] `regras/altitude.ts` + testes (seção 10)
- **DoD:** `pnpm --filter @everest/shared test` e `build` ok; `pnpm typecheck` da raiz ok. A R2 pode andar junto com a R1 se for mais simples, mas registre no relatório.

### R3: Tema, tokens e fontes
- [ ] Fontes instaladas e importadas (seção 2 e 6.2)
- [ ] `index.css` com os tokens dos dois temas + `@custom-variant escuro` + utilitários `rotulo`, `press` e `surgir`
- [ ] Script inline do tema no `index.html` + `useTema` + `<meta name="theme-color">` dinâmico
- [ ] Revisão de **todas** as classes `red-950`/`amber-*`/`green-*`/`bg-white`/`text-white` para funcionar nos dois temas (`rg "bg-white|text-white|red-9|amber-|green-" apps/web/src`)
- **DoD:** com o app rodando, trocar `localStorage['everest-tema']` entre `claro`/`escuro`/`sistema` e recarregar muda tudo, sem flash. Build ok.

### R4: Primitivos de UI e movimento
- [ ] Componentes da seção 8.1 e 8.2 (`Botao`, `CampoTexto`, `Avatar`, `PilhaAvatares`, `Contador`/`useContador`, `FolhaInferior`, `Toast`, `Segmentado`, `Interruptor`, `Barra`, `BarraAbas`, `BotaoVoltar` e `AppShell` sem header)
- [ ] `src/lib/transicoes.ts` + CSS das View Transitions (seção 7.3) + `marcarDirecao` nos links
- [ ] Unificar os toasts do PWA com o `ToastProvider`. Manter um só aviso de offline
- [ ] Testes com Vitest + Testing Library: `Segmentado` (aria-pressed), `FolhaInferior` (Esc fecha e devolve o foco), `useContador` com reduced motion (retorna o valor final na hora). Configure o `vitest` do web com `environment: 'jsdom'`
- **DoD:** `pnpm --filter web test` verde; build ok.

### R5: Autenticação no front
- [ ] `lib/firebase.ts`, `features/auth/firebaseAuth.ts`, `errosFirebase.ts` e o `.env.example` do web (seção 5)
- [ ] Páginas `Entrar`, `CriarConta`, `RecuperarSenha` e `BemVindo` + `TelaAuth` + `BotaoGoogle`
- [ ] Guards `RotaVisitante` e `RotaPerfilCompleto`; `usePosAutenticacao` atualizado (seção 5.4)
- [ ] Router novo (seção 3) com os redirects das rotas antigas
- [ ] Remover `pages/Login.tsx`, `pages/Cadastro.tsx`, `useLogin` e `useCadastro` (o `git rm` só depois que tudo compilar)
- **DoD:**
  - com `pnpm emu` + `seed:firebase` + `pnpm dev`: login de `maria@everest.dev` por e-mail cai em `/desafio`;
  - "Continuar com Google" no emulador cria conta → `/bem-vindo` → vaga revelada → `/desafio`;
  - "Criar conta" por e-mail vai direto para a revelação da vaga;
  - `/login` redireciona para `/entrar`;
  - `vite build` mostra que o chunk do Firebase **não** está no chunk de entrada (cole o trecho do output).

### R6: Home `/desafio`
- [ ] `FaixaDias`, `CarrosselDestaque`, `CardEscalada`, `CardStoryDoDia`, `CardSeuDia`, `CardsAtividade` e `CtaFixo`
- [ ] `pages/Desafio.tsx` com os estados `NAO_INICIADO` / `EM_ANDAMENTO` / `ENCERRADO`, skeleton e erro
- [ ] Container transform `abrir-dia` (card, chips e CTA) e `abrir-ranking` (card de atividade)
- **DoD:** roteiro manual no viewport 390×844, nos **dois temas**:
  1. a faixa centraliza o dia atual;
  2. tocar no dia futuro dá shake + toast;
  3. tocar no "Seu dia" expande para o dia;
  4. o card preto expande para o ranking;
  5. o carrossel encaixa e os pontos acompanham;
  6. "Marcar como postado" atualiza o card "Seu dia".

### R7: Check-in `/desafio/dia/:n`
- [ ] `pages/Dia.tsx` (refatora `Hoje.tsx`), `useDiaSelecionado` lendo `useParams`, redirect de `:n` inválido
- [ ] Restyle de `CardRequisito`, `CardAgua`, `CardExercicio`, `CardLeitura`, `CardFotos`/`SlotFoto`, `CardStory`, `ResumoDia`, `IndicadorSalvamento` + `BannerDiaConcluido`
- [ ] Modo leitura (dia passado), invalidado, offline e erro
- **DoD:**
  - completar os 5 requisitos mostra o banner animado **uma vez** e o toast;
  - recarregar mantém tudo;
  - remover uma foto tira o banner;
  - voltar para `/desafio` mostra a faixa e o card atualizados;
  - os testes existentes (`useCheckin.test`, `useUploadFoto.test`) continuam verdes.

### R8: Progresso, Ranking, Regras e Privacidade
- [ ] `Montanha` + `pages/Progresso.tsx`
- [ ] `pages/Ranking.tsx` com o card "Sua posição" e a frase de desempate
- [ ] `pages/Regras.tsx` e `content/regras.ts` atualizados
- [ ] `pages/Privacidade.tsx` e `content/privacidade.ts` atualizados (mantendo o marcador Q8)
- **DoD:** a montanha anima e respeita o reduced motion; o grid leva para `/desafio/dia/N`; o ranking rola até a sua linha.

### R9: Perfil e Admin
- [ ] `pages/Perfil.tsx` com o tema, a instalação, sair e excluir (seção 9.9)
- [ ] `pages/Admin.tsx` e `pages/AdminParticipante.tsx` restyle + fila de conferência (seções 9.11 e 9.12)
- **DoD:**
  - trocar o tema no Perfil vale no app inteiro e persiste;
  - "Excluir minha conta" no seed leva para a `/` com toast, e o ranking mostra "Participante removido";
  - no admin, aprovar diminui o "para revisar", invalidar exige motivo e o ranking recalcula.

### R10: PWA e polimento de navegação
- [ ] Folha "Instalar o app" com `Segmentado` iPhone/Android (substitui o `ModalInstrucoesIOS`), mantendo a lógica do `useInstallPrompt`
- [ ] `view-transition-name: tabbar`; foco no `h1` depois de navegar; a direção certa em todos os links
- [ ] Revisar a `NaoEncontrada` no novo visual
- **DoD:** `pnpm --filter web build && pnpm --filter web preview`; o manifest e o SW funcionam como antes; as transições funcionam no Chrome e caem para navegação instantânea com `document.startViewTransition` desabilitado (teste com `delete Document.prototype.startViewTransition` no console).

### R11: Qualidade
- [ ] Playwright (se ainda não existir, siga a FASE 12 do `PROMPT_CURSOR.md`) usando o **emulador do Firebase**:
  - smoke: criar conta → bem-vindo → vaga → check-in completo com 3 fotos de fixture → dia concluído → ranking;
  - smoke: Google no emulador → bem-vindo.
- [ ] axe nas 14 telas × 2 temas: zero violações sérias ou críticas
- [ ] Lighthouse mobile e tamanho dos chunks (seção 11)
- **DoD:** números reportados no relatório.

### R12: Marca (logo oficial, pedido do dono em 2026-10-30)
- [ ] `scripts/marca.cjs` gera as máscaras `public/marca/{montanha,everest,icone}.png` e o `public/logo.png` (ícones do PWA) a partir de `apps/web/design/logo-original.jpg`
- [ ] `components/layout/Marca.tsx` (`IconeMontanha`, `MontanhaMarca`, `Wordmark`) na capa e na marca d'água, nos dois temas
- **DoD:** screenshots da capa nos dois temas; `webkitMaskImage` aplicado; `TODO_DECISAO(LOGO)` removido.

### R13: Backend do pagamento, feedback e painel
- [ ] `Participante.pagamentoStatus` (PENDENTE → INFORMADO → CONFIRMADO), gate `PAGAMENTO_PENDENTE`, `GET /pagamento`, `POST /pagamento/informar`, `PIX_COPIA_E_COLA`
- [ ] Admin: confirmar / "Não recebi" / remover inscrição não paga; dados de cadastro no detalhe; `GET …/feedbacks`; `GET …/participantes.csv`
- [ ] `Feedback` (`GET`/`PUT /feedback`); menor vaga livre; seed com pendente e informado
- **DoD:** api unit + e2e verdes (reportar totais).

### R14: Telas de pagamento, feedback e painel + E2E
- [ ] `/pagamento` (QR, copia e cola, relógio de 5 min, "Já fiz o pagamento", espera, revelação da vaga), guards e redirecionamentos
- [ ] `/feedback`, card "Conte como foi", linhas no Perfil; painel com fila de pagamentos, filtro, CSV, detalhe e `/admin/feedbacks`
- [ ] Playwright: smoke com pagamento, `admin-pagamento`, `feedback` e axe nas telas novas × 2 temas
- **DoD:** suíte E2E 100% verde; `uqr` só no chunk da `/pagamento`.

### R15: Produção (antiga R12)
- [ ] Atualizar o `docs/DEPLOY.md` com a seção 5.5 (Console do Firebase, domínios autorizados, OAuth redirect, rewrite `/__/auth`, conta de serviço) e as variáveis novas
- [ ] `scripts/verificar-producao.mjs`: checar que `/__/auth/handler` responde e que `/api/auth/sessao` existe
- [ ] `pnpm check:launch` sem marcadores
- [ ] Contas do dono (`docs/CONTAS.md`) e `PIX_COPIA_E_COLA` real na API
- **DoD:** login com Google funcionando no **iPhone com o app instalado** (redirect) e no Android (popup) no domínio real.

---

## 13. Riscos conhecidos

| Risco | Mitigação |
|---|---|
| Redirect do Google no iOS standalone perde o estado | `authDomain` = domínio do app + rewrite `/__/auth` (seção 5.5); `browserSessionPersistence` |
| Firebase infla o bundle | `import()` dinâmico só nas rotas de auth; conferir os chunks no build |
| Vínculo de conta pelo e-mail permite tomar a conta de outra pessoa | Vincula **só** com `email_verified`; senão `EMAIL_EM_USO` |
| Token roubado reaproveitado | `checkRevoked` + `auth_time` ≤ 5 min |
| View Transitions com lazy + Suspense mostram o fallback no meio | Prefetch do chunk no `pointerdown`; fallback leve |
| Classes de cor fixas quebram o tema claro | Varredura da R3 + axe nos dois temas na R11 |
| Exclusão de conta libera vaga e quebra a numeração | Anonimizar; nunca apagar `Participante` (X5). A remoção de inscrição **não paga** (X12) libera o número, reaproveitado pela regra da menor vaga livre (X15) |
| QR do Pix errado cobra a pessoa errada | `PIX_COPIA_E_COLA` validado no boot (CRC, chave, valor); conferir lendo o QR no app do banco antes de divulgar |

---

## 14. Relatório de fase (formato obrigatório)

```text
## Relatório — Frontend v2 R<N>
**Feito:** …
**Arquivos criados/alterados/removidos:** …
**Comandos executados e resultado:** (comando → passou/falhou + resumo)
**Testes:** X passando / Y falhando (web, shared, api unit, api e2e)
**Tamanho dos chunks (quando houver build):** entrada, firebase, maiores 3
**Decisões tomadas:** (e se foram para DECISOES.md)
**Diferenças em relação ao protótipo:** (o que ficou diferente e por quê)
**Pendências / riscos:** …
**Próximo passo:** R<N+1>
```
