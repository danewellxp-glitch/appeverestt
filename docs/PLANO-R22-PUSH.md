# R22: Notificações push (Web Push) com ações rápidas

## Contexto
- O dono quer notificação "tipo WhatsApp/iFood": aparece na barra e na tela bloqueada do celular,
  com ícone do Everest, título e texto. Hoje o app não tem nenhum canal (sem push, e-mail, WhatsApp;
  `docs/DECISOES.md` Q14 dizia "fora do MVP").
- R21 (em produção) já trouxe `/hoje?acao=agua|treino|leitura` e os `shortcuts` do manifest.
  O push é a camada que leva a pessoa até lá sem abrir o app.
- Resultado esperado: (1) a pessoa ativa "Lembretes no celular"; (2) lembretes fixos de água,
  treino e leitura chegam todo dia do desafio; (3) no Android a notificação tem um botão que
  registra direto ("+250 ml", "Treino feito", "Leitura feita"); (4) o admin dispara um aviso
  para todos quando quiser.

## Decisões do dono (2026-11-04)
- Lembretes automáticos em horários fixos (fuso do desafio, `Desafio.timezone`): água 10h, 14h e
  17h; treino 18h; leitura 21h. Só enquanto o desafio está EM_ANDAMENTO.
- Público: TODOS os inscritos ativos (pagamento CONFIRMADO, conta não excluída) que ativaram o
  push. Sem filtro por progresso do dia.
- Ativação: interruptor no Perfil + cartão convite na home `/desafio` (some ao ativar/dispensar).
- Admin: botões prontos (água, treino, leitura) + título/mensagem livre que abre `/hoje`.

## Limites da plataforma (deixar claro na UI e nos docs)
- iPhone: push só no app instalado na tela inicial (iOS 16.4+), sem botões de ação; o toque abre
  o app em `/hoje?acao=...` e a R21 aplica. Fora do app instalado, o convite manda para a folha
  "Instalar o app".
- Android/Chrome: botões de ação funcionam; o service worker chama a API com o cookie de sessão.
- Só chega para quem ativou. Primeiro disparo "para quem já está" alcança apenas quem ativou.

## Arquitetura (resumo)
```
Perfil/Home ──ativar──▶ PushManager.subscribe(VAPID pública) ──PUT /push/inscricao──▶ PushInscricao
BullMQ scheduler (cron no fuso do desafio) ──▶ PushService.enviarLembrete(acao)
Admin "Avisos" ──POST /admin/desafios/:slug/avisos──▶ PushService.enviar(payload) ──web-push──▶ celular
SW: push → showNotification(título, corpo, actions) ; notificationclick:
   • botão de ação → POST /acoes-rapidas {acao} (cookie) → notificação de confirmação
   • corpo / falha (401) → openWindow('/hoje?acao=X')
```

## Parte 1: shared (`packages/shared`)
- Mover a lógica pura de `apps/web/src/features/checkin/acaoRapida.ts` (`ACOES_RAPIDAS`,
  `AcaoRapida`, `AGUA_POR_ACAO_ML`, `aplicarAcaoRapida`, `urlDaAcaoRapida`) para
  `packages/shared/src/regras/acaoRapida.ts`; o web passa a reexportar (manter `lerAcaoRapida`
  e `PARAMETRO_ACAO` no web, que dependem de URL). Testes atuais continuam passando.
- Novos schemas em `schemas.ts`: `acaoRapidaSchema = z.enum(ACOES_RAPIDAS)`,
  `pushInscricaoSchema` (`endpoint` url ≤ 2048, `chaves.p256dh`, `chaves.auth`, `userAgent?`),
  `avisoPushSchema` (`modelo: 'agua'|'treino'|'leitura'|'livre'`; `titulo` ≤ 60 e `corpo` ≤ 160
  obrigatórios só quando `livre`).
- Tipos em `tipos.ts`: `PushChavePublica {chave}`, `PushEstado {inscrito}`, `AvisoPushResultado
  {destinatarios, entregues, removidas, falhas}`, `PayloadPush {titulo, corpo, url, acao?, tag}`.
- Constantes: `LEMBRETES_PUSH = [{acao:'agua', horas:[10,14,17]}, {acao:'treino', horas:[18]},
  {acao:'leitura', horas:[21]}]` e `MODELOS_AVISO` (título/corpo de cada modelo em pt-BR).
- Códigos de erro novos em `CODIGOS_ERRO`: `PUSH_NAO_CONFIGURADO`.
- Testes vitest em `src/__tests__/acaoRapida.test.ts` e `push.test.ts`.

## Parte 2: API (`apps/api`)
### Dependências e env
- `web-push` (+ `@types/web-push`) em `apps/api/package.json`.
- Env (`src/config/env.ts`, `.env.example`, `test/env-teste.ts`, `docker-compose.prod.yml`
  `api.environment`, `deploy/env.producao.example`): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
  `VAPID_SUBJECT` (`mailto:`), opcionais em dev, obrigatórios em produção (`.superRefine`, mesmo
  padrão do `PIX_COPIA_E_COLA`). Geração: `npx web-push generate-vapid-keys`. A chave pública NÃO
  vira build arg do web: é servida pela API.
### Prisma
- Modelo `PushInscricao { id cuid, usuarioId → Usuario onDelete Cascade, endpoint @unique,
  p256dh, auth, userAgent?, criadoEm, ultimoEnvioEm?, falhas Int @default(0) }` +
  `@@index([usuarioId])`. Migration `20261105100000_push_inscricao` com cabeçalho em pt-BR.
- Adicionar a tabela ao TRUNCATE de `test/helpers.ts` (`limparTudo`). `excluirConta` apaga as
  inscrições (cascade já cobre; confirmar que anonimização não mantém o usuário).
### Módulo `src/modules/push/`
- `push.module.ts` (registra `BullModule.registerQueue({ name: FILA_PUSH })`; mover o
  `BullModule.forRootAsync` de `fotos.module.ts` para `RedisModule`/`AppModule` para não duplicar).
- `push.controller.ts` (`@Controller('push')`, `JwtAuthGuard`):
  - `GET /push/chave-publica` → `{chave}` (401 não; público; `PUSH_NAO_CONFIGURADO` se sem VAPID).
  - `GET /push/inscricao?endpoint=` → `{inscrito}`.
  - `PUT /push/inscricao` (`pushInscricaoSchema`) → upsert por `endpoint` (troca de dono se outro
    usuário logou no mesmo aparelho).
  - `DELETE /push/inscricao` body `{endpoint}`.
- `acoes-rapidas.controller.ts`: `POST /acoes-rapidas` (`{acao}`) → resolve desafio ativo
  (`DesafioService.ativo()`), `exigirParticipante`, dia atual (`infoTempo`), `exigirEditavel`,
  aplica `aplicarAcaoRapida` sobre o dia atual e salva pelo mesmo caminho do `PUT /dias/:n`
  (reutilizar `DiaService`), devolve `{dia: DiaDetalhe, mensagem, mudou}`. Throttle 30/min.
- `push.service.ts`:
  - `destinatarios(desafioId)`: participantes CONFIRMADO, `excluidoEm null`, com inscrições.
  - `enviar(inscricoes, payload)`: `webpush.sendNotification` com `Promise.allSettled`
    (concorrência 10, TTL 1h, `urgency: 'high'`); 404/410 → apaga a inscrição (`removidas`);
    outros erros → `falhas++` (apaga ao chegar a 5). Devolve `AvisoPushResultado`.
  - `enviarLembrete(acao)`: desafio ativo EM_ANDAMENTO → payload de `MODELOS_AVISO[acao]` com
    `url: urlDaAcaoRapida(acao)`, `tag: lembrete-${acao}`.
  - `enviarAviso(slug, input)`: modelo ou livre (`url: '/hoje'`, `tag: aviso-${id}`).
- `push.processor.ts` (`@Processor(FILA_PUSH)`): job `lembrete` com `{acao}`. No `onModuleInit`,
  `upsertJobScheduler('lembrete-agua-10', { pattern: '0 10 * * *', tz }, ...)` para cada
  horário de `LEMBRETES_PUSH`, com `tz = desafio ativo.timezone ?? TIMEZONE_PADRAO`. Recriar os
  schedulers quando o admin ativa outro desafio (hook em `AdminDesafiosService`).
- Admin: `POST /admin/desafios/:slug/avisos` (`avisoPushSchema`) em `admin-desafios.controller.ts`
  → `PushService.enviarAviso`, síncrono (≤ 50 vagas), devolve `AvisoPushResultado`.
### Testes
- Unit: `push.service.spec.ts` (destinatários, limpeza 410, contagem) com `webpush` injetado por
  token `WEB_PUSH` (fake); `lembretes.spec.ts` (cron patterns gerados por horário/fuso);
  `acoes-rapidas.spec.ts`.
- E2E (`test/push.e2e-spec.ts`): inscrição PUT/GET/DELETE e troca de dono; `POST /acoes-rapidas`
  (+250 ml, idempotência de treino, dia fechado → `DIA_NAO_EDITAVEL`, sem pagamento →
  `PAGAMENTO_PENDENTE`); admin aviso com `WEB_PUSH` fake contando entregues e removendo 410;
  não-admin → `PROIBIDO`. Rodar com a infra dev em 127.0.0.1 (ver memória servidor-producao).

## Parte 3: Web (`apps/web`)
### Service worker (injectManifest)
- `vite.config.ts`: `strategies: 'injectManifest'`, `srcDir: 'src'`, `filename: 'sw.ts'`,
  `injectManifest: { globPatterns, globIgnores }` (mesmos valores). Dev deps `workbox-precaching`,
  `workbox-routing`, `workbox-core` 7.x (justificar em `docs/FRONTEND.md` §2).
- `src/sw.ts` (`/// <reference lib="webworker" />`): `precacheAndRoute(self.__WB_MANIFEST)`,
  `cleanupOutdatedCaches()`, `NavigationRoute(createHandlerBoundToURL('/index.html'), {denylist:
  [/^\/api/, /^\/__\//]})`, `message` → `SKIP_WAITING` (o fluxo "Atualizar" depende disso).
- `src/features/push/sw/mensagens.ts` (puro, testável): `opcoesDaNotificacao(payload)` (ícone
  `/pwa-192x192.png`, badge, `tag`, `renotify`, `actions` só se `acao`), `destinoDoClique(evento)`.
- Handlers no `sw.ts`: `push` → `showNotification`; `notificationclick`:
  - com `event.action` → `fetch('/api/acoes-rapidas', {method:'POST', credentials:'include',
    headers JSON})`; sucesso → `showNotification` de confirmação (mensagem do servidor);
    401/erro → `openWindow('/hoje?acao=X')`.
  - sem ação → focar cliente existente e `navigate(url)` ou `openWindow(url)`.
- Caddy/vercel: `sw.js` já é no-cache; nada novo a servir.
### Estado e ativação
- `src/features/push/usePush.ts` (store de módulo + `useSyncExternalStore`, como
  `useInstallPrompt`): `suporte` (`'ok'|'sem-suporte'|'ios-sem-app'`), `permissao`,
  `inscrito`, `ativar()` (chave via `GET /push/chave-publica`, `subscribe`, `PUT`),
  `desligar()` (`unsubscribe` + `DELETE`). Sincroniza no login/logout (`chaves.me`).
- Perfil: linha `Interruptor` "Lembretes no celular" na seção "Comunicação", com texto de
  estado: ativo / "bloqueado nas configurações do navegador" / "no iPhone, instale o app antes"
  (botão abre `FolhaInstalar`).
- Home `/desafio`: `ConvitePush` (cartão pop) para inscrito confirmado com `suporte==='ok'`,
  não inscrito e não dispensado (`localStorage everest-push-convite`); "Ativar" / "Agora não".
- `FolhaInstalar`: na aba iPhone, uma linha "Depois de instalar, ative os lembretes no Perfil".
### Admin
- Aba "Avisos" (`/admin/avisos`): `LayoutPainel.ABAS` + `AppShell.ABAS_DO_PAINEL` + rota lazy
  `pages/AdminAvisos.tsx`. Conteúdo: contagem de inscritos no push, 3 botões de modelo (mostram
  prévia título/corpo e confirmam em `FolhaInferior`), formulário livre (`CampoTexto` +
  `AreaTexto` com contador), resultado em `Alerta tipo="sucesso"` (`destinatarios/entregues/
  removidas/falhas`). Mutations em `features/admin/consultas.ts`.
### Testes
- Vitest: `mensagens.test.ts`, `usePush.test.ts` (Notification/PushManager stubados),
  `ConvitePush.test.tsx`, `AdminAvisos.test.tsx` (api mock), Perfil interruptor.
- Playwright: novo projeto `push` com `serviceWorkers: 'allow'` só para smoke do SW registrado
  (opcional; marcar no DoD que depende de Java no ambiente).
- axe nas telas novas (Perfil, home com convite, admin avisos) nos 2 temas.

## Docs
- `docs/FRONTEND.md`: §3 rotas (`/admin/avisos`), §9.9 Perfil, §9.11 Admin, §12 R22, §2 deps.
- `docs/DECISOES.md` Q14: push entra (decisão de 2026-11-04). `docs/PROGRESSO.md` R22 com DoD.
- `docs/DEPLOY-CONTABO.md`: gerar VAPID uma vez e pôr no `.env`; reconstruir api e web.

## Ordem de execução (próximo chat)
1. shared (mover acaoRapida, schemas, tipos, constantes) → testes verdes em shared e web.
2. API: env + prisma + módulo push + acoes-rapidas + admin avisos → unit + e2e (infra dev
   127.0.0.1).
3. Web: SW injectManifest (conferir "Atualizar" e offline continuam) → usePush → Perfil →
   ConvitePush → AdminAvisos → testes.
4. Docs, typecheck/lint/test na raiz, commit `R22: push...`.
5. Deploy (só com o dono): gerar VAPID, `.env`, `up -d --build api web`; ativar no celular do
   dono, disparar "Água" pelo admin e conferir a notificação e o botão "+250 ml".

## Verificação de ponta a ponta
- `pnpm typecheck && pnpm lint && pnpm test` na raiz; `pnpm --filter api test:e2e` com a infra dev.
- Build do web no scratchpad + `vite preview`: `sw.js` registra, "Nova versão · Atualizar"
  funciona, manifest mantém os 3 shortcuts.
- Em produção, no Android: Perfil → ativar → admin dispara "Água" → notificação com "+250 ml" →
  toque no botão → confirmação "+250 ml registrados" sem abrir o app → dia mostra o total.
  No iPhone (app instalado): notificação sem botão → toque abre `/hoje?acao=agua` e aplica.
