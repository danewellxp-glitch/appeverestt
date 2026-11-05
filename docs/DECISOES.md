# Decisões do produto

Status: **ASSUMIDO** = default do PROMPT (seção 4), ainda não confirmado pelo Anderson. **CONFIRMADO** = resposta real.
🚫 = bloqueia o lançamento até virar CONFIRMADO.

| Q | Questão | Default assumido | Onde configurar | Status |
|---|---|---|---|---|
| Q1 🚫 | @ do Instagram | Sem default em produção. No seed de dev, `everest_dev` | `Desafio.instagramHandle` (banco) | ASSUMIDO |
| Q2 | Link de publicação | `https://everestt.app.br` (o build de produção recebe `VITE_APP_URL=https://${DOMINIO_APP}` do `docker-compose.prod.yml`) | `.env` do servidor (`DOMINIO_APP`) | CONFIRMADO |
| Q3 | As 50 vagas incluem o embaixador? | Sim | `Desafio.embaixadorOcupaVaga` (default `true`) | ASSUMIDO |
| Q4 | Critério de "melhor evolução" | Mais dias concluídos e não invalidados; prêmio para o 1º do ranking no fim | `ordenarRanking` (shared) | ASSUMIDO |
| Q5 | Desempate | 1) maior melhor sequência → 2) maior sequência atual → 3) inscrição mais antiga | `ordenarRanking` (shared) | ASSUMIDO |
| Q6 | Datas | Início em `Desafio.dataInicio`; fim = início + 29 dias | banco | ASSUMIDO |
| Q7 | Dados coletados | Nome completo, e-mail, @ do Instagram, data de nascimento, WhatsApp, bairro, cidade e UF, **todos obrigatórios para se inscrever** (uso futuro em marketing, com consentimento à parte, X9). Login pelo Firebase (sem senha na API) | `atualizarPerfilSchema` (shared) + `Usuario` (banco); `docs/FRONTEND.md` §4.4 | CONFIRMADO |
| Q8 🚫 | Política de privacidade | Página `/privacidade` com `TODO_DECISAO(Q8)` + checkbox obrigatório no cadastro | `apps/web/src/content/privacidade.ts` | ASSUMIDO |
| Q9 | Participantes de exemplo | Só no seed de dev. Nunca em produção | — | ASSUMIDO |
| Q10 | Modelo comercial | **Inscrição de R$ 50 via Pix** (há premiação), com QR estático do embaixador e **confirmação manual** no painel (X12) | env `PIX_COPIA_E_COLA` (API) | CONFIRMADO |
| Q11 | Multi-desafio | Modelo de dados suporta; UI usa o único desafio `ativo` | — | ASSUMIDO |
| Q12 | Login | Firebase Auth (Google + e-mail/senha) com cookie da API: o front troca o `idToken` por `POST /auth/sessao`, que grava o mesmo cookie httpOnly (JWT). Senha local (argon2) fica só como legado atrás de `AUTH_SENHA_LEGADO` | `docs/FRONTEND.md` §4.2 e §5 | CONFIRMADO |
| Q13 | Fuso horário | `America/Sao_Paulo` | `Desafio.timezone` | ASSUMIDO |
| Q14 | Notificações | Web Push (R22, decisão do dono em 2026-11-04): lembretes fixos no fuso do desafio (água 10h/14h/17h, treino 18h, leitura 21h) para inscritos confirmados que ativaram; botão de ação no Android registra sem abrir o app; aviso livre ou pronto pelo admin. iPhone só com o app instalado (iOS 16.4+) e sem botões | `docs/PLANO-R22-PUSH.md`, `@everest/shared` `regras/push.ts` | CONFIRMADO |
| Q15 | Domínio | `everestt.app.br` (app) e `arquivos.everestt.app.br` (fotos), atrás do túnel da Cloudflare | `.env` do servidor (`DOMINIO_APP`, `DOMINIO_ARQUIVOS`) | CONFIRMADO |
| X1 | Editar dias anteriores? | Não. Só o dia atual é editável | env `PERMITIR_EDITAR_DIAS_ANTERIORES=false` | ASSUMIDO |
| X2 | Até quando dá para se inscrever? | Enquanto `inscricoesAbertas = true` e o desafio não terminou | banco + endpoint admin | ASSUMIDO |
| X3 | Recuperação de senha | Firebase `sendPasswordResetEmail` (tela `/recuperar-senha`, sempre a mesma confirmação, exista ou não a conta). O script `redefinir-senha` continua só para usuários legados | `docs/FRONTEND.md` §5.3 | CONFIRMADO |
| X4 | Sair do desafio libera a vaga? | Não; vaga permanente. **Exceção:** o embaixador pode remover uma inscrição **não paga** e sem check-ins (X12); a vaga volta e o número é reaproveitado (X15) | — | ASSUMIDO |
| X5 | Excluir conta | `DELETE /me` anonimiza o `Usuario` ("Participante removido"), apaga as fotos e mantém `Participante` e `DiaDesafio`: a vaga continua ocupada. Desde a R13 também apaga o feedback (texto pessoal) | `docs/FRONTEND.md` §4.2 | ASSUMIDO |
| X6 | Narrativa da escalada | Cada dia concluído sobe 295 m (`Math.round(dias / totalDias * 8848)`); cume = 8.848 m = prêmio. Dia perdido não desce | `@everest/shared` `regras/altitude.ts` | ASSUMIDO |
| X7 | Tema padrão | Sistema (segue `prefers-color-scheme`); opções Claro / Escuro / Sistema no Perfil | `localStorage['everest-tema']` | ASSUMIDO |
| X8 | Fila de conferência do embaixador | Dia concluído fica "aguardando conferência" até o admin aprovar (`PATCH /admin/dias/:diaId/conferencia`); qualquer edição do dia volta para a fila. Conferência não muda a contagem do ranking | `DiaDesafio.conferidoEm` / `conferidoPorId` | ASSUMIDO |
| X9 | Consentimento de marketing | Checkbox **separado e opcional** na `/bem-vindo` (desmarcado por padrão); guarda a data (`aceitouMarketingEm`) e pode ser revogado no Perfil. Quem não marca participa normalmente | `PATCH /me` `aceitouMarketing` | CONFIRMADO |
| X10 | Idade mínima | **18 anos** (menores exigiriam consentimento dos pais, LGPD art. 14) | `IDADE_MINIMA` (shared) | ASSUMIDO |
| X11 | Inscrição exige perfil completo | Sem aceite + dados de cadastro, `POST /inscricao` responde `403 PERFIL_INCOMPLETO` (não gasta vaga) | `AuthService.exigirPerfilCompleto` | CONFIRMADO |
| X12 | Pagamento da inscrição | Depois do cadastro a vaga fica **reservada** (`PENDENTE`); a tela `/pagamento` mostra o QR fixo, o "copia e cola", 5 min no relógio e "Já fiz o pagamento" (`INFORMADO`). O embaixador confere no extrato e confirma no painel (`CONFIRMADO`); só então check-in, ranking, feed e feedback abrem (`403 PAGAMENTO_PENDENTE`). "Não recebi" volta para `PENDENTE` e mantém a data do aviso | `Participante.pagamentoStatus`; `DesafioService.exigirParticipante` | CONFIRMADO |
| X13 | Feedback | Nota de 1 a 5, "o que achou" e "o que mudou nestes 30 dias" (10 a 1.000 caracteres) e autorização separada para divulgar com o @. Sempre disponível no Perfil; card "Conte como foi" na home a partir do dia 28 e no fim; pode editar | `Feedback` (1 por participante) | CONFIRMADO |
| X14 | Relógio do pagamento | 5 min só visuais: ao zerar, avisa e mantém o QR (o código fixo não expira). Conta por aba (`sessionStorage`) | `useTemporizador` | CONFIRMADO |
| X15 | Número da vaga | Menor número livre de 1 a `totalVagas` (antes `count + 1`), calculado dentro da trava do desafio, porque a remoção de inscrição não paga libera números | `menorVagaLivre` (`inscrever.ts`) | ASSUMIDO |
| X16 | Vagas reservadas contam | Inscrição pendente ou informada ocupa vaga no contador da capa; ranking e feed mostram só confirmados | `DesafioService.vagasOcupadas`, `RankingService` | ASSUMIDO |
| X17 | App instalado e barra de abas | Barra de abas fixa embaixo em todas as telas de quem tem o pagamento confirmado (menos login/cadastro/pagamento), no navegador e no app instalado. **No app instalado (standalone)** o zoom por pinça e por duplo toque fica travado e não há "bounce" (`aplicarModoApp`); **no navegador o zoom continua liberado** (WCAG 1.4.4) | `features/pwa/standalone.ts`, `BarraAbas.ROTAS_SEM_ABAS` | CONFIRMADO |
| X18 | Tolerância da virada do dia | Até 5 min depois da meia-noite, o dia que acabou ainda aceita check-in e fotos (inclusive o último dia, com o desafio já encerrado). A confirmação da foto também respeita a janela | `TOLERANCIA_VIRADA_MS` (shared), `DiaService.ehEditavel` | ASSUMIDO |
| X19 | Troca de foto | A foto nova fica pendente ao lado da antiga; a antiga só sai quando a nova é confirmada. Se o envio falhar, o dia continua com a foto anterior. Limite conhecido: se o worker rejeitar a nova depois da confirmação (arquivo corrompido; raro, porque o app sempre manda JPEG comprimido), a antiga já saiu | `FotosService.confirmar`, índice `FotoProva_diaId_tipo_recebida_key` | ASSUMIDO |
| X20 | Sinal de foto parecida (antifraude) | O worker grava o hash perceptual (dHash de 64 bits) da versão processada de cada foto. No painel, cada foto do dia mostra a mais parecida já enviada no desafio (até **5 de 64 bits** de diferença, de qualquer participante, inclusive da mesma pessoa em outro dia ou tipo), com link para o dia dela; a lista de participantes mostra os dias **para revisar** com foto parecida. **Só sinal**: nada é rejeitado nem invalidado sozinho (X8). A rota do participante não expõe nada. Imagem lisa (cor sólida, tela preta) fica sem hash. Data da foto (EXIF) fica de fora: o worker apaga o EXIF e muitos celulares e apps de mensagem não mandam | `FotoProva.hashPerceptual`, `DISTANCIA_MAX_PARECIDA` (`fotos/hash-perceptual.ts`), `scripts/hash-fotos.ts` (fotos antigas) | ASSUMIDO |
| LOGO | Logo final | Logo oficial recebida em 2026-10-30 (montanha em traço + "EVEREST" vermelho): máscaras em `public/marca/` e `public/logo.png` (ícones do PWA) gerados por `node scripts/marca.cjs` a partir de `apps/web/design/logo-original.jpg` | `components/layout/Marca.tsx` | CONFIRMADO |

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
| 2026-10-27 | 9 | **react-router 8**, **Vite 8**, **Tailwind v4** (`@theme` em `styles/index.css`, sem `tailwind.config.js`) | Versões estáveis atuais; APIs equivalentes às documentadas no PROMPT |
| 2026-10-27 | 10 | `/hoje?dia=N` abre um dia específico (Progresso e grid usam isso) | Recarregar mantém o dia escolhido |
| 2026-10-27 | 11 | Ícones PWA gerados uma vez a partir de `public/logo.png` (`pnpm --filter web generate-pwa-assets`) e versionados; sem geração no build | Build não depende de sharp; regenerar quando a logo final chegar (LOGO) |
| 2026-10-27 | 11 | Indicador de offline global (`features/pwa/PwaGlobais.tsx`) em todas as rotas, inclusive `/` | A Entrada fica fora do AppShell |
| 2026-10-27 | 13 | Dockerfile multi-stage com `pnpm deploy --prod --legacy`; Prisma CLI vem como peer do `@prisma/client` (symlink) para rodar `migrate deploy` | Workspace não usa `inject-workspace-packages`; imagem ~191 MB comprimida |
| 2026-10-27 | 13 | Scripts de operação compilados em `dist/cli/scripts/*.js` (`tsconfig.scripts.json`) | Em produção não há ts-node; `node dist/cli/scripts/criar-admin.js ...` dentro do container |
| 2026-10-27 | 13 | Hospedagem principal documentada: Railway (API+worker, Postgres, Redis) + Cloudflare R2 + Vercel (web) | Um único painel para API/DB/Redis; alternativas em docs/DEPLOY.md |
| 2026-10-27 | 13 | R2: `S3_REGION=auto`, `S3_FORCE_PATH_STYLE=false`; CORS só PUT/GET do domínio do app com header `Content-Type` | Requisitos do R2 para upload direto do navegador |
| 2026-10-27 | 13 | `TRUST_PROXY_HOPS` configurável (padrão 1; produção Vercel→Railway = 2) | Rate limit por IP precisa do IP real do usuário |
| 2026-10-27 | 13 | `check:launch` também acusa `API_HOST_AQUI` em `apps/web/vercel.json` | Rewrite do Vercel precisa do host real da API antes do deploy |
| 2026-10-27 | 12 | (Substituída na v2 R12 pelas máscaras de `scripts/marca.cjs`.) UI usa `apps/web/public/logo.webp` (512 px, ~7 KB, gerada por `node scripts/otimizar-logo.cjs`); `logo.png` (1024 px) fica só como fonte dos ícones do PWA. Logo final continua pendente (`TODO_DECISAO(LOGO)`): ao trocar a `logo.png`, rodar o script e o `pwa-assets-generator` | A marca d'água é o LCP de todas as rotas; webp com `width`/`height` e `preload` reduz bytes e evita layout shift |
| 2026-10-30 | v2 R1 | **firebase-admin 14.5** (API) e **firebase-tools 15.34** (raiz, dev) | Versões estáveis atuais; `firebase-admin/app` e `/auth` funcionam em CJS. O SDK só carrega no primeiro uso do verificador |
| 2026-10-30 | v2 R1 | Migration `firebase_auth_conferencia` gerada com `prisma migrate diff` + aplicada com `migrate deploy` | `prisma migrate dev` recusa ambiente não interativo (agente). SQL revisado: só as colunas novas e o índice único de `firebaseUid` |
| 2026-10-30 | v2 R1 | R2 (shared) feita junto com a R1 | A API precisava dos tipos e schemas novos para compilar |
| 2026-10-30 | v2 R1 | `AUTH_SENHA_LEGADO=true` no `.env` de dev e no ambiente do Playwright até a R5 | O front atual ainda usa `/auth/cadastro` e `/auth/login`; os e2e da API rodam com o legado desligado (padrão) |
| 2026-10-30 | v2 R1 | `DELETE /me` apaga as fotos mas **não recalcula** os dias | Mantém o histórico de dias concluídos do "Participante removido" no ranking e a vaga ocupada (X5) |
| 2026-10-30 | v2 R1 | Token do verificador falso: `teste:<uid>:<email>:<verificado>[:<segundos desde o login>[:<nome>]]` | Os 2 campos opcionais testam o `auth_time` > 5 min e o nome vindo do Google |
| 2026-10-30 | v2 R1 | Aprovar dia não concluído responde **409** com código `VALIDACAO` (`ErroApp` ganhou status opcional) | Contrato da seção 4.2 |
| 2026-10-30 | v2 R1 | `GridDias` (web atual) mostra `AGUARDANDO_CONFERENCIA` como concluído + ponto âmbar | O token `laranja` só chega na R3; sem isso o grid do admin não compilava |
| 2026-10-30 | v2 R3 | `@font-face` declarados no `index.css` apontando para os `.woff2` latin dos pacotes @fontsource (em vez de importar o CSS do pacote) | Seção 11 pede subset latin: evita baixar/precachear cirílico, vietnamita etc. (4 arquivos, ~77 KB) |
| 2026-10-30 | v2 R3 | Tokens de estado `erro-*`, `aviso-*`, `ok-*`, `info-*` + `vermelho-escuro` (hover) com valor por tema | Opção da seção 6.2: um token por papel evita pares `escuro:` espalhados. Só a medalha de bronze usa par `escuro:` (some na R8) |
| 2026-10-30 | v2 R3 | `bg-white`/`text-white`/`bg-black/80` mantidos sobre fotos, véus e no botão dos interruptores | São iguais nos dois temas por desenho (scrim sobre imagem; botão branco do protótipo) |
| 2026-10-30 | v2 R1.1 | Novo código de erro `PERFIL_INCOMPLETO` (403) | O front distingue "falta completar o cadastro" de "sem permissão" e manda para a `/bem-vindo` |
| 2026-10-30 | v2 R1.1 | WhatsApp guardado só com dígitos e DDD, sem +55 (`normalizarTelefone`); Instagram sem "@" e minúsculo | Formato único para busca, deduplicação e exportação |
| 2026-10-30 | v2 R1.1 | Seed de dev preenche dados fictícios de cadastro (`dadosDev`) | Os usuários do seed precisam de perfil completo para os fluxos de dev; nunca roda em produção (Q9) |
| 2026-10-30 | v2 R1.1 | **Transitório até a R5:** o front atual (cadastro legado → inscrição) recebe `PERFIL_INCOMPLETO`, porque ainda não tem a `/bem-vindo` | A R5 cria a tela; o Playwright smoke da Fase 12 também depende dela |
| 2026-10-30 | v2 R4 | **Transitório até R5/R6/R9:** aba "Desafio" → `/desafio` redireciona para `/hoje`; `/hoje` mostra as abas; aba "Perfil" (`/perfil`) cai no 404 até a R9; logout só pela Entrada (`/`) e admin só pela URL `/admin` | O header saiu (seção 8.2) antes das telas novas existirem; cada fase seguinte remove um item desta lista |
| 2026-10-30 | v2 R4 | Toast aceita `acao` e `duracao: Infinity` | Unifica o "Nova versão disponível · Atualizar" do PWA, que precisa ficar até a pessoa agir |
| 2026-10-30 | v2 R4 | Cores fixas do `Avatar` com classes da paleta (`bg-*-700` + branco) | Avatar de iniciais é igual nos dois temas; todas as 8 cores passam 4,5:1 com texto branco |
| 2026-10-30 | v2 R5 | `POST /auth/sessao` revincula o usuário a um **uid novo** quando o e-mail é verificado (antes: 409) | Conta recriada no Firebase (ou emulador reiniciado) deixaria a pessoa trancada; e-mail verificado prova a posse. E-mail não verificado continua 409 |
| 2026-10-30 | v2 R5 | `RotaVisitante` executa o pós-login (`usePosAutenticacao`) em vez de só redirecionar | Quando o `me` chega no cache, a tela de login desmonta; a decisão (bem-vindo / inscrição / volta) precisa morar no guard |
| 2026-10-30 | v2 R5 | Aceite marcado em /criar-conta vai para a /bem-vindo via `sessionStorage` (`everest-aceite-pendente`), limpo depois do PATCH | Sobrevive ao redirect do Google e ao recarregar; não é dado sensível |
| 2026-10-30 | v2 R5 | Todos passam pela /bem-vindo (inclusive quem criou conta por e-mail) | Dados de cadastro obrigatórios (Q7/X11); a spec foi atualizada na R1.1 |
| 2026-10-30 | v2 R5 | `AUTH_SENHA_LEGADO=false` em dev; o ambiente do Playwright (Fase 12) ainda liga o legado até a R11 reescrever os testes com o emulador | O front não usa mais senha local |
| 2026-10-30 | v2 R6 | **Transitório até a R7:** chips, "Seu dia" e CTA abrem `/hoje?dia=N` (`caminhoDoDia` em `features/desafio/navegacao.ts`, o único ponto a trocar) | A tela `/desafio/dia/:n` chega na R7 |
| 2026-10-30 | v2 R6 | `useCheckin.alterar(fn, { imediato: true })` salva sem debounce | Toque único ("Marcar como postado") precisa refletir já no card "Seu dia"; o resto do check-in continua com 800 ms |
| 2026-10-30 | v2 R6 | O nome do container transform é aplicado no contêiner do conteúdo do `AppShell` (via `location.state.vt`) | Vale para qualquer tela de destino sem mexer em cada página |
| 2026-10-30 | v2 R6 | `useCheckin` também invalida o feed no sucesso | O servidor invalida o cache do feed junto com o ranking; o front acompanha |
| 2026-10-30 | v2 R7 | Leitura sem campo de digitação: só stepper (−, +1, +5), como no protótipo | Meta de 10 páginas; o campo de texto confundia com o número grande |
| 2026-10-30 | v2 R7 | Remover foto é direto no × (sem confirmação), e há um botão de trocar ao lado | Só vale no dia editável e a foto pode ser reenviada; menos toques no celular |
| 2026-10-30 | v2 R7 | A tela do dia não tem mais o grid dos 30 dias; a navegação entre dias é pela faixa da home e pelo grid do Progresso | Segue o protótipo (`#dia`) |
| 2026-10-30 | v2 R8 | Ranking devolve `fotoUrl` de cada participante (null para conta excluída) | A lista mostra avatar com foto, como no protótipo; o feed já mostrava a foto ao grupo |
| 2026-10-30 | v2 R8 | Frase de empate neutra em gênero: "Empate em dias com X; você fica à frente pela …" | O protótipo usa "Empatada com X", que supõe o gênero de quem lê |
| 2026-10-30 | v2 R8 | Texto do prêmio ("camiseta de treino, whey e creatina") vem do protótipo e aparece na home e nas regras | Conteúdo de produto: confirmar com o Anderson junto com o Q8 |
| 2026-10-30 | v2 R9 | `RouterProvider` importado de `react-router/dom` e sair/excluir conta navegam com `flushSync` antes de limpar a sessão | Com o `RouterProvider` de `react-router`, a navegação vai numa transição e a rota protegida antiga redirecionava para `/entrar` |
| 2026-10-30 | v2 R9 | No admin, o dia aberto por padrão é gravado em `?dia=N` ao abrir | Depois de aprovar, a fila muda e a seleção pulava para outro dia |
| 2026-10-30 | v2 R9 | Motivo da invalidação com 5+ caracteres só no front (o schema da API exige não vazio) | Segue a seção 8.3 sem mudar o contrato |
| 2026-10-30 | v2 R9 | Avatar no admin só com iniciais (a lista de admin não traz `fotoUrl`) | Evita mudar o contrato só para isso; foto aparece no ranking e no feed |
| 2026-10-30 | v2 R10 | Entrada (`/`) refeita nesta fase | A spec marca a Entrada como "refazer" (§3, §9.1), mas nenhuma fase a listava; é a primeira tela e a R11 roda axe/Lighthouse nela |
| 2026-10-30 | v2 R10 | `WEB_ORIGIN` de dev inclui `http://localhost:4173` (`.env` e `.env.example`) | O preview do build (PWA) faz POST para a API; sem isso, a checagem de Origin devolvia 403 |
| 2026-10-30 | v2 R10 | Precache do SW passou de 39 para 55 entradas (~1 MB) com os chunks do Firebase e das telas novas | Funciona offline como antes; avaliar na R11 (Lighthouse) se vale excluir os chunks do Firebase do precache |
| 2026-10-30 | v2 R11 | E2E roda contra o emulador do Firebase Auth (webServer `pnpm -w emu`, `AUTH_SENHA_LEGADO=false`); o global-setup limpa as contas do emulador e cria o admin com e-mail verificado | Testa o login real (e-mail e Google) sem conta do Firebase; o legado de senha não é mais usado em nenhum teste de tela |
| 2026-10-30 | v2 R11 | Nomes acessíveis passam a começar pelo texto visível (WCAG 2.5.3): "+1 página", "+5 páginas", "Água: adicionar foto"; cards clicáveis usam texto `sr-only` em vez de `aria-label` | O axe acusava "label-content-name-mismatch" (sério); quem usa comando de voz fala o que vê |
| 2026-10-30 | v2 R11 | Lighthouse substituído por medição com Playwright (FCP/LCP/CLS e bytes por tipo) | O pacote `lighthouse` não está no projeto; instalar fica para quando o usuário aprovar (R12 pode rodar no domínio real) |
| 2026-10-30 | v2 R12 | Logo como **máscara CSS** (`mascara-marca` com `-webkit-mask` e `mask`) sobre `bg-current`/`bg-vermelho`, em vez de imagem | A montanha acompanha o tema (preta no claro, branca no escuro) com um arquivo só; o Tailwind 4 não emite o prefixo `-webkit-` |
| 2026-10-30 | v2 R12 | Ícone pequeno do topo usa uma montanha de traço engrossado (`marca/icone.png`) e a marca d'água ficou com opacidade 0,10 (claro) e 0,13 (escuro) | O traço original some abaixo de ~60 px e com 0,06 a marca d'água desaparecia |
| 2026-10-30 | v2 R12 | Ícones do PWA todos em fundo preto; sem preload de imagem no `index.html` | A logo é branca e vermelha; a máscara não é candidata a LCP (o LCP passa a ser o `h1`) |
| 2026-10-30 | v2 R13 | `PIX_COPIA_E_COLA` validado no boot (`lerPix`: TLV + CRC-16 + GUI `br.gov.bcb.pix` + valor); obrigatório em produção. Sem a env (dev), `GET /pagamento` devolve `pix: null` e só `POST /informar` responde 503 | Um QR errado cobraria a pessoa errada; em dev a tela não pode quebrar |
| 2026-10-30 | v2 R13 | Remoção de inscrição pelo admin: só não confirmada, não embaixador e sem nenhum `DiaDesafio`; transação com a mesma trava (`FOR UPDATE` no desafio) do `inscrever` | A FK `DiaDesafio → Participante` é RESTRICT e duas operações simultâneas não podem entregar o mesmo número de vaga |
| 2026-10-30 | v2 R13 | CSV com BOM, `;`, CRLF e apóstrofo antes de células que começam com `= + - @`; Instagram sem `@`; datas no fuso do desafio; e-mail em branco para conta excluída | Abre certo no Excel pt-BR e não executa fórmula vinda de dado digitado pelo participante |
| 2026-10-30 | v2 R13 | `criar-admin --senha` passou a ser opcional: o admin de produção entra com Google do mesmo e-mail | O login por senha local está desligado e só e-mail verificado vincula a conta |
| 2026-10-30 | v2 R14 | `/pagamento` consulta o status a cada 30 s (informado) ou 60 s (pendente), só com a aba visível; 403 `PAGAMENTO_PENDENTE` em qualquer tela invalida o `me` e o pagamento em cache | A confirmação é manual e pode acontecer com o app aberto; o admin pode voltar alguém para pendente |
| 2026-10-30 | v2 R14 | QR gerado no cliente com `uqr` (SVG, ~2 KB gzip, só no chunk da `/pagamento`), sempre preto sobre branco | Funciona nos dois temas e não carrega peso na capa |
| 2026-11-04 | v2 R20 | Hash calculado da versão processada (`.full.webp`), não do original | É o arquivo que fica no storage (o script das fotos antigas lê o mesmo) e já vem girado pelo EXIF. O mesmo conteúdo em JPEG passa pelo *shrink-on-load* do sharp e chegou a dar 8 bits de diferença; webp contra webp ficou entre 0 e 5 |
| 2026-11-04 | v2 R20 | Imagem com menos de 8 tons de amplitude no 9×8 cinza fica sem hash | O dHash de cor sólida é 64 zeros: vermelho e azul virariam "parecidas" |
| 2026-11-04 | v2 R20 | Comparação em memória (1 consulta com as fotos do desafio) e índice por blocos (casa dos pombos: 6 blocos para distância ≤ 5) | Sem extensão no Postgres. A lista do painel compara todas as fotos com todas; com o índice fica quase linear (com 4.500 fotos seriam ~10 milhões de pares) |
| 2026-11-04 | v2 R20 | Na lista, `diasFotoParecida` só conta dias **para revisar**; no dia, o aviso aparece sempre | Depois de aprovar ou invalidar, o sinal sai da fila; quem copiou a foto de um dia já aprovado continua sinalizado no dia dele. Empate de distância aponta a foto mais antiga (a original) |
| 2026-11-04 | v2 R20 | Migration `hash_foto` escrita à mão (só `ADD COLUMN`) | `prisma migrate dev` recusa ambiente não interativo; o índice parcial da R17 continua só no SQL |

